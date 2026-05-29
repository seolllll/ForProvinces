import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Database 스키마 타입을 별도로 생성하지 않는 경우 any로 설정하여
// from() 호출 시 row 타입이 never로 추론되는 문제 방지
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>;

const globalForSupabase = globalThis as unknown as { supabase: AnyClient };

export const supabase: AnyClient = (
  globalForSupabase.supabase ??
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
) as unknown as AnyClient;

if (process.env.NODE_ENV !== "production") globalForSupabase.supabase = supabase;
