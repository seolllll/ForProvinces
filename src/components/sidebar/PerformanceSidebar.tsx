"use client";

import { useEffect, useState } from "react";
import { X, Loader2, MapPin, ImageOff } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { cn } from "@/lib/utils";
import type { VenueInfo, VenuePerformance, KopisPrfmFull } from "@/types";
import PerformanceDetail from "./PerformanceDetail";

function PosterFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <ImageOff className="h-6 w-6 text-muted-foreground" />
    </div>
  );
}

function PerformanceItem({
  prfm,
  onClick,
}: {
  prfm: VenuePerformance;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <li
      className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      {/* 포스터 이미지 */}
      <div className="relative h-[110px] w-[78px] shrink-0 overflow-hidden rounded-md bg-muted">
        {prfm.posterurl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prfm.posterurl}
            alt={prfm.prfmnm}
            className="h-full w-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <PosterFallback />
        )}
      </div>

      {/* 공연 정보 */}
      <div className="flex min-w-0 flex-col justify-center gap-1.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {prfm.prfmnm}
        </p>
        {prfm.genrenm && (
          <span className="w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {prfm.genrenm}
          </span>
        )}
        <p className="text-xs text-muted-foreground">
          {prfm.prfmfrom} ~ {prfm.prfmto}
        </p>
      </div>
    </li>
  );
}

export default function PerformanceSidebar() {
  const {
    isSidebarOpen,
    selectedVenueId,
    closeSidebar,
    activeGenres,
    activeStates,
    pendingPrfmId,
    setPendingPrfmId,
  } = useMapStore();

  const [venueInfo, setVenueInfo] = useState<VenueInfo | null>(null);
  const [performances, setPerformances] = useState<VenuePerformance[]>([]);
  const [loading, setLoading] = useState(false);

  // 상세 뷰
  const [selectedPrfm, setSelectedPrfm] = useState<KopisPrfmFull | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 사이드바가 닫히거나 선택 공연장이 바뀌면 상세 초기화
  useEffect(() => {
    setSelectedPrfm(null);
  }, [selectedVenueId, isSidebarOpen]);

  useEffect(() => {
    if (!selectedVenueId) {
      setVenueInfo(null);
      setPerformances([]);
      return;
    }
    setLoading(true);
    setSelectedPrfm(null);

    const genresQ = activeGenres.map((g) => encodeURIComponent(g)).join(",");
    const statesQ = activeStates.map((s) => encodeURIComponent(s)).join(",");
    Promise.all([
      fetch(`/api/venues/${selectedVenueId}`).then((r) => r.json()),
      fetch(
        `/api/venues/${selectedVenueId}/performances?genres=${genresQ}&states=${statesQ}`
      ).then((r) => r.json()),
    ])
      .then(([venueJson, prfmJson]) => {
        setVenueInfo(venueJson.data ?? null);
        setPerformances(prfmJson.data ?? []);
      })
      .finally(() => setLoading(false));
  }, [selectedVenueId, activeGenres, activeStates]);

  // 검색에서 바로 상세 진입 — pendingPrfmId가 세팅되면 자동 로드
  useEffect(() => {
    if (!pendingPrfmId) return;
    handlePrfmClick(pendingPrfmId).then(() => setPendingPrfmId(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrfmId]);

  async function handlePrfmClick(prfmid: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/prfm/${prfmid}`);
      const json = await res.json();
      setSelectedPrfm(json.data ?? null);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <aside
      className={cn(
        "absolute right-0 top-0 z-10 h-full w-96 overflow-y-auto bg-background shadow-xl transition-transform duration-300",
        isSidebarOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* 헤더 */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <h2 className="font-semibold text-foreground">
          {selectedPrfm ? "공연 상세" : "공연장 정보"}
        </h2>
        <button
          onClick={closeSidebar}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4">
        {/* 공연 상세 뷰 */}
        {detailLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : selectedPrfm ? (
          <PerformanceDetail prfm={selectedPrfm} onBack={() => setSelectedPrfm(null)} />
        ) : loading ? (
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
              {venueInfo.adres && (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {venueInfo.adres}
                </p>
              )}
            </div>

            {/* 공연 목록 — 상태별 그룹 */}
            {performances.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                현재 조건에 해당하는 공연이 없습니다.
              </p>
            ) : (
              <div className="flex flex-col gap-5">
                {(
                  [
                    { state: "공연중", label: "진행 중인 공연", dotClass: "bg-green-500" },
                    { state: "공연예정", label: "진행 예정 공연", dotClass: "bg-blue-500" },
                    { state: "공연완료", label: "진행 종료 공연", dotClass: "bg-muted-foreground" },
                  ] as const
                ).map(({ state, label, dotClass }) => {
                  const group = performances.filter((p) => p.state === state);
                  if (group.length === 0) return null;
                  return (
                    <div key={state}>
                      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
                        {label}
                        <span className="text-xs font-normal text-muted-foreground">{group.length}건</span>
                      </p>
                      <ul className="flex flex-col gap-3">
                        {group.map((prfm) => (
                          <PerformanceItem
                            key={prfm.prfmid}
                            prfm={prfm}
                            onClick={() => handlePrfmClick(prfm.prfmid)}
                          />
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
