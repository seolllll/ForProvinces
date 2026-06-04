import type { KopisVenueDetailDb, VenueDetailRow } from '../types.js';

function toFloat(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

export function mapVenueDetail(db: KopisVenueDetailDb): VenueDetailRow {
  return {
    venueid: db.mt10id,
    opende: db.opende ?? null,
    seatscale: db.seatscale ?? null,
    adres: db.adres ?? null,
    la: toFloat(db.la),
    lo: toFloat(db.lo),
    crdt: new Date().toISOString().slice(0, 10),
  };
}
