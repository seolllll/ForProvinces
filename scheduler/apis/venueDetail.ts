import { parseXml } from '../utils/xmlParser.js';
import { fetchKopis } from '../utils/fetchKopis.js';
import { mapVenueDetail } from '../mappers/venueDetailMapper.js';
import { mapTheatres } from '../mappers/theatreMapper.js';
import supabase from '../utils/supabase.js';
import { delay } from '../utils/delay.js';
import type { KopisVenueDetailDb } from '../types.js';

interface ParsedVenueDetailResponse {
  dbs?: { db?: KopisVenueDetailDb };
}

// Supabase 기본 1000행 상한을 우회하여 전체 행을 페이지네이션으로 수집
async function fetchAllColumnValues(table: string, column: string): Promise<string[]> {
  const ids: string[] = [];
  const BATCH = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .range(from, from + BATCH - 1);

    if (error) {
      console.error(`[venueDetail] ${table} 조회 오류:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;

    ids.push(...(data as unknown as Array<Record<string, unknown>>).map((row) => String(row[column])));
    if (data.length < BATCH) break;
    from += BATCH;
  }

  return ids;
}

async function getTargetVenueIds(): Promise<string[]> {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  // 조건 1: 오늘 신규 적재된 시설 (건수가 많지 않으므로 단건 조회)
  const { data: todayVenues, error: e1 } = await supabase
    .from('venue')
    .select('venueid')
    .gte('crdt', `${today}T00:00:00.000Z`)
    .lt('crdt', `${tomorrow}T00:00:00.000Z`);

  if (e1) console.error('[venueDetail] 오늘 신규 조회 오류:', e1.message);

  // 조건 2: 상세 미수집 시설 — 전체 페이지네이션으로 수집
  const [allIds, detailedIds] = await Promise.all([
    fetchAllColumnValues('venue', 'venueid'),
    fetchAllColumnValues('venuedetail', 'venueid'),
  ]);

  const detailedSet = new Set(detailedIds);
  const missingIds = allIds.filter((id) => !detailedSet.has(id));

  console.log(
    `[venueDetail] venue 전체: ${allIds.length}건, 수집완료: ${detailedIds.length}건, 미수집: ${missingIds.length}건`
  );

  const merged = new Set([
    ...(todayVenues ?? []).map((v: { venueid: string }) => v.venueid),
    ...missingIds,
  ]);

  return [...merged];
}

export async function collectVenueDetails(): Promise<void> {
  console.log('[venueDetail] 수집 대상 조회 중...');
  const venueIds = await getTargetVenueIds();
  console.log(`[venueDetail] 수집 대상: ${venueIds.length}건`);

  let successCount = 0;

  for (const venueid of venueIds) {
    try {
      const url = `${process.env.KOPIS_VENUE_URL}/${venueid}?service=${process.env.KOPIS_API_KEY}`;
      const xml = await fetchKopis(url);
      const parsed = (await parseXml(xml)) as ParsedVenueDetailResponse;

      const db = parsed?.dbs?.db;
      if (!db) throw new Error('응답 데이터 없음');

      const detailRow = mapVenueDetail(db);
      const { error: detailError } = await supabase
        .from('venuedetail')
        .upsert([detailRow], { onConflict: 'venueid' });

      if (detailError) throw new Error(`venuedetail upsert 오류: ${detailError.message}`);

      const theatreRows = mapTheatres(db);
      const { error: theatreError } = await supabase
        .from('theatre')
        .upsert(theatreRows, { onConflict: 'theatreid' });

      if (theatreError) throw new Error(`theatre upsert 오류: ${theatreError.message}`);

      successCount++;
    } catch (err) {
      console.error(`[venueDetail] ${venueid} 처리 실패:`, (err as Error).message);
    }

    await delay(100);
  }

  console.log(`[venueDetail] 완료: ${successCount}/${venueIds.length}건 성공`);
}
