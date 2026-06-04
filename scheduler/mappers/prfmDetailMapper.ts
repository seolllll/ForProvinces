import type { KopisPrfmDetailDb, KopisRelate, PrfmDetailRow } from '../types/prfm.js';

function parseRelates(raw: KopisPrfmDetailDb['relates']): string | null {
  if (!raw?.relate) return null;
  const list: KopisRelate[] = Array.isArray(raw.relate) ? raw.relate : [raw.relate];
  const mapped = list.map((r) => ({ relatenm: r.relatenm, relateurl: r.relateurl }));
  return JSON.stringify(mapped);
}

export function mapPrfmDetail(db: KopisPrfmDetailDb): PrfmDetailRow {
  return {
    prfmid: db.mt20id,
    venueid: db.mt10id,
    theatreid: db.mt13id,
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
    relates: parseRelates(db.relates),
    crdt: new Date().toISOString().slice(0, 10),
  };
}
