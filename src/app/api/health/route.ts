import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

async function runTest(label: string, fn: () => Promise<unknown>) {
  try {
    const result = await fn();
    return { label, ok: true, result };
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    return { label, ok: false, error: `${err?.code ?? "?"}: ${err?.message ?? String(e)}` };
  }
}

export async function GET() {
  const tests = await Promise.all([
    // 1. HEAD + select * (헬스체크 기존 방식)
    runTest("venuedetail HEAD select=*", async () => {
      const { count, error } = await supabase
        .from("venuedetail")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return { rowCount: count };
    }),

    // 2. GET + select * (필터 없음) — GET 방식 자체가 문제인지 확인
    runTest("venuedetail GET select=*", async () => {
      const { data, error } = await supabase
        .from("venuedetail")
        .select("*")
        .limit(1);
      if (error) throw error;
      return { rows: data?.length };
    }),

    // 3. GET + 특정 컬럼 (필터 없음) — %2C 인코딩 문제 확인
    runTest("venuedetail GET select=venueid,la,lo", async () => {
      const { data, error } = await supabase
        .from("venuedetail")
        .select("venueid,la,lo")
        .limit(1);
      if (error) throw error;
      return { rows: data?.length, sample: data?.[0] };
    }),

    // 4. GET + select * + 범위 필터 — 필터 자체가 문제인지 확인
    runTest("venuedetail GET select=* with gte/lte filters", async () => {
      const { data, error } = await supabase
        .from("venuedetail")
        .select("*")
        .gte("la", 33)
        .lte("la", 40)
        .gte("lo", 123)
        .lte("lo", 133)
        .limit(1);
      if (error) throw error;
      return { rows: data?.length };
    }),

    // 5. GET + 특정 컬럼 + 범위 필터 — 실제 venues 쿼리와 동일
    runTest("venuedetail GET select=venueid,la,lo with gte/lte filters", async () => {
      const { data, error } = await supabase
        .from("venuedetail")
        .select("venueid,la,lo")
        .gte("la", 33)
        .lte("la", 40)
        .gte("lo", 123)
        .lte("lo", 133)
        .limit(1);
      if (error) throw error;
      return { rows: data?.length, sample: data?.[0] };
    }),
  ]);

  const ok = tests.every((t) => t.ok);

  return NextResponse.json(
    { ok, timestamp: new Date().toISOString(), tests },
    { status: ok ? 200 : 503 }
  );
}
