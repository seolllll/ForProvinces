"use client";

import { useState } from "react";

type SyncResult = {
  ok: boolean;
  detail?: { success: number; fail: number; total: number };
  error?: string;
};

export default function SyncPrfmDetailButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<SyncResult | null>(null);
  const [startPage, setStartPage] = useState(26);

  async function handleSync() {
    setStatus("loading");
    setResult(null);
    try {
      const res = await fetch("/api/sync-prfm-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startPage }),
      });
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
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-purple-300">
          <span>p.</span>
          <input
            type="number"
            min={1}
            value={startPage}
            onChange={(e) => setStartPage(Math.max(1, Number(e.target.value)))}
            disabled={status === "loading"}
            className="w-14 rounded border border-purple-400/40 bg-purple-900/30 px-1.5 py-0.5 text-center text-xs text-purple-200 outline-none focus:border-purple-400 disabled:opacity-50"
          />
        </label>
        <button
          onClick={handleSync}
          disabled={status === "loading"}
          className="flex items-center gap-2 rounded-lg border border-purple-400 bg-purple-400/10 px-3 py-1.5 text-xs font-medium text-purple-300 backdrop-blur-sm transition hover:bg-purple-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
        {status === "loading" ? (
          <>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border border-purple-300 border-t-transparent" />
            수집 중…
          </>
        ) : (
          <>
            <span>📋</span>
            [DEV] 공연상세 수집
          </>
        )}
        </button>
      </div>

      {result && (
        <div
          className={`rounded-md px-2.5 py-1.5 text-xs backdrop-blur-sm ${
            status === "done"
              ? "bg-green-900/60 text-green-300"
              : "bg-red-900/60 text-red-300"
          }`}
        >
          {status === "done" && result.detail ? (
            <>
              detail {result.detail.success}/{result.detail.total}건
              {result.detail.fail > 0 && ` · 오류 ${result.detail.fail}`}
            </>
          ) : (
            result.error ?? "알 수 없는 오류"
          )}
        </div>
      )}
    </div>
  );
}
