// ─── KOPIS API XML 응답 타입 ────────────────────────────────────────────────

export interface KopisPrfmDb {
  mt20id: string;
  prfnm: string;
  prfpdfrom: string;
  prfpdto: string;
  fcltynm: string;
  poster: string;
  genrenm: string;
  prfstate: string;
}

export interface KopisRelate {
  relatenm: string;
  relateurl: string;
}

export interface KopisPrfmDetailDb {
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
  relates?: { relate: KopisRelate | KopisRelate[] };
}

// ─── Supabase 테이블 행 타입 ─────────────────────────────────────────────────

export interface PrfmRow {
  prfmid: string;
  prfmnm: string;
  prfmfrom: string;
  prfmto: string;
  venuenm: string;
  posterurl: string;
  genrenm: string;
  state: string;
  crdt: string;
}

export interface PrfmDetailRow {
  prfmid: string;
  venueid: string;
  theatreid: string;
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
  relates: string | null;
  crdt: string;
}
