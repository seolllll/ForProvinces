import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { supabase } from "@/lib/supabase";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import zlib from "node:zlib";

const RANK_URL = process.env.KOPIS_PRFMRANK_URL!;
const API_KEY = process.env.KOPIS_API_KEY!;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  isArray: (tagName) => ["boxof"].includes(tagName),
});

// boxoffice 엔드포인트는 WAF가 엄격해 Accept-Encoding 없으면 400 차단.
// 브라우저가 필수로 보내는 헤더를 최대한 모사해야 통과됨.
const KOPIS_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate",
  "Connection": "keep-alive",
  "Cache-Control": "max-age=0",
  "Upgrade-Insecure-Requests": "1",
};

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
        const encoding = res.headers["content-encoding"];
        const stream =
          encoding === "gzip"
            ? res.pipe(zlib.createGunzip())
            : encoding === "deflate"
            ? res.pipe(zlib.createInflate())
            : res;

        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} — ${url}\n응답 바디: ${body}`));
            return;
          }
          resolve(body);
        });
        stream.on("error", reject);
      })
      .on("error", reject);
  });
}

function toYYYYMMDD(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toYYYYMMDD(d);
}

function getMonthLater(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setMonth(d.getMonth() + 1);
  return toYYYYMMDD(d);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RankingDb {
  cate: string;
  rnum: string;
  prfnm: string;
  prfpd: string;
  prfplcnm: string;
  prfdtcnt: string;
  area: string;
  poster: string;
  mt20id: string;
}

async function fetchCodes(codeSe: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("code_mng")
    .select("code")
    .eq("codeSe", codeSe);

  if (error) throw new Error(`code_mng(${codeSe}) 조회 오류: ${error.message}`);
  return (data ?? []).map((row: { code: string }) => row.code);
}

export async function POST() {
  const today = toISODate(new Date());

  // 중복 수집 방지
  const { data: existing, error: checkError } = await supabase
    .from("prfm_ranking")
    .select("id")
    .eq("crdt", today)
    .limit(1);

  if (checkError) {
    return NextResponse.json({ ok: false, error: checkError.message }, { status: 500 });
  }

  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, skipped: true, count: 0 });
  }

  // code_mng에서 area / catecode 목록 조회
  let areaCodes: string[];
  let cateCodes: string[];
  try {
    [areaCodes, cateCodes] = await Promise.all([
      fetchCodes("area"),
      fetchCodes("catecode"),
    ]);
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }

  if (areaCodes.length === 0 || cateCodes.length === 0) {
    return NextResponse.json({ ok: false, error: "area 또는 catecode 코드 목록이 비어있음" }, { status: 500 });
  }

  const stdate = getYesterday();
  const eddate = getMonthLater();
  const totalCombinations = areaCodes.length * cateCodes.length;
  console.log(`[sync-ranking] 수집 시작 — ${totalCombinations}개 조합`);

  let totalCount = 0;

  for (const area of areaCodes) {
    for (const catecode of cateCodes) {
      const url =
        `${RANK_URL}` +
        `?service=${API_KEY}` +
        `&stdate=${stdate}` +
        `&eddate=${eddate}` +
        `&area=${area}` +
        `&catecode=${catecode}`;
      
      try {
        const xml = await fetchXmlText(url);
        const parsed = xmlParser.parse(xml);
        const dbList: RankingDb[] = parsed?.boxofs?.boxof ?? [];

        if (dbList.length > 0) {
          const rows = dbList.map((db) => ({
            genrenm: String(db.cate),
            rank: Number(db.rnum),
            prfmnm: String(db.prfnm),
            period: String(db.prfpd),
            venuenm: String(db.prfplcnm),
            prfdtcnt: Number(db.prfdtcnt),
            area: String(db.area),
            posterurl: String(db.poster),
            prfmid: String(db.mt20id),
            catecode: catecode,
            crdt: today,
          }));

          const { error } = await supabase.from("prfm_ranking").insert(rows);
          if (error) {
            console.error(`[sync-ranking] area=${area} catecode=${catecode} insert 오류:`, error.message);
          } else {
            totalCount += rows.length;
          }
        }
      } catch (err) {
        console.error(`[sync-ranking] area=${area} catecode=${catecode} API 오류:`, (err as Error).message);
      }

      await delay(100);
    }
  }

  console.log(`[sync-ranking] 수집 완료: 총 ${totalCombinations}개 조합 / ${totalCount}건`);
  return NextResponse.json({ ok: true, skipped: false, count: totalCount });
}
