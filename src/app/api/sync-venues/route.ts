import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { supabase } from "@/lib/supabase";

const VENUE_URL = process.env.KOPIS_VENUE_URL!;
const API_KEY = process.env.KOPIS_API_KEY!;
const PAGE_SIZE = 100;

// mt13은 단일 항목이어도 배열로 강제 처리
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  isArray: (tagName) => ["db", "mt13"].includes(tagName),
});

interface VenueListDb {
  mt10id: string | number;
  fcltynm: string;
  mt13cnt: string | number;
  sidonm: string;
  gugunnm: string;
}

interface Mt13 {
  mt13id: string | number;
  prfplcnm: string;
  seatscale?: string | number;
  stageorchat?: string | number;
  stagepracat?: string | number;
  stagedresat?: string | number;
  stageoutdrat?: string | number;
  disabledseatscale?: string | number;
}

interface VenueDetailDb {
  mt10id: string | number;
  fcltynm: string;
  opende?: string | number;
  seatscale?: string | number;
  adres?: string;
  la?: string | number;
  lo?: string | number;
  mt13s?: { mt13?: Mt13[] };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/xml, text/xml, */*;q=0.9",
};

async function fetchXmlText(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store", headers: BROWSER_HEADERS });
  if (!res.ok) {
    const body = await res.text().catch(() => "(body read 실패)");
    throw new Error(`HTTP ${res.status} — ${url}\n응답 바디: ${body}`);
  }
  return res.text();
}

// ── API 3: venue 목록 전체 페이지 수집 ──────────────────────────────────────

async function collectVenues(afterdate?: string): Promise<{ count: number; errors: number }> {
  let cpage = 1;
  let count = 0;
  let errors = 0;
  const now = new Date().toISOString();

  console.log(`[sync-venues] venue 목록 수집 시작${afterdate ? ` (afterdate: ${afterdate})` : ""}`);

  while (true) {
    const url =
      `${VENUE_URL}?service=${API_KEY}&cpage=${cpage}&rows=${PAGE_SIZE}` +
      (afterdate ? `&afterdate=${afterdate}` : "");
    const xml = await fetchXmlText(url);
    const parsed = xmlParser.parse(xml);
    const dbList: VenueListDb[] = parsed?.dbs?.db ?? [];

    if (dbList.length === 0) {
      console.log(`[sync-venues] venue 페이지 ${cpage}: 응답 없음, 종료`);
      break;
    }

    const rows = dbList.map((db) => ({
      venueid: String(db.mt10id),
      venuenm: String(db.fcltynm),
      venuecnt: String(db.mt13cnt),
      sidonm: String(db.sidonm),
      gugunnm: String(db.gugunnm),
      crdt: now,
    }));

    const { error } = await supabase
      .from("venue")
      .upsert(rows, { onConflict: "venueid" });

    if (error) {
      console.error(`[sync-venues] venue 페이지 ${cpage} upsert 오류:`, error.message);
      errors++;
    } else {
      count += dbList.length;
      console.log(`[sync-venues] venue 페이지 ${cpage}: ${dbList.length}건 처리`);
    }

    if (dbList.length < PAGE_SIZE) break;
    cpage++;
  }

  console.log(`[sync-venues] venue 수집 완료: 총 ${count}건`);
  return { count, errors };
}

// ── 호출 대상 선정 ───────────────────────────────────────────────────────────

// Supabase 기본 1000행 상한을 우회하여 지정 테이블의 컬럼 값 전체를 수집
async function fetchAllIds(table: string, column: string): Promise<string[]> {
  const ids: string[] = [];
  const BATCH = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .range(from, from + BATCH - 1);
    if (error) {
      console.error(`[sync-venues] ${table} 조회 오류:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    ids.push(...(data as unknown as Array<Record<string, string>>).map((row) => row[column]));
    if (data.length < BATCH) break;
    from += BATCH;
  }
  return ids;
}

async function getTargetVenueIds(): Promise<string[]> {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  const [allIds, detailedIds, { data: todayVenues }] = await Promise.all([
    fetchAllIds("venue", "venueid"),
    fetchAllIds("venuedetail", "venueid"),
    supabase
      .from("venue")
      .select("venueid")
      .gte("crdt", `${today}T00:00:00.000Z`)
      .lt("crdt", `${tomorrow}T00:00:00.000Z`),
  ]);

  const detailedSet = new Set(detailedIds);
  const missingIds = allIds.filter((id) => !detailedSet.has(id));

  console.log(
    `[sync-venues] venue 전체: ${allIds.length}건, 수집완료: ${detailedIds.length}건, 미수집: ${missingIds.length}건`
  );

  return [
    ...new Set([
      ...(todayVenues ?? []).map((v: { venueid: string }) => v.venueid),
      ...missingIds,
    ]),
  ];
}

// ── API 4: venuedetail + theatre 수집 ────────────────────────────────────────

async function collectVenueDetails(): Promise<{
  success: number;
  fail: number;
  total: number;
}> {
  const venueIds = await getTargetVenueIds();
  console.log(`[sync-venues] venuedetail 대상: ${venueIds.length}건`);

  let success = 0;
  let fail = 0;
  const now = new Date().toISOString();

  for (const venueid of venueIds) {
    try {
      const url = `${VENUE_URL}/${venueid}?service=${API_KEY}`;
      const xml = await fetchXmlText(url);
      const parsed = xmlParser.parse(xml);
      const db: VenueDetailDb | undefined = parsed?.dbs?.db?.[0];
      if (!db) throw new Error("응답 데이터 없음");

      // venuedetail upsert
      const { error: de } = await supabase.from("venuedetail").upsert(
        [
          {
            venueid: String(db.mt10id),
            opende: db.opende != null ? String(db.opende) : null,
            seatscale: db.seatscale != null ? String(db.seatscale) : null,
            adres: db.adres ?? null,
            la: db.la != null ? parseFloat(String(db.la)) : null,
            lo: db.lo != null ? parseFloat(String(db.lo)) : null,
            crdt: now,
          },
        ],
        { onConflict: "venueid" }
      );
      if (de) throw new Error(`venuedetail upsert: ${de.message}`);

      // theatre upsert (mt13 배열 우선, 없으면 시설 자체로 대체)
      const mt13List: Mt13[] = db.mt13s?.mt13 ?? [];
      const theatreRows =
        mt13List.length > 0
          ? mt13List.map((mt13) => ({
              theatreid: String(mt13.mt13id),
              venueid: String(db.mt10id),
              theatrenm: String(mt13.prfplcnm),
              seatscale: mt13.seatscale != null ? String(mt13.seatscale) : null,
              stageorchat: mt13.stageorchat != null ? String(mt13.stageorchat) : null,
              stagepracat: mt13.stagepracat != null ? String(mt13.stagepracat) : null,
              stagedresat: mt13.stagedresat != null ? String(mt13.stagedresat) : null,
              stageoutdrat: mt13.stageoutdrat != null ? String(mt13.stageoutdrat) : null,
              disabledseatscale:
                mt13.disabledseatscale != null ? String(mt13.disabledseatscale) : null,
              crdt: now,
            }))
          : [
              {
                theatreid: `${db.mt10id}-01`,
                venueid: String(db.mt10id),
                theatrenm: String(db.fcltynm),
                seatscale: db.seatscale != null ? String(db.seatscale) : null,
                stageorchat: null,
                stagepracat: null,
                stagedresat: null,
                stageoutdrat: null,
                disabledseatscale: null,
                crdt: now,
              },
            ];

      const { error: te } = await supabase
        .from("theatre")
        .upsert(theatreRows, { onConflict: "theatreid" });
      if (te) throw new Error(`theatre upsert: ${te.message}`);

      success++;
      
    } catch (err) {
      console.error(`[sync-venues] ${venueid} 처리 실패:`, (err as Error).message);
      fail++;
    }

    await delay(100);
  }

  console.log(`[sync-venues] venuedetail 완료: ${success}/${venueIds.length}건 성공`);
  return { success, fail, total: venueIds.length };
}

// ── POST /api/sync-venues ─────────────────────────────────────────────────────

interface SyncVenuesRequest {
  afterdate?: string;
}

export async function POST(req: Request) {
  const body: SyncVenuesRequest = await req.json().catch(() => ({}));
  const afterdate = body.afterdate || undefined;

  console.log(`[sync-venues] ===== 공연시설 수집 시작${afterdate ? ` (afterdate: ${afterdate})` : ""} =====`);
  try {
    const venueStats = await collectVenues(afterdate);
    const detailStats = await collectVenueDetails();
    console.log("[sync-venues] ===== 완료 =====");
    return NextResponse.json({ ok: true, venue: venueStats, detail: detailStats });
  } catch (err) {
    console.error("[sync-venues] 치명적 오류:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
