// ─── KOPIS API XML 응답 타입 ────────────────────────────────────────────────

export interface KopisRankingDb {
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

// ─── Supabase 테이블 행 타입 ─────────────────────────────────────────────────

export interface RankingRow {
  genrenm: string;
  rank: number;
  prfmnm: string;
  period: string;
  venuenm: string;
  prfdtcnt: number;
  area: string;
  posterurl: string;
  prfmid: string;
  catecode: string;
  crdt: string;
}
