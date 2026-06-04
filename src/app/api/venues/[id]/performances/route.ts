import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { ApiResponse, VenuePerformance } from "@/types";

/**
 * GET /api/venues/:id/performances
 * 해당 시설(venueid)에서 공연중인 prfm 목록 반환
 * prfmdetail.venueid → prfm 조인
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = req.nextUrl;
  const genres = (searchParams.get("genres") ?? "").split(",").map(decodeURIComponent).filter(Boolean);
  const states = (searchParams.get("states") ?? "").split(",").map(decodeURIComponent).filter(Boolean);

  try {
    const { data: detailRows, error: detailError } = await supabase
      .from("prfmdetail")
      .select("prfmid")
      .eq("venueid", id);

    if (detailError) throw detailError;

    const prfmIds = (detailRows ?? []).map((r) => r.prfmid as string);

    if (prfmIds.length === 0) {
      return NextResponse.json<ApiResponse<VenuePerformance[]>>({ data: [] });
    }

    let query = supabase
      .from("prfm")
      .select("prfmid, prfmnm, prfmfrom, prfmto, posterurl, genrenm, state")
      .in("prfmid", prfmIds)
      .order("prfmfrom", { ascending: true });

    if (states.length > 0) query = query.in("state", states);
    if (genres.length > 0) query = query.in("genrenm", genres);

    const { data, error } = await query;

    if (error) throw error;

    const result: VenuePerformance[] = (data ?? []).map((r) => ({
      prfmid: r.prfmid as string,
      prfmnm: r.prfmnm as string,
      prfmfrom: r.prfmfrom as string,
      prfmto: r.prfmto as string,
      posterurl: (r.posterurl as string | null) ?? null,
      genrenm: (r.genrenm as string | null) ?? null,
      state: (r.state as string | null) ?? null,
    }));

    return NextResponse.json<ApiResponse<VenuePerformance[]>>({ data: result });
  } catch (err) {
    console.error("[venues/performances]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
