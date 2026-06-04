import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { ApiResponse, KopisPrfmFull, KopisRelate } from "@/types";

/**
 * GET /api/prfm/:id
 * prfm + prfmdetail 조인하여 공연 상세 반환
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [{ data: prfmRow, error: prfmErr }, { data: detailRow, error: detailErr }] =
      await Promise.all([
        supabase
          .from("prfm")
          .select("prfmid, prfmnm, prfmfrom, prfmto, venuenm, posterurl, genrenm, state")
          .eq("prfmid", id)
          .single(),
        supabase
          .from("prfmdetail")
          .select(
            "prfmcast, runtime, viewage, entrpsnm, entrpsnmp, entrpsnma, entrpsnmh, entrpsnms, pcseguidance, visit, child, daehakro, openrun, festival, relates"
          )
          .eq("prfmid", id)
          .single(),
      ]);

    if (prfmErr) {
      if (prfmErr.code === "PGRST116") {
        return NextResponse.json<ApiResponse<null>>(
          { data: null, error: "공연을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      throw prfmErr;
    }

    let relates: KopisRelate[] | null = null;
    if (detailRow?.relates) {
      try {
        relates = JSON.parse(detailRow.relates as string) as KopisRelate[];
      } catch {
        relates = null;
      }
    }

    const result: KopisPrfmFull = {
      prfmid: prfmRow.prfmid as string,
      prfmnm: prfmRow.prfmnm as string,
      prfmfrom: prfmRow.prfmfrom as string,
      prfmto: prfmRow.prfmto as string,
      venuenm: prfmRow.venuenm as string,
      posterurl: (prfmRow.posterurl as string | null) ?? null,
      genrenm: (prfmRow.genrenm as string | null) ?? null,
      state: (prfmRow.state as string | null) ?? null,
      prfmcast: detailRow ? ((detailRow.prfmcast as string | null) ?? null) : null,
      runtime: detailRow ? ((detailRow.runtime as string | null) ?? null) : null,
      viewage: detailRow ? ((detailRow.viewage as string | null) ?? null) : null,
      entrpsnm: detailRow ? ((detailRow.entrpsnm as string | null) ?? null) : null,
      entrpsnmp: detailRow ? ((detailRow.entrpsnmp as string | null) ?? null) : null,
      entrpsnma: detailRow ? ((detailRow.entrpsnma as string | null) ?? null) : null,
      entrpsnmh: detailRow ? ((detailRow.entrpsnmh as string | null) ?? null) : null,
      entrpsnms: detailRow ? ((detailRow.entrpsnms as string | null) ?? null) : null,
      pcseguidance: detailRow ? ((detailRow.pcseguidance as string | null) ?? null) : null,
      visit: detailRow ? ((detailRow.visit as string | null) ?? null) : null,
      child: detailRow ? ((detailRow.child as string | null) ?? null) : null,
      daehakro: detailRow ? ((detailRow.daehakro as string | null) ?? null) : null,
      openrun: detailRow ? ((detailRow.openrun as string | null) ?? null) : null,
      festival: detailRow ? ((detailRow.festival as string | null) ?? null) : null,
      relates,
    };

    return NextResponse.json<ApiResponse<KopisPrfmFull>>({ data: result });
  } catch (err) {
    console.error("[prfm/[id]]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
