"use client";

import { useState } from "react";
import { ChevronLeft, SlidersHorizontal } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { KOPIS_GENRES } from "@/types";
import { cn } from "@/lib/utils";

const PRFM_STATES = ["공연중", "공연예정", "공연완료"] as const;

export default function GenreFilter() {
  const [collapsed, setCollapsed] = useState(false);
  const { activeGenres, toggleGenre, activeStates, toggleState } = useMapStore();

  function handleGenreToggle(genre: string) {
    if (activeGenres.includes(genre) && activeGenres.length === 1) {
      alert("최소 1개의 장르를 선택해야 합니다.");
      return;
    }
    toggleGenre(genre);
  }

  function handleStateToggle(state: string) {
    if (activeStates.includes(state) && activeStates.length === 1) {
      alert("최소 1개의 공연 상태를 선택해야 합니다.");
      return;
    }
    toggleState(state);
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex items-center justify-center rounded-xl bg-background/90 p-2.5 shadow-lg backdrop-blur-sm transition-colors hover:bg-muted"
        title="필터 열기"
      >
        <SlidersHorizontal className="h-4 w-4 text-foreground" />
      </button>
    );
  }

  return (
    <div className="flex w-40 flex-col gap-1 rounded-xl bg-background/90 p-3 shadow-lg backdrop-blur-sm">
      {/* 헤더 */}
      <div className="mb-0.5 flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-foreground">필터</span>
        <button
          onClick={() => setCollapsed(true)}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="필터 접기"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 장르 */}
      <p className="mb-0.5 px-1 text-xs font-semibold text-foreground">공연 장르</p>
      {KOPIS_GENRES.map((genre) => {
        const active = activeGenres.includes(genre);
        return (
          <button
            key={genre}
            onClick={() => handleGenreToggle(genre)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-left text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {genre}
          </button>
        );
      })}

      {/* 구분선 */}
      <div className="my-1 border-t border-border" />

      {/* 공연 상태 */}
      <p className="mb-0.5 px-1 text-xs font-semibold text-foreground">공연 상태</p>
      {PRFM_STATES.map((state) => {
        const active = activeStates.includes(state);
        return (
          <button
            key={state}
            onClick={() => handleStateToggle(state)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-left text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {state}
          </button>
        );
      })}
    </div>
  );
}
