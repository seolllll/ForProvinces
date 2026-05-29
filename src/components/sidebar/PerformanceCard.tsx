"use client";

import Image from "next/image";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { CATEGORY_LABEL } from "@/types";
import type { PerformanceSummary } from "@/types";

const STATUS_STYLE: Record<PerformanceSummary["status"], string> = {
  UPCOMING: "bg-blue-100 text-blue-700",
  ONGOING: "bg-green-100 text-green-700",
  ENDED: "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<PerformanceSummary["status"], string> = {
  UPCOMING: "공연 예정",
  ONGOING: "공연 중",
  ENDED: "공연 종료",
};

interface Props {
  performance: PerformanceSummary;
  onClick: () => void;
}

export default function PerformanceCard({ performance: p, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex w-full gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
    >
      {/* 포스터 */}
      <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
        {p.posterUrl ? (
          <Image src={p.posterUrl} alt={p.title} fill className="object-cover" sizes="64px" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No Image
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", STATUS_STYLE[p.status])}>
            {STATUS_LABEL[p.status]}
          </span>
          <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
            {CATEGORY_LABEL[p.category]}
          </span>
        </div>

        <p className="truncate font-semibold text-foreground">{p.title}</p>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{p.venueName}</span>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>
            {formatDate(p.startDate)} ~ {formatDate(p.endDate)}
          </span>
        </div>

        {p.price && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Ticket className="h-3 w-3 shrink-0" />
            <span className="truncate">{p.price}</span>
          </div>
        )}
      </div>
    </button>
  );
}
