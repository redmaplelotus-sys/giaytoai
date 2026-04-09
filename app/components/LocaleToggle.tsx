"use client";

import { useState } from "react";
import { useI18n, type Locale } from "@/lib/i18n";

const OPTIONS: { code: Locale; flag: string; label: string }[] = [
  { code: "vi", flag: "🇻🇳", label: "VI" },
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "zh", flag: "🇨🇳", label: "ZH" },
  { code: "ko", flag: "🇰🇷", label: "KO" },
];

export function LocaleToggle() {
  const { locale, setLocale } = useI18n();
  const [pending, setPending] = useState<Locale | null>(null);

  async function handleSelect(code: Locale) {
    if (code === locale || pending !== null) return;
    setPending(code);
    await setLocale(code);
    setPending(null);
  }

  return (
    <div
      role="group"
      aria-label="Interface language"
      className="flex items-center gap-0.5"
    >
      {OPTIONS.map(({ code, flag, label }) => {
        const isActive = locale === code;
        const isLoading = pending === code;

        return (
          <button
            key={code}
            type="button"
            onClick={() => handleSelect(code)}
            disabled={pending !== null}
            aria-pressed={isActive}
            aria-busy={isLoading}
            className={[
              "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium",
              "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              isActive
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200",
              pending !== null && !isLoading
                ? "cursor-not-allowed opacity-40"
                : "",
              isLoading ? "opacity-60" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span aria-hidden="true" className="text-sm leading-none">
              {flag}
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
