import { parseXml } from '../utils/xmlParser.js';
import { fetchKopis } from '../utils/fetchKopis.js';
import { mapPrfmDetail } from '../mappers/prfmDetailMapper.js';
import supabase from '../utils/supabase.js';
import { delay } from '../utils/delay.js';
import type { KopisPrfmDetailDb } from '../types/prfm.js';

interface ParsedPrfmDetailResponse {
  dbs?: { db?: KopisPrfmDetailDb };
}

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
      console.error(`[prfmDetail] ${table} 조회 오류:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;

    ids.push(...(data as unknown as Array<Record<string, unknown>>).map((row) => String(row[column])));
    if (data.length < BATCH) break;
    from += BATCH;
  }

  return ids;
}

async function getTargetPrfmIds(): Promise<string[]> {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  // 조건 1: 오늘 upsert된 공연
  const { data: todayPrfm, error: e1 } = await supabase
    .from('prfm')
    .select('prfmid')
    .gte('crdt', `${today}T00:00:00.000Z`)
    .lt('crdt', `${tomorrow}T00:00:00.000Z`);

  if (e1) console.error('[prfmDetail] 오늘 신규 조회 오류:', e1.message);

  // 조건 2: 상세 미수집 공연 (전체 페이지네이션)
  const [allIds, detailedIds] = await Promise.all([
    fetchAllColumnValues('prfm', 'prfmid'),
    fetchAllColumnValues('prfmdetail', 'prfmid'),
  ]);

  const detailedSet = new Set(detailedIds);
  const missingIds = allIds.filter((id) => !detailedSet.has(id));

  console.log(
    `[prfmDetail] prfm 전체: ${allIds.length}건, 수집완료: ${detailedIds.length}건, 미수집: ${missingIds.length}건`
  );

  const merged = new Set([
    ...(todayPrfm ?? []).map((v: { prfmid: string }) => v.prfmid),
    ...missingIds,
  ]);

  return [...merged];
}

export async function collectPrfmDetails(): Promise<void> {
  console.log('[prfmDetail] 수집 대상 조회 중...');
  const prfmIds = await getTargetPrfmIds();
  console.log(`[prfmDetail] 수집 대상: ${prfmIds.length}건`);

  let successCount = 0;

  for (const prfmid of prfmIds) {
    try {
      const url = `${process.env.KOPIS_BASE_URL}/${prfmid}?service=${process.env.KOPIS_API_KEY}`;
      const xml = await fetchKopis(url);
      const parsed = (await parseXml(xml)) as ParsedPrfmDetailResponse;

      const db = parsed?.dbs?.db;
      if (!db) throw new Error('응답 데이터 없음');

      const detailRow = mapPrfmDetail(db);
      const { error } = await supabase
        .from('prfmdetail')
        .upsert([detailRow], { onConflict: 'prfmid' });

      if (error) throw new Error(`prfmdetail upsert 오류: ${error.message}`);

      successCount++;
    } catch (err) {
      console.error(`[prfmDetail] ${prfmid} 처리 실패:`, (err as Error).message);
    }

    await delay(100);
  }

  console.log(`[prfmDetail] 완료: ${successCount}/${prfmIds.length}건 성공`);
}
