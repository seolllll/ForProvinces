import { parseXml } from '../utils/xmlParser.js';
import { fetchKopis } from '../utils/fetchKopis.js';
import { mapVenue } from '../mappers/venueMapper.js';
import supabase from '../utils/supabase.js';
import { getTodayYYYYMMDD } from '../utils/dateHelper.js';
import type { KopisVenueDb } from '../types.js';

const PAGE_SIZE = 100;

interface ParsedVenueResponse {
  dbs?: { db?: KopisVenueDb | KopisVenueDb[] };
}

export async function collectVenues(): Promise<void> {
  let cpage = 1;
  let totalCount = 0;

  console.log('[venue] 공연시설 목록 수집 시작');

  while (true) {
    const url = `${process.env.KOPIS_VENUE_URL}?service=${process.env.KOPIS_API_KEY}&cpage=${cpage}&rows=${PAGE_SIZE}&afterdate=${getTodayYYYYMMDD()}`;
    const xml = await fetchKopis(url);
    const parsed = (await parseXml(xml)) as ParsedVenueResponse;

    const rawDbs = parsed?.dbs?.db;
    if (!rawDbs) {
      console.log(`[venue] 페이지 ${cpage}: 응답 데이터 없음, 수집 종료`);
      break;
    }

    const dbList = Array.isArray(rawDbs) ? rawDbs : [rawDbs];
    const rows = dbList.map(mapVenue);

    const { error } = await supabase
      .from('venue')
      .upsert(rows, { onConflict: 'venueid' });

    if (error) {
      console.error(`[venue] 페이지 ${cpage} upsert 오류:`, error.message);
    } else {
      totalCount += dbList.length;
      console.log(`[venue] 페이지 ${cpage}: ${dbList.length}건 처리`);
    }

    if (dbList.length < PAGE_SIZE) break;
    cpage++;
  }

  console.log(`[venue] 수집 완료: 총 ${totalCount}건`);
}
