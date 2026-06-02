import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { supabase } from "@/lib/supabase";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";

const BASE_URL = process.env.KOPIS_BASE_URL!;
const API_KEY = process.env.KOPIS_API_KEY!;
const PAGE_SIZE = 100;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  isArray: (tagName) => ["db"].includes(tagName),
});

const KOPIS_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Next.js가 global fetch를 패치하면서 내부 헤더를 추가해 KOPIS WAF에서 차단됨.
// node:http 모듈을 직접 사용해 전송 헤더를 완전히 제어함.
function fetchXmlText(url: string, redirects = 0): Promise<string> {
  if (redirects > 5) return Promise.reject(new Error(`리다이렉트 초과: ${url}`));
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https://") ? https : http;
    client
      .get(url, { headers: KOPIS_HEADERS }, (res: IncomingMessage) => {
        if (
          res.statusCode &&
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        ) {
          res.resume();
          fetchXmlText(res.headers.location, redirects + 1).then(resolve, reject);
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} — ${url}\n응답 바디: ${body}`));
            return;
          }
          resolve(body);
        });
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

async function fetchXmlWithRetry(url: string): Promise<string> {
  try {
    return await fetchXmlText(url);
  } catch (err) {
    const msg = (err as Error).message;
    // WAF 차단(Request Blocked) 감지 시 3초 대기 후 1회 재시도
    if (msg.includes("HTTP 400") && msg.includes("Request Blocked")) {
      console.warn(`[sync-prfm-detail] WAF 차단 감지 — 3초 대기 후 재시도: ${url}`);
      await delay(3000);
      return fetchXmlText(url);
    }
    throw err;
  }
}

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
      console.error(`[sync-prfm-detail] ${table} 조회 오류:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    ids.push(...(data as unknown as Array<Record<string, string>>).map((row) => row[column]));
    if (data.length < BATCH) break;
    from += BATCH;
  }
  return ids;
}

async function getTargetPrfmIds(): Promise<string[]> {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  const [allIds, detailedIds, { data: todayPrfm }] = await Promise.all([
    fetchAllIds("prfm", "prfmid"),
    fetchAllIds("prfmdetail", "prfmid"),
    supabase
      .from("prfm")
      .select("prfmid")
      .gte("crdt", `${today}T00:00:00.000Z`)
      .lt("crdt", `${tomorrow}T00:00:00.000Z`),
  ]);

  const detailedSet = new Set(detailedIds);
  const missingIds = allIds.filter((id) => !detailedSet.has(id));

  console.log(
    `[sync-prfm-detail] prfm 전체: ${allIds.length}건, 수집완료: ${detailedIds.length}건, 미수집: ${missingIds.length}건`
  );

  return [
    ...new Set([
      ...(todayPrfm ?? []).map((v: { prfmid: string }) => v.prfmid),
      ...missingIds,
    ]),
  ];
}

interface PrfmDetailDb {
  mt20id: string;
  mt10id: string;
  mt13id: string;
  prfcast?: string;
  prfruntime?: string;
  prfage?: string;
  entrpsnm?: string;
  entrpsnmP?: string;
  entrpsnmA?: string;
  entrpsnmH?: string;
  entrpsnmS?: string;
  pcseguidance?: string;
  visit?: string;
  child?: string;
  daehakro?: string;
  openrun?: string;
  festival?: string;
}

interface SyncPrfmDetailRequest {
  startPage?: number;
}

async function collectPrfmDetails(startPage: number): Promise<{
  success: number;
  fail: number;
  total: number;
  startPage: number;
  failedPage?: number;
}> {
  const prfmIds = await getTargetPrfmIds();
  const startIndex = (startPage - 1) * PAGE_SIZE;
  const targetIds = prfmIds.slice(startIndex);

  console.log(
    `[sync-prfm-detail] 수집 대상: 전체 ${prfmIds.length}건 중 page ${startPage}(index ${startIndex})부터 ${targetIds.length}건 처리`
  );

  let success = 0;
  let fail = 0;
  let firstFailPage: number | undefined;
  const now = new Date().toISOString();

  for (let i = 0; i < targetIds.length; i++) {
    const prfmid = targetIds[i];
    const absoluteIndex = startIndex + i;
    const currentPage = Math.floor(absoluteIndex / PAGE_SIZE) + 1;

    try {
      const url = `${BASE_URL}/${prfmid}?service=${API_KEY}`;
      const xml = await fetchXmlWithRetry(url);
      const parsed = xmlParser.parse(xml);
      const db: PrfmDetailDb | undefined = parsed?.dbs?.db?.[0];
      if (!db) throw new Error("응답 데이터 없음");

      const { error } = await supabase.from("prfmdetail").upsert(
        [
          {
            prfmid: String(db.mt20id),
            venueid: String(db.mt10id),
            theatreid: String(db.mt13id),
            prfmcast: db.prfcast ?? null,
            runtime: db.prfruntime ?? null,
            viewage: db.prfage ?? null,
            entrpsnm: db.entrpsnm ?? null,
            entrpsnmp: db.entrpsnmP ?? null,
            entrpsnma: db.entrpsnmA ?? null,
            entrpsnmh: db.entrpsnmH ?? null,
            entrpsnms: db.entrpsnmS ?? null,
            pcseguidance: db.pcseguidance ?? null,
            visit: db.visit ?? null,
            child: db.child ?? null,
            daehakro: db.daehakro ?? null,
            openrun: db.openrun ?? null,
            festival: db.festival ?? null,
            crdt: now,
          },
        ],
        { onConflict: "prfmid" }
      );

      if (error) throw new Error(`prfmdetail upsert: ${error.message}`);

      success++;
    } catch (err) {
      console.error(
        `[sync-prfm-detail] ${prfmid} 처리 실패 (page ${currentPage}, index ${absoluteIndex}):`,
        (err as Error).message
      );
      fail++;
      if (firstFailPage === undefined) {
        firstFailPage = currentPage;
        console.warn(
          `[sync-prfm-detail] 첫 실패 발생 — 재시작 시 startPage=${currentPage} 로 요청하세요`
        );
      }
    }

    await delay(500);
  }

  console.log(`[sync-prfm-detail] 완료: ${success}/${targetIds.length}건 성공`);
  return {
    success,
    fail,
    total: targetIds.length,
    startPage,
    ...(firstFailPage !== undefined ? { failedPage: firstFailPage } : {}),
  };
}

// ── POST /api/sync-prfm-detail ────────────────────────────────────────────────

export async function POST(req: Request) {
  const body: SyncPrfmDetailRequest = await req.json().catch(() => ({}));
  const startPage = Math.max(1, body.startPage ?? 1);

  console.log(`[sync-prfm-detail] ===== 공연 상세 수집 시작 (startPage: ${startPage}) =====`);
  try {
    const detailStats = await collectPrfmDetails(startPage);
    console.log("[sync-prfm-detail] ===== 완료 =====");
    return NextResponse.json({ ok: true, detail: detailStats });
  } catch (err) {
    console.error("[sync-prfm-detail] 치명적 오류:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
