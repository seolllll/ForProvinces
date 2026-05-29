"use client";

import { useMapStore } from "@/store/mapStore";
import { CATEGORY_LABEL, type Category } from "@/types";
import { cn } from "@/lib/utils";

const FILTER_CATEGORIES: Category[] = ["THEATER", "MUSICAL", "EXHIBITION"];

export default function CategoryFilter() {
  const { activeCategories, toggleCategory } = useMapStore();

  return (
    <div className="flex gap-2 rounded-full bg-white/90 px-4 py-2 shadow-lg backdrop-blur-sm">
      {FILTER_CATEGORIES.map((cat) => {
        const active = activeCategories.includes(cat);
        return (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {CATEGORY_LABEL[cat]}
          </button>
        );
      })}
    </div>
  );
}
