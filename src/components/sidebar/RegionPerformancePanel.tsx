"use client";

import { useState, useEffect } from "react";
import { Loader2, BarChart2 } from "lucide-react";
import { useMapStore } from "@/store/mapStore";

interface CodeEntry {
  code: string;
  codeNm: string;
}

interface RankingItem {
  rank: number;
  prfmnm: string;
  venuenm: string;
  period: string;
  prfdtcnt: number;
  posterurl: string | null;
  prfmid: string;
  venueid: string | null;
  la: number | null;
  lo: number | null;
  state: string | null;
}

export default function RegionPerformancePanel() {
  const { selectVenue, setZoomTarget, setPendingPrfmId, activeStates, enableState } = useMapStore();
  const [isOpen, setIsOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3000);
    return () => clearTimeout(t);
  }, [toastMsg]);
  const [areas, setAreas] = useState<CodeEntry[]>([]);
  const [cates, setCates] = useState<CodeEntry[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedCate, setSelectedCate] = useState<string>("");
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [crdt, setCrdt] = useState<string | null>(null);
  const [codesLoading, setCodesLoading] = useState(true);
  const [rankLoading, setRankLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/areas").then((r) => r.json()),
      fetch("/api/areas/catecodes").then((r) => r.json()),
    ])
      .then(([areaRes, cateRes]) => {
        const areaList: CodeEntry[] = areaRes.data ?? [];
        const cateList: CodeEntry[] = cateRes.data ?? [];
        setAreas(areaList);
        setCates(cateList);
        if (areaList.length > 0) setSelectedArea(areaList[0].codeNm);
        if (cateList.length > 0) setSelectedCate(cateList[0].code);
      })
      .catch(() => {})
      .finally(() => setCodesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedArea || !selectedCate) return;
    setRankLoading(true);
    setRankings([]);
    fetch(
      `/api/ranking?area=${encodeURIComponent(selectedArea)}&catecode=${encodeURIComponent(selectedCate)}`
    )
      .then((r) => r.json())
      .then((j) => {
        setRankings(j.data ?? []);
        setCrdt(j.crdt ?? null);
      })
      .catch(() => setRankings([]))
      .finally(() => setRankLoading(false));
  }, [selectedArea, selectedCate]);

  const panelContent = (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">지역별 공연 순위</h2>
        {crdt && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">기준일: {crdt}</p>
        )}
      </div>

      {codesLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* 지역·장르 선택 */}
          <div className="flex flex-col gap-2 border-b border-border p-3">
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {areas.map((a) => (
                <option key={a.code} value={a.codeNm}>
                  {a.codeNm}
                </option>
              ))}
            </select>
            <select
              value={selectedCate}
              onChange={(e) => setSelectedCate(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {cates.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.codeNm}
                </option>
              ))}
            </select>
          </div>

          {/* 순위 목록 */}
          <div className="flex-1 overflow-y-auto">
            {rankLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : rankings.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                해당 조건의 순위 데이터가 없습니다.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {rankings.map((item) => (
                  <li
                    key={`${item.prfmid}-${item.rank}`}
                    className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5 hover:bg-muted/50"
                    onClick={() => {
                      if (item.state && !activeStates.includes(item.state)) {
                        enableState(item.state);
                        setToastMsg(`'${item.state}' 필터가 선택되었습니다`);
                      }
                      if (item.venueid && item.la !== null && item.lo !== null) {
                        setZoomTarget({ lat: item.la, lng: item.lo, level: 4 });
                        selectVenue(item.venueid);
                      }
                      setPendingPrfmId(item.prfmid);
                    }}
                  >
                    <span
                      className={`w-4 shrink-0 text-center text-xs font-bold ${
                        item.rank <= 3 ? "text-purple-600" : "text-muted-foreground"
                      }`}
                    >
                      {item.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {item.prfmnm}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {item.venuenm}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{item.period}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {toastMsg && (
        <div className="fixed left-1/2 top-20 z-[100] -translate-x-1/2 rounded-lg bg-gray-900/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
          {toastMsg}
        </div>
      )}

      {/* 모바일: 우하단 플로팅 버튼 */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-20 right-4 z-[9] flex items-center justify-center rounded-full border border-border bg-background p-2.5 shadow-lg transition-colors hover:bg-muted sm:hidden"
      >
        <BarChart2 className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* 모바일: 배경 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[8] bg-black/20 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* sm+: 우측 세로 탭 버튼 */}
      <div className="absolute right-0 top-0 z-[9] hidden h-full sm:flex">
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="self-center flex flex-col items-center gap-1 rounded-l-md border border-r-0 border-border bg-background px-1.5 py-3 shadow-md transition-colors hover:bg-muted"
        >
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground [writing-mode:vertical-rl]">지역별 순위</span>
        </button>
      </div>

      {/* 패널 본체 — 모바일: 하단 sheet / sm+: 우측 패널 */}
      {isOpen && (
        <aside className="fixed bottom-0 left-0 right-0 z-[9] h-[60vh] overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-xl sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:w-64 sm:rounded-none sm:border-l sm:border-t-0">
          {panelContent}
        </aside>
      )}
    </>
  );
}
