import { parseXml } from '../utils/xmlParser.js';
import { fetchKopis } from '../utils/fetchKopis.js';
import { mapRanking } from '../mappers/rankingMapper.js';
import { delay } from '../utils/delay.js';
import supabase from '../utils/supabase.js';
import { getTodayISODate, getYesterdayYYYYMMDD, getMonthLaterYYYYMMDD } from '../utils/dateHelper.js';
import type { KopisRankingDb } from '../types/ranking.js';

interface ParsedRankingResponse {
  dbs?: { db?: KopisRankingDb | KopisRankingDb[] };
}

async function fetchCodes(codeSe: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('code_mng')
    .select('code')
    .eq('codeSe', codeSe);

  if (error) throw new Error(`[ranking] code_mng(${codeSe}) 조회 오류: ${error.message}`);
  return (data ?? []).map((row: { code: string }) => row.code);
}

export async function collectRanking(): Promise<void> {
  const today = getTodayISODate();

  // 중복 수집 방지: 오늘 crdt 데이터 존재 여부 확인
  const { data: existing, error: checkError } = await supabase
    .from('prfm_ranking')
    .select('id')
    .eq('crdt', today)
    .limit(1);

  if (checkError) {
    console.error('[ranking] 중복 확인 오류:', checkError.message);
    return;
  }

  if (existing && existing.length > 0) {
    console.log(`[ranking] ⏭️ 오늘(${today}) 이미 수집 완료 — skip`);
    return;
  }

  // code_mng에서 area / catecode 목록 조회
  const [areaCodes, cateCodes] = await Promise.all([
    fetchCodes('area'),
    fetchCodes('catecode'),
  ]);

  if (areaCodes.length === 0 || cateCodes.length === 0) {
    console.error('[ranking] area 또는 catecode 코드 목록이 비어있음, 수집 중단');
    return;
  }

  const stdate = getYesterdayYYYYMMDD();
  const eddate = getMonthLaterYYYYMMDD();
  const totalCombinations = areaCodes.length * cateCodes.length;

  console.log(`[ranking] 공연 순위 수집 시작 — area ${areaCodes.length}개 × catecode ${cateCodes.length}개 = ${totalCombinations}개 조합`);

  let totalCount = 0;

  for (const area of areaCodes) {
    for (const catecode of cateCodes) {
      const url =
        `${process.env.KOPIS_PRFMRANK_URL}` +
        `?service=${process.env.KOPIS_API_KEY}` +
        `&stdate=${stdate}` +
        `&eddate=${eddate}` +
        `&area=${area}` +
        `&catecode=${catecode}`;

      try {
        const xml = await fetchKopis(url);
        const parsed = (await parseXml(xml)) as ParsedRankingResponse;

        const rawDbs = parsed?.dbs?.db;
        if (!rawDbs) {
          console.log(`[ranking] area=${area} catecode=${catecode}: 데이터 없음`);
        } else {
          const dbList: KopisRankingDb[] = Array.isArray(rawDbs) ? rawDbs : [rawDbs];
          const rows = dbList.map((db) => mapRanking(db, catecode));

          const { error } = await supabase.from('prfm_ranking').insert(rows);
          if (error) {
            console.error(`[ranking] area=${area} catecode=${catecode} insert 오류:`, error.message);
          } else {
            totalCount += rows.length;
            console.log(`[ranking] area=${area} catecode=${catecode}: ${rows.length}건`);
          }
        }
      } catch (err) {
        console.error(`[ranking] area=${area} catecode=${catecode} API 오류:`, (err as Error).message);
      }

      await delay(100);
    }
  }

  console.log(`[ranking] 수집 완료: 총 ${totalCombinations}개 조합 / ${totalCount}건 insert`);
}
