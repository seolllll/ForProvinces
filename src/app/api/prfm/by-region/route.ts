import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { RegionPerformance, ApiResponse } from "@/types";

const CHUNK = 300;
const LIMIT = 200;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sidonm = searchParams.get("sidonm") ?? "";
  const genres = (searchParams.get("genres") ?? "").split(",").map(decodeURIComponent).filter(Boolean);
  const states = (searchParams.get("states") ?? "").split(",").map(decodeURIComponent).filter(Boolean);

  if (!sidonm) {
    return NextResponse.json<ApiResponse<RegionPerformance[]>>({ data: [] });
  }

  try {
    // 1. 지역 공연장 + 장르/상태 필터 prfm 병렬 조회
    let prfmQuery = supabase
      .from("prfm")
      .select("prfmid, prfmnm, venuenm, prfmfrom, prfmto, genrenm, state, posterurl")
      .limit(5000);
    if (genres.length) prfmQuery = prfmQuery.in("genrenm", genres);
    if (states.length) prfmQuery = prfmQuery.in("state", states);

    const [venueResult, prfmResult] = await Promise.all([
      supabase
        .from("venue")
        .select("venueid, venuenm, gugunnm")
        .ilike("sidonm", `%${sidonm}%`),
      prfmQuery,
    ]);

    if (venueResult.error) throw venueResult.error;
    if (prfmResult.error) throw prfmResult.error;

    const venues = venueResult.data ?? [];
    const prfms = prfmResult.data ?? [];

    if (!venues.length || !prfms.length) {
      return NextResponse.json<ApiResponse<RegionPerformance[]>>({ data: [] });
    }

    // 2. venuenm 기준 메모리 교차
    const venueNmToInfo = new Map(
      venues.map((v) => [v.venuenm as string, v])
    );
    const matched = prfms
      .filter((p) => venueNmToInfo.has(p.venuenm as string))
      .slice(0, LIMIT);

    if (!matched.length) {
      return NextResponse.json<ApiResponse<RegionPerformance[]>>({ data: [] });
    }

    // 3. 매칭된 공연장 좌표 조회 (venueid는 ASCII → .in() 안전)
    const matchedVenueIds = [
      ...new Set(
        matched.map((p) => venueNmToInfo.get(p.venuenm as string)!.venueid as string)
      ),
    ];

    const coordResults = await Promise.all(
      chunkArray(matchedVenueIds, CHUNK).map((chunk) =>
        supabase
          .from("venuedetail")
          .select("venueid, la, lo")
          .in("venueid", chunk)
          .not("la", "is", null)
          .not("lo", "is", null)
      )
    );
    const coordMap = new Map<string, { la: number; lo: number }>();
    coordResults.forEach((r) => {
      (r.data ?? []).forEach((d) => {
        coordMap.set(d.venueid as string, { la: d.la as number, lo: d.lo as number });
      });
    });

    // 4. 결과 조립
    const result: RegionPerformance[] = matched
      .map((p) => {
        const venueInfo = venueNmToInfo.get(p.venuenm as string)!;
        const coord = coordMap.get(venueInfo.venueid as string);
        if (!coord) return null;
        return {
          prfmid: p.prfmid as string,
          prfmnm: p.prfmnm as string,
          venueid: venueInfo.venueid as string,
          venuenm: p.venuenm as string,
          gugunnm: venueInfo.gugunnm as string | null,
          genrenm: p.genrenm as string | null,
          state: p.state as string | null,
          posterurl: p.posterurl as string | null,
          prfmfrom: p.prfmfrom as string,
          prfmto: p.prfmto as string,
          la: coord.la,
          lo: coord.lo,
        };
      })
      .filter((r): r is RegionPerformance => r !== null);

    return NextResponse.json<ApiResponse<RegionPerformance[]>>({ data: result });
  } catch (err) {
    console.error("[/api/prfm/by-region]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
