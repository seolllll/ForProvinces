import type { KopisPrfmDetailDb, PrfmDetailRow } from '../types/prfm.js';

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
    crdt: new Date().toISOString(),
  };
}
