import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { VenueMarker, ApiResponse } from "@/types";

/**
 * GET /api/venues
 * "공연중" 공연이 있는 모든 공연장 반환 (bounds 필터 없음)
 *
 * 클러스터러는 마커 전체를 한번에 받아야 줌 레벨에 따라 올바르게 동작함.
 * bounds 기반 재요청은 마커 세트를 뷰마다 교체해 클러스터 값이 불일치하는 원인이 됨.
 *
 * 쿼리 체인:
 *   prfm(state="공연중") → venue(전체 range 페이지네이션, venuenm 매칭)
 *   → venuedetail(venueid .in(), 청크) → 좌표 조립
 *
 * venue 전체를 range로 가져오는 이유:
 *   .in("venuenm", 한글배열)은 URL 인코딩 시 글자당 ~9byte → HeadersOverflowError 발생.
 *   venueid(단순 ASCII 코드)로만 .in()을 사용해 안전하게 처리.
 */

const SUPABASE_LIMIT = 10_000;

async function fetchAllVenues(): Promise<{ venueid: string; venuenm: string }[]> {
  const rows: { venueid: string; venuenm: string }[] = [];
  const BATCH = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("venue")
      .select("venueid, venuenm")
      .range(from, from + BATCH - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...(data as { venueid: string; venuenm: string }[]));
    if (data.length < BATCH) break;
    from += BATCH;
  }
  return rows;
}

async function fetchVenueCoords(
  venueIds: string[]
): Promise<{ venueid: string; la: number; lo: number }[]> {
  const CHUNK = 300;
  const chunks: string[][] = [];
  for (let i = 0; i < venueIds.length; i += CHUNK) chunks.push(venueIds.slice(i, i + CHUNK));

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const { data, error } = await supabase
        .from("venuedetail")
        .select("venueid, la, lo")
        .in("venueid", chunk)
        .not("la", "is", null)
        .not("lo", "is", null);
      if (error) throw error;
      return (data ?? []) as { venueid: string; la: number; lo: number }[];
    })
  );
  return results.flat();
}

export async function GET() {
  try {
    // ── 1 + 2 병렬: 전역 공연중 venue명 & venue 전체 목록 동시 조회 ──
    const [activePrfmResult, allVenues] = await Promise.all([
      supabase
        .from("prfm")
        .select("venuenm")
        .eq("state", "공연중")
        .limit(SUPABASE_LIMIT),
      fetchAllVenues(),
    ]);

    if (activePrfmResult.error) throw activePrfmResult.error;

    const activePrfm = activePrfmResult.data ?? [];
    if (!activePrfm.length || !allVenues.length) {
      return NextResponse.json<ApiResponse<VenueMarker[]>>({ data: [] });
    }

    // ── 3. 메모리 교차: 공연중 venue명 Set ↔ venue 전체 목록 ──
    const activeVenueNmSet = new Set(activePrfm.map((p) => p.venuenm).filter(Boolean));

    const activeVenueRows = allVenues.filter((v) => activeVenueNmSet.has(v.venuenm));
    if (!activeVenueRows.length) {
      return NextResponse.json<ApiResponse<VenueMarker[]>>({ data: [] });
    }

    const activeVenueIds = activeVenueRows.map((v) => v.venueid);
    const idToName = new Map(activeVenueRows.map((v) => [v.venueid, v.venuenm]));

    // ── 4. 활성 venueid로 좌표 조회 (venueid는 ASCII 코드라 .in() 안전) ──
    const coords = await fetchVenueCoords(activeVenueIds);
    if (!coords.length) {
      return NextResponse.json<ApiResponse<VenueMarker[]>>({ data: [] });
    }

    // ── 5. 결과 조립 ──
    const result: VenueMarker[] = coords
      .filter((c) => idToName.has(c.venueid) && c.la && c.lo)
      .map((c) => ({
        id: c.venueid,
        name: idToName.get(c.venueid)!,
        latitude: c.la,
        longitude: c.lo,
      }));

    return NextResponse.json<ApiResponse<VenueMarker[]>>({ data: result });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
