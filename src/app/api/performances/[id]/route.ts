import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { PerformanceDetail, CastingPairMember, ApiResponse, Category } from "@/types";

/**
 * GET /api/performances/:id
 * 공연 상세 정보 반환
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
      description: string | null;
      runtime: number | null;
      ageLimit: string | null;
      Venue: {
        id: string;
        name: string;
        address: string;
        latitude: number;
        longitude: number;
      };
      CastingPair: {
        id: string;
        members: unknown;
        scheduleDates: string[];
        note: string | null;
        createdAt: string;
      }[];
      Ticketing: {
        id: string;
        openAt: string;
        platform: string;
        url: string | null;
        ticketType: string | null;
        note: string | null;
      }[];
    };

    const { data, error } = await supabase
      .from("Performance")
      .select(`
        id, title, category, status, posterUrl, startDate, endDate,
        price, description, runtime, ageLimit,
        Venue!inner(id, name, address, latitude, longitude),
        CastingPair(id, members, scheduleDates, note, createdAt),
        Ticketing(id, openAt, platform, url, ticketType, note)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json<ApiResponse<null>>(
          { data: null, error: "공연을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      throw error;
    }

    const p = data as unknown as RawRow;

    const result: PerformanceDetail = {
      id: p.id,
      title: p.title,
      category: p.category as Category,
      status: p.status as PerformanceDetail["status"],
      posterUrl: p.posterUrl,
      startDate: p.startDate,
      endDate: p.endDate,
      venueName: p.Venue.name,
      price: p.price,
      description: p.description,
      runtime: p.runtime,
      ageLimit: p.ageLimit,
      venue: {
        id: p.Venue.id,
        name: p.Venue.name,
        address: p.Venue.address,
        latitude: parseFloat(String(p.Venue.latitude)),
        longitude: parseFloat(String(p.Venue.longitude)),
      },
      castingPairs: [...p.CastingPair]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((cp) => ({
          id: cp.id,
          members: cp.members as unknown as CastingPairMember[],
          scheduleDates: cp.scheduleDates,
          note: cp.note,
        })),
      ticketings: [...p.Ticketing]
        .sort((a, b) => new Date(a.openAt).getTime() - new Date(b.openAt).getTime())
        .map((t) => ({
          id: t.id,
          openAt: t.openAt,
          platform: t.platform,
          url: t.url,
          ticketType: t.ticketType,
          note: t.note,
        })),
    };

    return NextResponse.json<ApiResponse<PerformanceDetail>>({ data: result });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
