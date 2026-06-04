import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { SearchResult, ApiResponse } from "@/types";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json<ApiResponse<SearchResult[]>>({ data: [] });
  }

  const genres = (req.nextUrl.searchParams.get("genres") ?? "")
    .split(",")
    .map(decodeURIComponent)
    .filter(Boolean);

  try {
    // 1. prfm 검색 (장르 필터 적용, 상태는 전체 포함)
    let prfmQuery = supabase
      .from("prfm")
      .select("prfmid, prfmnm, venuenm, state, genrenm, posterurl")
      .ilike("prfmnm", `%${q}%`)
      .limit(30);

    if (genres.length > 0) prfmQuery = prfmQuery.in("genrenm", genres);

    const { data: prfms, error: prfmErr } = await prfmQuery;

    if (prfmErr) throw prfmErr;
    if (!prfms?.length) return NextResponse.json<ApiResponse<SearchResult[]>>({ data: [] });

    const prfmIds = prfms.map((p) => p.prfmid as string);

    // 2. prfmdetail에서 venueid 조회
    const { data: details, error: detailErr } = await supabase
      .from("prfmdetail")
      .select("prfmid, venueid")
      .in("prfmid", prfmIds);

    if (detailErr) throw detailErr;
    if (!details?.length) return NextResponse.json<ApiResponse<SearchResult[]>>({ data: [] });

    // 3. venuedetail에서 좌표 조회
    const venueIds = [...new Set(details.map((d) => d.venueid as string))];
    const { data: coords, error: coordErr } = await supabase
      .from("venuedetail")
      .select("venueid, la, lo")
      .in("venueid", venueIds)
      .not("la", "is", null)
      .not("lo", "is", null);

    if (coordErr) throw coordErr;

    // 4. 조립 — prfm 하나당 첫 번째 유효 venue
    const coordMap = new Map(
      (coords ?? []).map((c) => [c.venueid as string, { la: c.la as number, lo: c.lo as number }])
    );
    const prfmToVenue = new Map<string, string>();
    for (const d of details) {
      if (!prfmToVenue.has(d.prfmid) && coordMap.has(d.venueid)) {
        prfmToVenue.set(d.prfmid, d.venueid);
      }
    }

    const results: SearchResult[] = prfms
      .map((p) => {
        const venueid = prfmToVenue.get(p.prfmid);
        if (!venueid) return null;
        const coord = coordMap.get(venueid)!;
        return {
          prfmid: p.prfmid as string,
          prfmnm: p.prfmnm as string,
          venuenm: p.venuenm as string,
          state: p.state as string | null,
          genrenm: p.genrenm as string | null,
          posterurl: p.posterurl as string | null,
          venueid,
          la: coord.la,
          lo: coord.lo,
        };
      })
      .filter((r): r is SearchResult => r !== null)
      .slice(0, 10);

    return NextResponse.json<ApiResponse<SearchResult[]>>({ data: results });
  } catch (err) {
    console.error("[/api/prfm/search]", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
