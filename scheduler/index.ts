import 'dotenv/config';
import cron from 'node-cron';
import { collectVenues } from './apis/venue.js';
import { collectVenueDetails } from './apis/venueDetail.js';
import { collectPrfm } from './apis/prfm.js';
import { collectPrfmDetails } from './apis/prfmDetail.js';
import { collectRanking } from './apis/ranking.js';

async function runVenueJob(): Promise<void> {
  console.log('[scheduler] ===== 공연시설 수집 시작 =====');
  try {
    await collectVenues();
    await collectVenueDetails();
    console.log('[scheduler] ===== 공연시설 수집 완료 =====');
  } catch (err) {
    console.error('[scheduler] 공연시설 수집 중 예외 발생:', (err as Error).message);
  }
}

async function runPrfmJob(): Promise<void> {
  console.log('[scheduler] ===== 공연 데이터 수집 시작 =====');
  try {
    await collectPrfm();
    await collectPrfmDetails();
    console.log('[scheduler] ===== 공연 데이터 수집 완료 =====');
  } catch (err) {
    console.error('[scheduler] 공연 데이터 수집 중 예외 발생:', (err as Error).message);
  }
}

// 매주 월요일 새벽 3시 (Asia/Seoul 기준)
cron.schedule('0 3 * * 1', runVenueJob, {
  timezone: 'Asia/Seoul',
});

// 매일 새벽 4시 (Asia/Seoul 기준)
cron.schedule('0 4 * * *', runPrfmJob, {
  timezone: 'Asia/Seoul',
});

async function runRankingJob(): Promise<void> {
  console.log('[scheduler] ===== 공연 순위 수집 시작 =====');
  try {
    await collectRanking();
    console.log('[scheduler] ===== 공연 순위 수집 완료 =====');
  } catch (err) {
    console.error('[scheduler] 공연 순위 수집 중 예외 발생:', (err as Error).message);
  }
}

// 매일 새벽 5시 (Asia/Seoul 기준)
cron.schedule('0 5 * * *', runRankingJob, {
  timezone: 'Asia/Seoul',
});

console.log('[scheduler] 스케줄러 등록 완료 (공연시설: 매주 월요일 03:00 KST / 공연: 매일 04:00 KST / 순위: 매일 05:00 KST)');
