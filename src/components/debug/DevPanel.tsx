"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Wrench } from "lucide-react";
import SyncVenuesButton from "./SyncVenuesButton";
import SyncPrfmButton from "./SyncPrfmButton";
import SyncPrfmDetailButton from "./SyncPrfmDetailButton";
import SyncRankingButton from "./SyncRankingButton";

export default function DevPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground shadow-md hover:bg-muted transition-colors"
      >
        <Wrench className="h-3 w-3" />
        DEV
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {isOpen && (
        <div className="flex flex-col items-end gap-2">
          <SyncVenuesButton />
          <SyncPrfmButton />
          <SyncPrfmDetailButton />
          <SyncRankingButton />
        </div>
      )}
    </div>
  );
}
