import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { PerformanceSummary, ApiResponse, Category } from "@/types";

/**
 * GET /api/performances?venueId=&categories=THEATER,MUSICAL&status=ONGOING
 * 특정 공연장의 공연 목록 반환
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const venueId = searchParams.get("venueId");
  if (!venueId) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "venueId가 필요합니다." },
      { status: 400 }
    );
  }

  const categories = (searchParams.get("categories") ?? "")
    .split(",")
    .filter(Boolean) as Category[];

  const statusParam = searchParams.get("status");
  const statusFilter =
    statusParam === "UPCOMING" || statusParam === "ONGOING" || statusParam === "ENDED"
      ? statusParam
      : undefined;

  try {
    type RawRow = {
      id: string;
      title: string;
      category: string;
      status: string;
      posterUrl: string | null;
      startDate: string;
      endDate: string;
      price: string | null;
      Venue: { name: string };
    };

    let query = supabase
      .from("Performance")
      .select("id, title, category, status, posterUrl, startDate, endDate, price, Venue(name)")
      .eq("venueId", venueId)
      .order("startDate", { ascending: true });

    if (categories.length > 0) query = query.in("category", categories);
    if (statusFilter) query = query.eq("status", statusFilter);

    const { data, error } = await query;
    if (error) throw error;

    const result: PerformanceSummary[] = ((data ?? []) as unknown as RawRow[]).map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category as Category,
      status: p.status as PerformanceSummary["status"],
      posterUrl: p.posterUrl,
      startDate: p.startDate,
      endDate: p.endDate,
      venueName: p.Venue.name,
      price: p.price,
    }));

    return NextResponse.json<ApiResponse<PerformanceSummary[]>>({ data: result });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
