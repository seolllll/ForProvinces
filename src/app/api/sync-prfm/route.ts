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

function toYYYYMMDD(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function getYearAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return toYYYYMMDD(d);
}

function getYearLater(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return toYYYYMMDD(d);
}

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

// ── 공통: Supabase 1000행 상한 우회 ──────────────────────────────────────────

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
      console.error(`[sync-prfm] ${table} 조회 오류:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    ids.push(...(data as unknown as Array<Record<string, string>>).map((row) => row[column]));
    if (data.length < BATCH) break;
    from += BATCH;
  }
  return ids;
}

// ── API 1: prfm 목록 전체 페이지 수집 ────────────────────────────────────────

interface PrfmListDb {
  mt20id: string;
  prfnm: string;
  prfpdfrom: string;
  prfpdto: string;
  fcltynm: string;
  poster: string;
  genrenm: string;
  prfstate: string;
}

async function collectPrfm(): Promise<{ count: number; errors: number }> {
  let cpage = 1;
  let count = 0;
  let errors = 0;
  const now = new Date().toISOString();

  console.log("[sync-prfm] prfm 목록 수집 시작");

  while (true) {
    const url =
      `${BASE_URL}` +
      `?service=${API_KEY}` +
      `&stdate=${getYearAgo()}` +
      `&eddate=${getYearLater()}` +
      `&cpage=${cpage}` +
      `&rows=${PAGE_SIZE}`;

    const xml = await fetchXmlText(url);
    const parsed = xmlParser.parse(xml);
    const dbList: PrfmListDb[] = parsed?.dbs?.db ?? [];

    if (dbList.length === 0) {
      console.log(`[sync-prfm] prfm 페이지 ${cpage}: 응답 없음, 종료`);
      break;
    }

    const rows = dbList.map((db) => ({
      prfmid: String(db.mt20id),
      prfmnm: String(db.prfnm),
      prfmfrom: String(db.prfpdfrom),
      prfmto: String(db.prfpdto),
      venuenm: String(db.fcltynm),
      posterurl: String(db.poster),
      genrenm: String(db.genrenm),
      state: String(db.prfstate),
      crdt: now,
    }));

    const { error } = await supabase
      .from("prfm")
      .upsert(rows, { onConflict: "prfmid" });

    if (error) {
      console.error(`[sync-prfm] prfm 페이지 ${cpage} upsert 오류:`, error.message);
      errors++;
    } else {
      count += dbList.length;
      console.log(`[sync-prfm] prfm 페이지 ${cpage}: ${dbList.length}건 처리`);
    }

    if (dbList.length < PAGE_SIZE) break;
    cpage++;
    await delay(200);
  }

  console.log(`[sync-prfm] prfm 수집 완료: 총 ${count}건`);
  return { count, errors };
}

// ── 대상 선정 ─────────────────────────────────────────────────────────────────

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
    `[sync-prfm] prfm 전체: ${allIds.length}건, 수집완료: ${detailedIds.length}건, 미수집: ${missingIds.length}건`
  );

  return [
    ...new Set([
      ...(todayPrfm ?? []).map((v: { prfmid: string }) => v.prfmid),
      ...missingIds,
    ]),
  ];
}

// ── API 2: prfmdetail 수집 ────────────────────────────────────────────────────

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

async function collectPrfmDetails(): Promise<{
  success: number;
  fail: number;
  total: number;
}> {
  const prfmIds = await getTargetPrfmIds();
  console.log(`[sync-prfm] prfmdetail 대상: ${prfmIds.length}건`);

  let success = 0;
  let fail = 0;
  const now = new Date().toISOString();

  for (const prfmid of prfmIds) {
    try {
      const url = `${BASE_URL}/${prfmid}?service=${API_KEY}`;
      const xml = await fetchXmlText(url);
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
      console.error(`[sync-prfm] ${prfmid} 처리 실패:`, (err as Error).message);
      fail++;
    }

    await delay(100);
  }

  console.log(`[sync-prfm] prfmdetail 완료: ${success}/${prfmIds.length}건 성공`);
  return { success, fail, total: prfmIds.length };
}

// ── POST /api/sync-prfm ───────────────────────────────────────────────────────

export async function POST() {
  console.log("[sync-prfm] ===== 공연 데이터 수집 시작 =====");
  try {
    const prfmStats = await collectPrfm();
    const detailStats = await collectPrfmDetails();
    console.log("[sync-prfm] ===== 완료 =====");
    return NextResponse.json({ ok: true, prfm: prfmStats, detail: detailStats });
  } catch (err) {
    console.error("[sync-prfm] 치명적 오류:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
