"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

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
}

export default function RegionPerformancePanel() {
  const [areas, setAreas] = useState<CodeEntry[]>([]);
  const [cates, setCates] = useState<CodeEntry[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedCate, setSelectedCate] = useState<string>("");
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [crdt, setCrdt] = useState<string | null>(null);
  const [codesLoading, setCodesLoading] = useState(true);
  const [rankLoading, setRankLoading] = useState(false);

  // 지역·장르 코드 초기 로드
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

  // 선택 변경 시 순위 조회
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

  return (
    <aside className="absolute right-0 top-0 z-[9] h-full w-64 border-l border-border bg-background shadow-xl">
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
                      className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/50"
                    >
                      {/* 순위 배지 */}
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          item.rank <= 3
                            ? "bg-violet-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.rank}
                      </span>
                      {/* 공연 정보 */}
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
    </aside>
  );
}
