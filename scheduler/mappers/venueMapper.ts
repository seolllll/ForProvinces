import type { KopisVenueDb, VenueRow } from '../types.js';

export function mapVenue(db: KopisVenueDb): VenueRow {
  return {
    venueid: db.mt10id,
    venuenm: db.fcltynm,
    venuecnt: db.mt13cnt,
    sidonm: db.sidonm,
    gugunnm: db.gugunnm,
    crdt: new Date().toISOString(),
  };
}
