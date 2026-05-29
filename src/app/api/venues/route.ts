import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { VenueMarker, ApiResponse } from "@/types";

/**
 * GET /api/venues?swLat=&swLng=&neLat=&neLng=
 * bounds 내 공연장 마커 목록 반환
 * ERD: venuedetail(la, lo) + venue(venuenm) — 분리 쿼리로 JOIN
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const swLat = parseFloat(searchParams.get("swLat") ?? "0");
  const swLng = parseFloat(searchParams.get("swLng") ?? "0");
  const neLat = parseFloat(searchParams.get("neLat") ?? "0");
  const neLng = parseFloat(searchParams.get("neLng") ?? "0");

  if ([swLat, swLng, neLat, neLng].some(isNaN)) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "유효하지 않은 지도 범위입니다." },
      { status: 400 }
    );
  }
  
  try {
    // ── 1. bounds 내 venuedetail 조회 (좌표 기준) ──
    const { data: details, error: detailsError } = await supabase
      .from("venuedetail")
      .select("venueid,la,lo")
      .gte("la", swLat)
      .lte("la", neLat)
      .gte("lo", swLng)
      .lte("lo", neLng);

    if (detailsError) {
      console.error("[venues] venuedetail query error:", detailsError);
      throw detailsError;
    }
    if (!details?.length) {
      return NextResponse.json<ApiResponse<VenueMarker[]>>({ data: [] });
    }

    // ── 2. 해당 venueid 목록으로 venue 이름 일괄 조회 ──
    // null/undefined 제거 — .in()에 빈 배열이 넘어가면 PGRST125 발생
    const venueIds = details.map((d) => d.venueid).filter(Boolean);
    if (!venueIds.length) {
      return NextResponse.json<ApiResponse<VenueMarker[]>>({ data: [] });
    }

    const { data: venues, error: venuesError } = await supabase
      .from("venue")
      .select("venueid, venuenm")
      .in("venueid", venueIds);

    if (venuesError) {
      console.error("[venues] venue query error:", venuesError);
      throw venuesError;
    }

    const nameMap = new Map((venues ?? []).map((v) => [v.venueid, v.venuenm]));

    const result: VenueMarker[] = details
      .filter((d) => nameMap.has(d.venueid))
      .map((d) => ({
        id: d.venueid,
        name: nameMap.get(d.venueid)!,
        latitude: d.la,
        longitude: d.lo,
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
