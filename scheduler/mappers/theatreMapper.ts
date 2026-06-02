import type { KopisVenueDetailDb, KopisMt13, TheatreRow } from '../types.js';

export function mapTheatres(db: KopisVenueDetailDb): TheatreRow[] {
  const now = new Date().toISOString();

  if (db.mt13s?.mt13) {
    const mt13List: KopisMt13[] = Array.isArray(db.mt13s.mt13)
      ? db.mt13s.mt13
      : [db.mt13s.mt13];

    return mt13List.map((mt13) => ({
      theatreid: mt13.mt13id,
      venueid: db.mt10id,
      theatrenm: mt13.prfplcnm,
      seatscale: mt13.seatscale ?? null,
      stageorchat: mt13.stageorchat ?? null,
      stagepracat: mt13.stagepracat ?? null,
      stagedresat: mt13.stagedresat ?? null,
      stageoutdrat: mt13.stageoutdrat ?? null,
      disabledseatscale: mt13.disabledseatscale ?? null,
      crdt: now,
    }));
  }

  return [
    {
      theatreid: `${db.mt10id}-01`,
      venueid: db.mt10id,
      theatrenm: db.fcltynm,
      seatscale: db.seatscale ?? null,
      stageorchat: null,
      stagepracat: null,
      stagedresat: null,
      stageoutdrat: null,
      disabledseatscale: null,
      crdt: now,
    },
  ];
}
