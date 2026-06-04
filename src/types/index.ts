// ─────────────────────────────────────────
// code_mng 지역 코드
// ─────────────────────────────────────────
export interface AreaCode {
  code: string;
  codeNm: string;
}

// ─────────────────────────────────────────
// 지역 상수
// ─────────────────────────────────────────
export const KOREA_REGIONS = [
  { label: "서울", key: "서울" },
  { label: "경기", key: "경기" },
  { label: "인천", key: "인천" },
  { label: "부산", key: "부산" },
  { label: "대구", key: "대구" },
  { label: "광주", key: "광주" },
  { label: "대전", key: "대전" },
  { label: "울산", key: "울산" },
  { label: "세종", key: "세종" },
  { label: "강원", key: "강원" },
  { label: "충북", key: "충청북" },
  { label: "충남", key: "충청남" },
  { label: "전북", key: "전북" },
  { label: "전남", key: "전라남" },
  { label: "경북", key: "경상북" },
  { label: "경남", key: "경상남" },
  { label: "제주", key: "제주" },
] as const;

export type KoreaRegion = (typeof KOREA_REGIONS)[number];

// ─────────────────────────────────────────
// KOPIS 장르 상수
// ─────────────────────────────────────────
export const KOPIS_GENRES = [
  "복합",
  "무용(서양/한국무용)",
  "서양음악(클래식)",
  "뮤지컬",
  "서커스/마술",
  "대중음악",
  "한국음악(국악)",
  "연극",
  "대중무용",
] as const;

// ─────────────────────────────────────────
// 지도 관련 타입
// ─────────────────────────────────────────
export interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

// ─────────────────────────────────────────
// API 응답 타입
// ─────────────────────────────────────────

/** 지도 마커 렌더링용 공연장 요약 */
export interface VenueMarker {
  id: string;        // venuedetail.venueid
  name: string;      // venue.venuenm
  latitude: number;  // venuedetail.la
  longitude: number; // venuedetail.lo
}

/** 공연홀 (theatre) */
export interface TheatreInfo {
  theatreid: string;
  theatrenm: string;
  seatscale: string | null;
  stageorchat: string | null;
  stagepracat: string | null;
  stagedresat: string | null;
  stageoutdrat: string | null;
  disabledseatscale: string | null;
}

/** 공연장 상세 (venue + venuedetail + theatre 통합) */
export interface VenueInfo {
  venueid: string;
  venuenm: string;
  venuecnt: string | null;
  sidonm: string | null;
  gugunnm: string | null;
  opende: string | null;
  seatscale: string | null;
  adres: string | null;
  la: number;
  lo: number;
  theatres: TheatreInfo[];
}

/** KOPIS prfm 기반 시설별 공연 목록 */
export interface VenuePerformance {
  prfmid: string;
  prfmnm: string;
  prfmfrom: string; // "YYYY.MM.DD"
  prfmto: string;   // "YYYY.MM.DD"
  posterurl: string | null;
  genrenm: string | null;
  state: string | null;
}

/** API 응답 래퍼 */
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// ─────────────────────────────────────────
// KOPIS prfm + prfmdetail 통합 상세 타입
// ─────────────────────────────────────────

export interface KopisRelate {
  relatenm: string;
  relateurl: string;
}

/** GET /api/prfm/by-region 응답 타입 */
export interface RegionPerformance {
  prfmid: string;
  prfmnm: string;
  venueid: string;
  venuenm: string;
  gugunnm: string | null;
  state: string | null;
  genrenm: string | null;
  posterurl: string | null;
  prfmfrom: string;
  prfmto: string;
  la: number;
  lo: number;
}

/** GET /api/prfm/search 응답 타입 */
export interface SearchResult {
  prfmid: string;
  prfmnm: string;
  venuenm: string;
  state: string | null;
  genrenm: string | null;
  posterurl: string | null;
  venueid: string;
  la: number;
  lo: number;
}

/** GET /api/prfm/[id] 응답 타입 */
export interface KopisPrfmFull {
  // prfm
  prfmid: string;
  prfmnm: string;
  prfmfrom: string;
  prfmto: string;
  venuenm: string;
  posterurl: string | null;
  genrenm: string | null;
  state: string | null;
  // prfmdetail
  prfmcast: string | null;
  runtime: string | null;
  viewage: string | null;
  entrpsnm: string | null;
  entrpsnmp: string | null;
  entrpsnma: string | null;
  entrpsnmh: string | null;
  entrpsnms: string | null;
  pcseguidance: string | null;
  visit: string | null;
  child: string | null;
  daehakro: string | null;
  openrun: string | null;
  festival: string | null;
  relates: KopisRelate[] | null;
}
