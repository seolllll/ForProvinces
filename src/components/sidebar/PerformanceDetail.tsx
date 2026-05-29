"use client";

import Image from "next/image";
import { ArrowLeft, Calendar, Clock, MapPin, Ticket, Users } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { CATEGORY_LABEL } from "@/types";
import type { PerformanceDetail } from "@/types";

interface Props {
  performance: PerformanceDetail;
  onBack: () => void;
}

export default function PerformanceDetailView({ performance: p, onBack }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* 뒤로가기 */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        목록으로
      </button>

      {/* 포스터 + 기본 정보 */}
      <div className="flex gap-4">
        <div className="relative h-44 w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
          {p.posterUrl ? (
            <Image src={p.posterUrl} alt={p.title} fill className="object-cover" sizes="128px" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No Image
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <span className="w-fit rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
            {CATEGORY_LABEL[p.category]}
          </span>
          <h2 className="font-bold text-foreground leading-tight">{p.title}</h2>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{p.venue.address}</span>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{formatDate(p.startDate)} ~ {formatDate(p.endDate)}</span>
          </div>

          {p.runtime && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>러닝타임 {p.runtime}분</span>
            </div>
          )}

          {p.price && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Ticket className="h-4 w-4 shrink-0" />
              <span>{p.price}</span>
            </div>
          )}

          {p.ageLimit && (
            <span className="w-fit rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
              {p.ageLimit}
            </span>
          )}
        </div>
      </div>

      {/* 예매 일정 */}
      {p.ticketings.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 font-semibold text-foreground">
            <Ticket className="h-4 w-4 text-primary" />
            예매 일정
          </h3>
          <ul className="flex flex-col gap-2">
            {p.ticketings.map((t) => (
              <li key={t.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{t.platform}</span>
                  {t.ticketType && (
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {t.ticketType}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDateTime(t.openAt)} 오픈
                </p>
                {t.note && <p className="mt-1 text-xs text-muted-foreground">{t.note}</p>}
                {t.url && (
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-primary underline underline-offset-2"
                  >
                    예매하러 가기 →
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 캐스팅 페어 */}
      {p.castingPairs.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 font-semibold text-foreground">
            <Users className="h-4 w-4 text-primary" />
            캐스팅 페어
          </h3>
          <ul className="flex flex-col gap-2">
            {p.castingPairs.map((pair) => (
              <li key={pair.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex flex-wrap gap-2">
                  {pair.members.map((m) => (
                    <div key={m.actorId} className="text-sm">
                      <span className="text-muted-foreground">{m.roleName}</span>
                      {" "}
                      <span className="font-medium">{m.actorName}</span>
                    </div>
                  ))}
                </div>
                {pair.scheduleDates.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    출연일: {pair.scheduleDates.slice(0, 3).join(", ")}
                    {pair.scheduleDates.length > 3 && ` 외 ${pair.scheduleDates.length - 3}회`}
                  </p>
                )}
                {pair.note && (
                  <p className="mt-1 text-xs text-muted-foreground">{pair.note}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 공연 소개 */}
      {p.description && (
        <section>
          <h3 className="mb-2 font-semibold text-foreground">공연 소개</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {p.description}
          </p>
        </section>
      )}
    </div>
  );
}
