// ─── KOPIS API XML 응답 타입 ────────────────────────────────────────────────

export interface KopisVenueDb {
  mt10id: string;
  fcltynm: string;
  mt13cnt: string;
  sidonm: string;
  gugunnm: string;
}

export interface KopisMt13 {
  mt13id: string;
  prfplcnm: string;
  seatscale?: string;
  stageorchat?: string;
  stagepracat?: string;
  stagedresat?: string;
  stageoutdrat?: string;
  disabledseatscale?: string;
}

export interface KopisVenueDetailDb extends KopisVenueDb {
  opende?: string;
  seatscale?: string;
  adres?: string;
  la?: string;
  lo?: string;
  mt13s?: {
    mt13: KopisMt13 | KopisMt13[];
  };
}

// ─── Supabase 테이블 행 타입 ─────────────────────────────────────────────────

export interface VenueRow {
  venueid: string;
  venuenm: string;
  venuecnt: string;
  sidonm: string;
  gugunnm: string;
  crdt: string;
}

export interface VenueDetailRow {
  venueid: string;
  opende: string | null;
  seatscale: string | null;
  adres: string | null;
  la: number | null;
  lo: number | null;
  crdt: string;
}

export interface TheatreRow {
  theatreid: string;
  venueid: string;
  theatrenm: string;
  seatscale: string | null;
  stageorchat: string | null;
  stagepracat: string | null;
  stagedresat: string | null;
  stageoutdrat: string | null;
  disabledseatscale: string | null;
  crdt: string;
}
