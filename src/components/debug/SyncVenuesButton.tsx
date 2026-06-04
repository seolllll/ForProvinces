"use client";

import { useState } from "react";

type SyncResult = {
  ok: boolean;
  venue?: { count: number; errors: number };
  detail?: { success: number; fail: number; total: number };
  error?: string;
};

function toYYYYMMDD(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

export default function SyncVenuesButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<SyncResult | null>(null);
  const [afterdate, setAfterdate] = useState("");

  async function handleSync() {
    setStatus("loading");
    setResult(null);
    try {
      const body = afterdate ? { afterdate: toYYYYMMDD(afterdate) } : {};
      const res = await fetch("/api/sync-venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        <label className="flex items-center gap-1 text-xs text-yellow-300">
          <span>after</span>
          <input
            type="date"
            value={afterdate}
            onChange={(e) => setAfterdate(e.target.value)}
            disabled={status === "loading"}
            placeholder="전체"
            className="rounded border border-yellow-400/40 bg-yellow-900/30 px-1.5 py-0.5 text-xs text-yellow-200 outline-none focus:border-yellow-400 disabled:opacity-50"
          />
        </label>
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
              <span>⚡</span>
              [DEV] 공연시설 수집
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
          {status === "done" && result.venue && result.detail ? (
            <>
              venue {result.venue.count}건 ·{" "}
              detail {result.detail.success}/{result.detail.total}건
              {result.venue.errors > 0 && ` · venue오류 ${result.venue.errors}`}
              {result.detail.fail > 0 && ` · detail오류 ${result.detail.fail}`}
            </>
          ) : (
            result.error ?? "알 수 없는 오류"
          )}
        </div>
      )}
    </div>
  );
}
