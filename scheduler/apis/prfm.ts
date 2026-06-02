import { parseXml } from '../utils/xmlParser.js';
import { fetchKopis } from '../utils/fetchKopis.js';
import { mapPrfm } from '../mappers/prfmMapper.js';
import supabase from '../utils/supabase.js';
import { getTodayYYYYMMDD, getYearAgoYYYYMMDD, getYearLaterYYYYMMDD } from '../utils/dateHelper.js';
import type { KopisPrfmDb } from '../types/prfm.js';

const PAGE_SIZE = 100;

interface ParsedPrfmResponse {
  dbs?: { db?: KopisPrfmDb | KopisPrfmDb[] };
}

export async function collectPrfm(): Promise<void> {
  let cpage = 1;
  let totalCount = 0;

  console.log('[prfm] 공연 목록 수집 시작');

  while (true) {
    const url =
      `${process.env.KOPIS_BASE_URL}` +
      `?service=${process.env.KOPIS_API_KEY}` +
      `&stdate=${getYearAgoYYYYMMDD()}` +
      `&eddate=${getYearLaterYYYYMMDD()}` +
      `&cpage=${cpage}` +
      `&rows=${PAGE_SIZE}` +
      `&afterdate=${getTodayYYYYMMDD()}`;

    const xml = await fetchKopis(url);
    const parsed = (await parseXml(xml)) as ParsedPrfmResponse;

    const rawDbs = parsed?.dbs?.db;
    if (!rawDbs) {
      console.log(`[prfm] 페이지 ${cpage}: 응답 데이터 없음, 수집 종료`);
      break;
    }

    const dbList = Array.isArray(rawDbs) ? rawDbs : [rawDbs];
    const rows = dbList.map(mapPrfm);

    const { error } = await supabase
      .from('prfm')
      .upsert(rows, { onConflict: 'prfmid' });

    if (error) {
      console.error(`[prfm] 페이지 ${cpage} upsert 오류:`, error.message);
    } else {
      totalCount += dbList.length;
      console.log(`[prfm] 페이지 ${cpage}: ${dbList.length}건 처리`);
    }

    if (dbList.length < PAGE_SIZE) break;
    cpage++;
  }

  console.log(`[prfm] 수집 완료: 총 ${totalCount}건`);
}
