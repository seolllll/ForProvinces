import type { KopisPrfmDb, PrfmRow } from '../types/prfm.js';

export function mapPrfm(db: KopisPrfmDb): PrfmRow {
  return {
    prfmid: db.mt20id,
    prfmnm: db.prfnm,
    prfmfrom: db.prfpdfrom,
    prfmto: db.prfpdto,
    venuenm: db.fcltynm,
    posterurl: db.poster,
    genrenm: db.genrenm,
    state: db.prfstate,
    crdt: new Date().toISOString().slice(0, 10),
  };
}
