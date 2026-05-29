/**
 * KOPIS 공연예술통합전산망 API 클라이언트 + XML 파서
 * API 문서: https://www.kopis.or.kr/por/cs/openapi/openApiList.do
 */

import { XMLParser } from "fast-xml-parser";

const BASE_URL = process.env.KOPIS_BASE_URL ?? "http://www.kopis.or.kr/openApi/restful";
const API_KEY = process.env.KOPIS_API_KEY ?? "";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  // 단일 항목도 항상 배열로 처리 (목록 일관성 보장)
  isArray: (tagName) => ["db"].includes(tagName),
});

// ─────────────────────────────────────────
// API 파라미터 타입
// ─────────────────────────────────────────
export interface KopisPerformanceListParams {
  stdate: string;    // 검색 시작일 (YYYYMMDD)
  eddate: string;    // 검색 종료일 (YYYYMMDD)
  cpage?: number;    // 현재 페이지 (기본 1)
  rows?: number;     // 페이지당 건수 (최대 1000)
  shcate?: string;   // 장르코드
  prfstate?: string; // 01=공연예정, 02=공연중, 03=공연완료
}

export interface KopisVenueParams {
  cpage?: number;
  rows?: number;
  signgucode?: string;
}

// ─────────────────────────────────────────
// 파싱된 응답 타입
// ─────────────────────────────────────────

/** 공연 목록 단일 항목 */
export interface KopisPerformanceItem {
  mt20id: string;    // 공연 ID
  prfnm: string;     // 공연명
  prfpdfrom: string; // 시작일 (YYYY.MM.DD)
  prfpdto: string;   // 종료일 (YYYY.MM.DD)
  fcltynm: string;   // 공연장명
  poster: string;    // 포스터 URL
  area: string;      // 지역명
  genrenm: string;   // 장르명
  prfstate: string;  // 공연상태 (공연예정/공연중/공연완료)
  mt10id: string;    // 공연장 ID
}

/** 공연 상세 */
export interface KopisPerformanceDetail extends KopisPerformanceItem {
  prfcast: string;      // 출연진 (쉼표 구분)
  prfruntime: string;   // 러닝타임 (예: "120분")
  prfage: string;       // 관람 연령 (예: "만 7세 이상")
  pcseguidance: string; // 가격 정보
  dtguidance: string;   // 공연 시간표 문자열
  sty: string;          // 공연 소개/줄거리
}

/** 공연장 상세 */
export interface KopisVenueDetail {
  mt10id: string;  // 공연장 ID
  fcltynm: string; // 공연장명
  sidonm: string;  // 시도명
  gugunnm: string; // 구군명
  adres: string;   // 주소
  la: string;      // 위도 (latitude)
  lo: string;      // 경도 (longitude)
}

// ─────────────────────────────────────────
// 내부 fetch 유틸
// ─────────────────────────────────────────
async function fetchXml(path: string, params: Record<string, string | number>): Promise<string> {
  const query = new URLSearchParams({
    service: API_KEY,
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  const res = await fetch(`${BASE_URL}${path}?${query}`, {
    // sync 엔드포인트는 항상 최신 데이터 필요 → 캐시 없음
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KOPIS API error: ${res.status} ${path}`);
  return res.text();
}

// ─────────────────────────────────────────
// 공개 API 함수
// ─────────────────────────────────────────

/** 공연 목록 조회 (파싱된 배열 반환) */
export async function fetchPerformanceList(
  params: KopisPerformanceListParams
): Promise<KopisPerformanceItem[]> {
  const xml = await fetchXml("/pblprfr", { cpage: 1, rows: 1000, ...params });
  const parsed = xmlParser.parse(xml);
  const items: KopisPerformanceItem[] = parsed?.dbs?.db ?? [];
  return items.map(normalizeStrings);
}

/** 공연 상세 조회 */
export async function fetchPerformanceDetail(mt20id: string): Promise<KopisPerformanceDetail | null> {
  const xml = await fetchXml(`/pblprfr/${mt20id}`, {});
  const parsed = xmlParser.parse(xml);
  const db = parsed?.dbs?.db?.[0];
  return db ? normalizeStrings(db) : null;
}

/** 공연장 상세 조회 */
export async function fetchVenueDetail(mt10id: string): Promise<KopisVenueDetail | null> {
  const xml = await fetchXml(`/prfplc/${mt10id}`, {});
  const parsed = xmlParser.parse(xml);
  const db = parsed?.dbs?.db?.[0];
  return db ? normalizeStrings(db) : null;
}

// ─────────────────────────────────────────
// 변환 헬퍼
// ─────────────────────────────────────────

/** fast-xml-parser가 숫자로 파싱한 필드를 다시 string으로 정규화 */
function normalizeStrings<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v == null ? "" : String(v)])
  ) as T;
}

/** KOPIS 장르명 → Category enum */
export function genreToCategory(genrenm: string): string {
  const map: Record<string, string> = {
    연극: "THEATER",
    뮤지컬: "MUSICAL",
    무용: "DANCE",
    "서양음악(클래식)": "CLASSIC",
    "한국음악(국악)": "CLASSIC",
    대중음악: "CONCERT",
    복합: "ETC",
    서커스마술: "ETC",
    전시: "EXHIBITION",
  };
  return map[genrenm] ?? "ETC";
}

/** KOPIS 공연상태 → PerformanceStatus enum */
export function prfstateToStatus(prfstate: string): string {
  if (prfstate.includes("예정")) return "UPCOMING";
  if (prfstate.includes("완료")) return "ENDED";
  return "ONGOING";
}

/** KOPIS 날짜 문자열(YYYY.MM.DD) → Date */
export function parseKopisDate(dateStr: string): Date {
  return new Date(dateStr.replace(/\./g, "-"));
}

/** 러닝타임 문자열("120분") → 숫자 | null */
export function parseRuntime(runtimeStr: string): number | null {
  const match = runtimeStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
