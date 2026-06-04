"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ImageOff,
  Ticket,
  Users,
  Building2,
  Star,
  ExternalLink,
} from "lucide-react";
import type { KopisPrfmFull } from "@/types";

interface Props {
  prfm: KopisPrfmFull;
  onBack: () => void;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-border last:border-0">
      <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-xs text-foreground break-words">{value}</span>
    </div>
  );
}

function Badge({ text, variant = "default" }: { text: string; variant?: "default" | "state" | "tag" }) {
  const styles = {
    default: "bg-primary/10 text-primary",
    state: "bg-green-100 text-green-700",
    tag: "bg-secondary text-secondary-foreground",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {text}
    </span>
  );
}

export default function PerformanceDetail({ prfm, onBack }: Props) {
  const [imgError, setImgError] = useState(false);


  // 특이사항 태그
  const tags: string[] = [
    prfm.visit === "Y" && "내한공연",
    prfm.child === "Y" && "어린이공연",
    prfm.daehakro === "Y" && "대학로",
    prfm.openrun === "Y" && "오픈런",
    prfm.festival === "Y" && "축제",
  ].filter((v): v is string => !!v);

  return (
    <div className="flex flex-col gap-0">
      {/* 뒤로가기 */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-1 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        목록으로
      </button>

      {/* 포스터 */}
      <div className="relative w-full aspect-[3/4] max-h-72 overflow-hidden rounded-xl bg-muted mb-4">
        {prfm.posterurl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prfm.posterurl}
            alt={prfm.prfmnm}
            className="h-full w-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* 제목 + 배지 */}
      <div className="flex flex-col gap-2 mb-4">
        <h2 className="text-base font-bold leading-snug text-foreground">{prfm.prfmnm}</h2>
        <div className="flex flex-wrap gap-1.5">
          {prfm.genrenm && <Badge text={prfm.genrenm} variant="default" />}
          {prfm.state && (
            <Badge
              text={prfm.state}
              variant={prfm.state === "공연중" ? "state" : "tag"}
            />
          )}
          {tags.map((tag) => (
            <Badge key={tag} text={tag} variant="tag" />
          ))}
        </div>
      </div>

      {/* 기본 정보 */}
      <section className="mb-4 rounded-xl border border-border bg-card px-4 py-1">
        {prfm.prfmfrom && prfm.prfmto && (
          <InfoRow
            label="공연기간"
            value={`${prfm.prfmfrom} ~ ${prfm.prfmto}`}
          />
        )}
        {prfm.runtime && (
          <InfoRow label="공연시간" value={prfm.runtime} />
        )}
        {prfm.viewage && (
          <InfoRow label="관람연령" value={prfm.viewage} />
        )}
        {prfm.venuenm && (
          <InfoRow label="공연장" value={prfm.venuenm} />
        )}
      </section>

      {/* 캐스팅 */}
      {prfm.prfmcast && (
        <section className="mb-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-primary" />
            출연진
          </h3>
          <p className="rounded-xl border border-border bg-card px-4 py-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
            {prfm.prfmcast}
          </p>
        </section>
      )}

      {/* 티켓 가격 */}
      {prfm.pcseguidance && (
        <section className="mb-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Ticket className="h-4 w-4 text-primary" />
            티켓 가격
          </h3>
          <p className="rounded-xl border border-border bg-card px-4 py-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
            {prfm.pcseguidance}
          </p>
        </section>
      )}

      {/* 제작사 */}
      {prfm.entrpsnm && (
        <section className="mb-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            제작사
          </h3>
          <p className="rounded-xl border border-border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            {prfm.entrpsnm}
          </p>
        </section>
      )}

      {/* 예매처 링크 */}
      {prfm.relates && prfm.relates.length > 0 && (
        <section className="mb-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Star className="h-4 w-4 text-primary" />
            예매처
          </h3>
          <div className="flex flex-col gap-2">
            {prfm.relates.map((r, i) => (
              <a
                key={i}
                href={r.relateurl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <span>{r.relatenm}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
