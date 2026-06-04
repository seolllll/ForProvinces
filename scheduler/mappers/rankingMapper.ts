import type { KopisRankingDb, RankingRow } from '../types/ranking.js';
import { getTodayISODate } from '../utils/dateHelper.js';

export function mapRanking(db: KopisRankingDb, catecode: string): RankingRow {
  return {
    genrenm: db.cate,
    rank: Number(db.rnum),
    prfmnm: db.prfnm,
    period: db.prfpd,
    venuenm: db.prfplcnm,
    prfdtcnt: Number(db.prfdtcnt),
    area: db.area,
    posterurl: db.poster,
    prfmid: db.mt20id,
    catecode: catecode,
    crdt: getTodayISODate(),
  };
}
