import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { VenueMarker, ApiResponse } from "@/types";

/**
 * GET /api/venues
 * 활성 공연(state/genre 필터)이 있는 공연장 마커 전체 반환.
 *
 * prfm → prfmdetail(venueid) → venuedetail(좌표) 순으로 venueid 기반 조인.
 * 기존 venuenm 문자열 매칭은 이름 차이로 탈락하는 버그가 있어 교체함.
 */

const SUPABASE_LIMIT = 10_000;
const CHUNK = 300;

function chunk<T>(arr: T[]): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += CHUNK) chunks.push(arr.slice(i, i + CHUNK));
  return chunks;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const genres = (searchParams.get("genres") ?? "").split(",").map(decodeURIComponent).filter(Boolean);
  const states = (searchParams.get("states") ?? "").split(",").map(decodeURIComponent).filter(Boolean);

  try {
    // 1. 필터 조건에 맞는 prfmid 조회
    let prfmQuery = supabase.from("prfm").select("prfmid").limit(SUPABASE_LIMIT);
    if (states.length > 0) prfmQuery = prfmQuery.in("state", states);
    if (genres.length > 0) prfmQuery = prfmQuery.in("genrenm", genres);

    const { data: activePrfm, error: prfmErr } = await prfmQuery;
    if (prfmErr) throw prfmErr;
    if (!activePrfm?.length) return NextResponse.json<ApiResponse<VenueMarker[]>>({ data: [] });

    const prfmIds = activePrfm.map((p) => p.prfmid as string);

    // 2. prfmid → venueid (prfmdetail, 청크)
    const detailRows = (
      await Promise.all(
        chunk(prfmIds).map((c) =>
          supabase.from("prfmdetail").select("venueid").in("prfmid", c)
        )
      )
    ).flatMap((r) => r.data ?? []);

    const venueIds = [...new Set(detailRows.map((d) => d.venueid as string))];
    if (!venueIds.length) return NextResponse.json<ApiResponse<VenueMarker[]>>({ data: [] });

    // 3. venueid → 좌표 + 이름 병렬 조회 (청크)
    const venueChunks = chunk(venueIds);
    const [coordResults, nameResults] = await Promise.all([
      Promise.all(
        venueChunks.map((c) =>
          supabase
            .from("venuedetail")
            .select("venueid, la, lo")
            .in("venueid", c)
            .not("la", "is", null)
            .not("lo", "is", null)
        )
      ),
      Promise.all(
        venueChunks.map((c) =>
          supabase.from("venue").select("venueid, venuenm").in("venueid", c)
        )
      ),
    ]);

    const coordMap = new Map(
      coordResults
        .flatMap((r) => r.data ?? [])
        .map((c) => [c.venueid as string, { la: c.la as number, lo: c.lo as number }])
    );
    const nameMap = new Map(
      nameResults
        .flatMap((r) => r.data ?? [])
        .map((v) => [v.venueid as string, v.venuenm as string])
    );

    // 4. 조립
    const result: VenueMarker[] = venueIds
      .map((id) => {
        const coord = coordMap.get(id);
        const name = nameMap.get(id);
        if (!coord || !name) return null;
        return { id, name, latitude: coord.la, longitude: coord.lo };
      })
      .filter((v): v is VenueMarker => v !== null);

    return NextResponse.json<ApiResponse<VenueMarker[]>>({ data: result });
  } catch (err) {
    console.error("[/api/venues]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
