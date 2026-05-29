import { NextRequest, NextResponse } from "next/server";
import type { Category, PerformanceStatus } from "@/types";
import {
  fetchPerformanceList,
  fetchPerformanceDetail,
  fetchVenueDetail,
  genreToCategory,
  prfstateToStatus,
  parseKopisDate,
  parseRuntime,
} from "@/lib/kopis";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/sync
 * KOPIS 공연 데이터를 DB에 upsert하는 스케줄러 엔드포인트
 *
 * Authorization: Bearer {CRON_SECRET} 헤더 필요
 *
 * Query params:
 *   - days: 오늘부터 몇 일 후까지 조회할지 (기본 60)
 *   - state: 공연상태 코드 (01=예정, 02=공연중, 03=완료 / 기본 "01,02")
 */
export async function POST(req: NextRequest) {
  // ── 인증 ──────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const days = parseInt(searchParams.get("days") ?? "60", 10);
  const states = (searchParams.get("state") ?? "01,02").split(",");

  const yyyymmdd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const today = new Date();
  const queryEndDate = new Date(today);
  queryEndDate.setDate(queryEndDate.getDate() + days);

  const stats = { venues: 0, performances: 0, errors: 0 };

  try {
    // ── 1. 공연 목록 수집 (여러 상태 병렬 조회) ──
    const listResults = await Promise.allSettled(
      states.map((prfstate) =>
        fetchPerformanceList({
          stdate: yyyymmdd(today),
          eddate: yyyymmdd(queryEndDate),
          prfstate: prfstate.trim(),
          rows: 1000,
        })
      )
    );

    const allItems = listResults.flatMap((r) =>
      r.status === "fulfilled" ? r.value : []
    );

    // mt20id 기준 중복 제거
    const uniqueItems = Array.from(
      new Map(allItems.map((item) => [item.mt20id, item])).values()
    );

    console.log(`[sync] 수집된 공연 수: ${uniqueItems.length}`);

    // ── 2. 공연장 upsert (중복 없이 먼저 처리) ──
    const venueIds = [...new Set(uniqueItems.map((i) => i.mt10id).filter(Boolean))];
    const venueKopisIdMap = new Map<string, string>(); // kopisId → DB id

    await Promise.allSettled(
      venueIds.map(async (mt10id) => {
        try {
          // DB에 이미 있으면 스킵
          const { data: existing } = await supabase
            .from("venue")
            .select("id")
            .eq("kopisId", mt10id)
            .maybeSingle();

          if (existing) {
            venueKopisIdMap.set(mt10id, existing.id);
            return;
          }

          const detail = await fetchVenueDetail(mt10id);
          if (!detail || !detail.la || !detail.lo) return;

          const { data: venue, error } = await supabase
            .from("venue")
            .upsert(
              {
                kopisId: mt10id,
                name: detail.fcltynm,
                address: detail.adres,
                sido: detail.sidonm,
                sigungu: detail.gugunnm || null,
                latitude: parseFloat(detail.la),
                longitude: parseFloat(detail.lo),
              },
              { onConflict: "kopisId" }
            )
            .select("id")
            .single();

          if (error) throw error;
          venueKopisIdMap.set(mt10id, venue.id);
          stats.venues++;
        } catch (e) {
          console.error(`[sync] venue upsert 실패 (${mt10id}):`, e);
          stats.errors++;
        }
      })
    );

    // ── 3. 공연 upsert ──
    await Promise.allSettled(
      uniqueItems.map(async (item) => {
        const venueId = venueKopisIdMap.get(item.mt10id);
        if (!venueId) return; // 공연장 처리 실패한 경우 스킵

        try {
          // 상세 정보 조회 (소개글, 러닝타임, 가격 등)
          const detail = await fetchPerformanceDetail(item.mt20id);

          const startDate = parseKopisDate(item.prfpdfrom);
          const endDate = parseKopisDate(item.prfpdto);
          const category = genreToCategory(item.genrenm) as Category;
          const status = prfstateToStatus(item.prfstate) as PerformanceStatus;

          const performanceData = {
            kopisId: item.mt20id,
            title: item.prfnm,
            category,
            status,
            posterUrl: item.poster || null,
            startDate,
            endDate,
            venueId,
            description: detail?.sty || null,
            runtime: detail ? parseRuntime(detail.prfruntime) : null,
            ageLimit: detail?.prfage || null,
            price: detail?.pcseguidance || null,
          };

          const { error } = await supabase
            .from("Performance")
            .upsert(performanceData, { onConflict: "kopisId" });

          if (error) throw error;
          stats.performances++;
        } catch (e) {
          console.error(`[sync] performance upsert 실패 (${item.mt20id}):`, e);
          stats.errors++;
        }
      })
    );

    // ── 4. 종료된 공연 상태 업데이트 ──
    const { data: endedRows, error: updateError } = await supabase
      .from("Performance")
      .update({ status: "ENDED" })
      .eq("status", "ONGOING")
      .lt("endDate", today.toISOString().slice(0, 10))
      .select("id");

    if (updateError) throw updateError;
    const endedCount = endedRows?.length ?? 0;

    console.log(`[sync] 완료 — venues: ${stats.venues}, performances: ${stats.performances}, errors: ${stats.errors}, ended: ${endedCount}`);

    return NextResponse.json({
      ok: true,
      stats: { ...stats, ended: endedCount },
    });
  } catch (err) {
    console.error("[sync] 치명적 오류:", err);
    return NextResponse.json({ error: "동기화 실패", detail: String(err) }, { status: 500 });
  }
}
