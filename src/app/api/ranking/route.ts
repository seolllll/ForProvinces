import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const area = searchParams.get("area");
  const catecode = searchParams.get("catecode");

  if (!area || !catecode) {
    return NextResponse.json({ error: "area, catecode 파라미터 필요" }, { status: 400 });
  }

  // 가장 최근 수집일 기준으로 조회
  const { data: latestRow } = await supabase
    .from("prfm_ranking")
    .select("crdt")
    .order("crdt", { ascending: false })
    .limit(1)
    .single();

  if (!latestRow) {
    return NextResponse.json({ data: [] });
  }

  const { data, error } = await supabase
    .from("prfm_ranking")
    .select("rank, prfmnm, venuenm, period, prfdtcnt, posterurl, prfmid")
    .eq("area", area)
    .eq("catecode", catecode)
    .eq("crdt", latestRow.crdt)
    .order("rank");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [], crdt: latestRow.crdt });
}
