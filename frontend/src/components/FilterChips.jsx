import React from "react";
import { useTranslation } from "react-i18next";
import { FILTER_CHIPS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function FilterChips({ active, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-1 py-1">
      {FILTER_CHIPS.map((chip) => {
        const isActive = active === chip.key;
        return (
          <button
            key={chip.key}
            data-testid={`filter-chip-${chip.key}`}
            onClick={() => onChange(chip.key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 focus:outline-none active:scale-95",
              isActive
                ? "bg-brutal-accent text-white shadow-brutal"
                : "border border-brutal-border bg-brutal-surface text-brutal-soft hover:text-brutal-text",
            )}
          >
            {t(`filters.${chip.key}`)}
          </button>
        );
      })}
    </div>
  );
}
