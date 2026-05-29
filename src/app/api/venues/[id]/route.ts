import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { VenueInfo, ApiResponse } from "@/types";

/**
 * GET /api/venues/:id
 * 공연장 상세 정보 반환
 * ERD: venuedetail + venue + theatre — 분리 쿼리 병렬 처리
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // ── 3개 테이블 병렬 조회 ──
    const [detailRes, venueRes, theatreRes] = await Promise.all([
      // venuedetail: 개관일, 좌석수, 주소, 좌표
      supabase
        .from("venuedetail")
        .select("venueid, opende, seatscale, adres, la, lo")
        .eq("venueid", id)
        .single(),

      // venue: 이름, 홀 수, 지역
      supabase
        .from("venue")
        .select("venueid, venuenm, venuecnt, sidonm, gugunnm")
        .eq("venueid", id)
        .single(),

      // theatre: 공연홀 목록 (theatre.venueid → venuedetail.venueid)
      supabase
        .from("theatre")
        .select("theatreid, theatrenm, seatscale, stageorchat, stagepracat, stagedresat, stageoutdrat, disabledseatsacle")
        .eq("venueid", id),
    ]);

    if (detailRes.error) {
      if (detailRes.error.code === "PGRST116") {
        return NextResponse.json<ApiResponse<null>>(
          { data: null, error: "공연장을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      throw detailRes.error;
    }
    if (venueRes.error) throw venueRes.error;
    if (theatreRes.error) throw theatreRes.error;

    const detail = detailRes.data;
    const venue = venueRes.data;
    const theatres = theatreRes.data ?? [];

    const result: VenueInfo = {
      venueid: detail.venueid,
      venuenm: venue?.venuenm ?? "",
      venuecnt: venue?.venuecnt ?? null,
      sidonm: venue?.sidonm ?? null,
      gugunnm: venue?.gugunnm ?? null,
      opende: detail.opende,
      seatscale: detail.seatscale,
      adres: detail.adres,
      la: detail.la,
      lo: detail.lo,
      theatres: theatres.map((t) => ({
        theatreid: t.theatreid,
        theatrenm: t.theatrenm,
        seatscale: t.seatscale,
        stageorchat: t.stageorchat,
        stagepracat: t.stagepracat,
        stagedresat: t.stagedresat,
        stageoutdrat: t.stageoutdrat,
        disabledseatsacle: t.disabledseatsacle,
      })),
    };

    return NextResponse.json<ApiResponse<VenueInfo>>({ data: result });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
