// ─────────────────────────────────────────
// 공통 Enum 타입
// ─────────────────────────────────────────
export type Category = "THEATER" | "MUSICAL" | "EXHIBITION" | "CONCERT" | "DANCE" | "CLASSIC" | "ETC";
export type PerformanceStatus = "UPCOMING" | "ONGOING" | "ENDED";

export const CATEGORY_LABEL: Record<Category, string> = {
  THEATER: "연극",
  MUSICAL: "뮤지컬",
  EXHIBITION: "전시",
  CONCERT: "콘서트",
  DANCE: "무용",
  CLASSIC: "클래식",
  ETC: "기타",
};

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
  id: string;       // venuedetail.venueid
  name: string;     // venue.venuenm
  latitude: number; // venuedetail.la
  longitude: number; // venuedetail.lo
}

/** 공연홀 (theatre) */
export interface TheatreInfo {
  theatreid: string;
  theatrenm: string;
  seatscale: string | null;
  stageorchat: string | null;   // 오케스트라 무대 여부 ('Y'/'N')
  stagepracat: string | null;   // 프로세니엄 무대
  stagedresat: string | null;   // 드레서 무대
  stageoutdrat: string | null;  // 야외 무대
  disabledseatscale: string | null;
}

/** 공연장 상세 (venue + venuedetail + theatre 통합) */
export interface VenueInfo {
  venueid: string;
  venuenm: string;
  venuecnt: string | null;  // 공연장 내 홀 수
  sidonm: string | null;
  gugunnm: string | null;
  opende: string | null;    // 개관일
  seatscale: string | null; // 총 좌석 수
  adres: string | null;     // 주소
  la: number;
  lo: number;
  theatres: TheatreInfo[];
}

// ─────────────────────────────────────────
// 공연 관련 타입 (추후 prfm/prfmdetail 연동용)
// ─────────────────────────────────────────

/** 사이드바 공연 목록용 공연 요약 */
export interface PerformanceSummary {
  id: string;
  title: string;
  category: Category;
  status: PerformanceStatus;
  posterUrl: string | null;
  startDate: string; // ISO date string
  endDate: string;
  venueName: string;
  price: string | null;
}

/** 캐스팅 페어 멤버 */
export interface CastingPairMember {
  roleId: string;
  roleName: string;
  actorId: string;
  actorName: string;
  profileUrl?: string;
}

/** 캐스팅 페어 */
export interface CastingPairDetail {
  id: string;
  members: CastingPairMember[];
  scheduleDates: string[];
  note: string | null;
}

/** 예매 정보 */
export interface TicketingInfo {
  id: string;
  openAt: string; // ISO datetime string
  platform: string;
  url: string | null;
  ticketType: string | null;
  note: string | null;
}

/** 공연 상세 */
export interface PerformanceDetail extends PerformanceSummary {
  description: string | null;
  runtime: number | null;
  ageLimit: string | null;
  castingPairs: CastingPairDetail[];
  ticketings: TicketingInfo[];
  venue: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
}

/** API 응답 래퍼 */
export interface ApiResponse<T> {
  data: T;
  error?: string;
}
