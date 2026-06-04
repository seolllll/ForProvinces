"use client";

import { useState } from "react";

type SyncResult = {
  ok: boolean;
  skipped?: boolean;
  count?: number;
  error?: string;
};

export default function SyncRankingButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<SyncResult | null>(null);

  async function handleSync() {
    setStatus("loading");
    setResult(null);
    try {
      const res = await fetch("/api/sync-ranking", { method: "POST" });
      const data: SyncResult = await res.json();
      setResult(data);
      setStatus(data.ok ? "done" : "error");
    } catch (err) {
      setResult({ ok: false, error: String(err) });
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={status === "loading"}
        className="flex items-center gap-2 rounded-lg border border-yellow-400 bg-yellow-400/10 px-3 py-1.5 text-xs font-medium text-yellow-300 backdrop-blur-sm transition hover:bg-yellow-400/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "loading" ? (
          <>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border border-yellow-300 border-t-transparent" />
            수집 중…
          </>
        ) : (
          <>
            <span>🏆</span>
            [DEV] 순위 수집
          </>
        )}
      </button>

      {result && (
        <div
          className={`rounded-md px-2.5 py-1.5 text-xs backdrop-blur-sm ${
            status === "done"
              ? "bg-green-900/60 text-green-300"
              : "bg-red-900/60 text-red-300"
          }`}
        >
          {status === "done"
            ? result.skipped
              ? "⏭️ 오늘 이미 수집 완료"
              : `${result.count}건 수집 완료`
            : (result.error ?? "알 수 없는 오류")}
        </div>
      )}
    </div>
  );
}
