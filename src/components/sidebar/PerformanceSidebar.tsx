"use client";

import { useEffect, useState } from "react";
import { X, Loader2, MapPin, Calendar, Users, Mic2 } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { cn } from "@/lib/utils";
import type { VenueInfo } from "@/types";

function StageTag({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      {label}
    </span>
  );
}

function stageTypes(t: VenueInfo["theatres"][0]): string[] {
  const labels: string[] = [];
  if (t.stageorchat === "Y") labels.push("오케스트라");
  if (t.stagepracat === "Y") labels.push("프로세니엄");
  if (t.stagedresat === "Y") labels.push("드레서");
  if (t.stageoutdrat === "Y") labels.push("야외");
  return labels;
}

export default function PerformanceSidebar() {
  const { isSidebarOpen, selectedVenueId, closeSidebar } = useMapStore();

  const [venueInfo, setVenueInfo] = useState<VenueInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedVenueId) {
      setVenueInfo(null);
      return;
    }
    setLoading(true);

    fetch(`/api/venues/${selectedVenueId}`)
      .then((r) => r.json())
      .then((json) => setVenueInfo(json.data ?? null))
      .finally(() => setLoading(false));
  }, [selectedVenueId]);

  return (
    <aside
      className={cn(
        "absolute right-0 top-0 z-10 h-full w-96 overflow-y-auto bg-background shadow-xl transition-transform duration-300",
        isSidebarOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* 헤더 */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <h2 className="font-semibold text-foreground">공연장 정보</h2>
        <button
          onClick={closeSidebar}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !venueInfo ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            공연장 정보를 찾을 수 없습니다.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {/* 공연장명 + 지역 */}
            <div>
              <h3 className="text-lg font-bold text-foreground">{venueInfo.venuenm}</h3>
              {(venueInfo.sidonm || venueInfo.gugunnm) && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {[venueInfo.sidonm, venueInfo.gugunnm].filter(Boolean).join(" ")}
                </p>
              )}
            </div>

            {/* 기본 정보 */}
            <ul className="flex flex-col gap-2">
              {venueInfo.adres && (
                <li className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-foreground">{venueInfo.adres}</span>
                </li>
              )}
              {venueInfo.opende && (
                <li className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-foreground">개관 {venueInfo.opende}</span>
                </li>
              )}
              {venueInfo.seatscale && (
                <li className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-foreground">총 {venueInfo.seatscale}석</span>
                </li>
              )}
            </ul>

            {/* 공연홀 목록 */}
            {venueInfo.theatres.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Mic2 className="h-4 w-4" />
                  공연홀 ({venueInfo.theatres.length}개)
                </div>
                <ul className="flex flex-col gap-3">
                  {venueInfo.theatres.map((t) => {
                    const stages = stageTypes(t);
                    return (
                      <li
                        key={t.theatreid}
                        className="rounded-lg border border-border p-3"
                      >
                        <p className="font-medium text-foreground">{t.theatrenm}</p>
                        {t.seatscale && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {t.seatscale}석
                          </p>
                        )}
                        {stages.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {stages.map((s) => (
                              <StageTag key={s} label={s} />
                            ))}
                          </div>
                        )}
                        {t.disabledseatsacle && t.disabledseatsacle !== "0" && (
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            장애인석 {t.disabledseatsacle}석
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
