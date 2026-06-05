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

  const { data: rankings, error } = await supabase
    .from("prfm_ranking")
    .select("rank, prfmnm, venuenm, period, prfdtcnt, posterurl, prfmid")
    .eq("area", area)
    .eq("catecode", catecode)
    .eq("crdt", latestRow.crdt)
    .order("rank");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rankings?.length) return NextResponse.json({ data: [], crdt: latestRow.crdt });

  const prfmIds = rankings.map((r) => r.prfmid as string);

  // prfmid → venueid, state 병렬 조회
  const [{ data: details }, { data: prfmStates }] = await Promise.all([
    supabase.from("prfmdetail").select("prfmid, venueid").in("prfmid", prfmIds),
    supabase.from("prfm").select("prfmid, state").in("prfmid", prfmIds),
  ]);

  const stateMap = new Map<string, string>(
    (prfmStates ?? []).map((p) => [p.prfmid as string, p.state as string])
  );

  const prfmToVenue = new Map<string, string>();
  for (const d of details ?? []) {
    if (!prfmToVenue.has(d.prfmid)) prfmToVenue.set(d.prfmid, d.venueid);
  }

  // venueid → 좌표
  const venueIds = [...new Set(prfmToVenue.values())];
  const { data: coords } = await supabase
    .from("venuedetail")
    .select("venueid, la, lo")
    .in("venueid", venueIds)
    .not("la", "is", null)
    .not("lo", "is", null);

  const coordMap = new Map(
    (coords ?? []).map((c) => [c.venueid as string, { la: c.la as number, lo: c.lo as number }])
  );

  const data = rankings.map((r) => {
    const venueid = prfmToVenue.get(r.prfmid) ?? null;
    const coord = venueid ? coordMap.get(venueid) ?? null : null;
    return { ...r, venueid, la: coord?.la ?? null, lo: coord?.lo ?? null, state: stateMap.get(r.prfmid) ?? null };
  });

  return NextResponse.json({ data, crdt: latestRow.crdt });
}
