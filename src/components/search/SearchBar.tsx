"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, MapPin } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types";

const STATE_COLOR: Record<string, string> = {
  "공연중": "bg-green-500",
  "공연예정": "bg-blue-500",
  "공연완료": "bg-gray-400",
};

export default function SearchBar({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { selectVenue, setZoomTarget, setPendingPrfmId, activeGenres, enableGenre, activeStates } = useMapStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string, states: string[]) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const statesQ = states.map((s) => encodeURIComponent(s)).join(",");
      const res = await fetch(
        `/api/prfm/search?q=${encodeURIComponent(q.trim())}&states=${statesQ}`
      );
      const json = await res.json();
      setResults(json.data ?? []);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const searchStates = ["공연중", "공연예정", ...(activeStates.includes("공연완료") ? ["공연완료"] : [])];
    debounceRef.current = setTimeout(() => search(query, searchStates), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, activeStates, search]);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(result: SearchResult) {
    if (result.genrenm && !activeGenres.includes(result.genrenm)) {
      enableGenre(result.genrenm);
      setToastMsg(`'${result.genrenm}' 필터가 선택되었습니다`);
    }
    setZoomTarget({ lat: result.la, lng: result.lo, level: 4 });
    setPendingPrfmId(result.prfmid);
    selectVenue(result.venueid);
    setQuery(result.prfmnm);
    setIsOpen(false);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }

  return (
    <>
    {toastMsg && (
      <div className="fixed left-1/2 top-20 z-[100] -translate-x-1/2 rounded-lg bg-gray-900/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
        {toastMsg}
      </div>
    )}
    <div ref={containerRef} className={cn("relative w-full sm:w-80", className)}>
      {/* 입력창 */}
      <div className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 shadow-lg ring-1 ring-black/10 backdrop-blur-sm">
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setIsOpen(false)}
          placeholder="공연 이름으로 검색"
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
        />
        {isLoading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-violet-600" />
        )}
        {query && !isLoading && (
          <button onClick={handleClear} className="shrink-0 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 검색 결과 드롭다운 */}
      {isOpen && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl bg-white shadow-xl ring-1 ring-black/10">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-center text-sm text-gray-400">검색 결과가 없습니다.</li>
          ) : (
            results.map((r) => (
              <li key={`${r.prfmid}-${r.venueid}`}>
                <button
                  onClick={() => handleSelect(r)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-violet-50 transition-colors"
                >
                  {/* 포스터 썸네일 */}
                  {r.posterurl ? (
                    <img
                      src={r.posterurl}
                      alt=""
                      className="h-12 w-9 shrink-0 rounded object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="h-12 w-9 shrink-0 rounded bg-gray-100" />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{r.prfmnm}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
                      <span className="truncate text-xs text-gray-500">{r.venuenm}</span>
                    </div>
                  </div>

                  {r.state && (
                    <div className="flex shrink-0 items-center gap-1">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${STATE_COLOR[r.state] ?? "bg-gray-400"}`}
                      />
                      <span className="text-xs text-gray-400">{r.state}</span>
                    </div>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
    </>
  );
}
