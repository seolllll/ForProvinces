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

  async function handleSync() {
    setStatus("loading");
    setResult(null);
    try {
      const res = await fetch("/api/sync-prfm-detail", { method: "POST" });
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
