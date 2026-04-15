"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const LANGUAGES = [
  { code: "vi", flag: "🇻🇳", label: "Tiếng Việt" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "ko", flag: "🇰🇷", label: "한국어" },
  { code: "zh", flag: "🇨🇳", label: "中文" },
] as const;

function getCurrentLocale(): string {
  if (typeof document === "undefined") return "vi";
  const match = document.cookie.match(/(?:^|; )locale=([^;]*)/);
  return match?.[1] ?? "vi";
}

export function LanguageSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(getCurrentLocale);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function handleSelect(code: string) {
    document.cookie = `locale=${code};path=/;max-age=${60 * 60 * 24 * 365}`;
    setCurrent(code);
    setOpen(false);
    router.refresh();
  }

  const active = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Chọn ngôn ngữ"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "1px solid var(--color-border-default)",
          borderRadius: 8,
          padding: "5px 10px",
          fontSize: 13,
          cursor: "pointer",
          color: "var(--color-text-secondary)",
          transition: "border-color 0.15s",
        }}
      >
        <span>{active.flag}</span>
        <span style={{ fontSize: 11 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: "#fff",
            border: "1px solid #E8E8E4",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: 4,
            zIndex: 200,
            minWidth: 150,
          }}
        >
          {LANGUAGES.map((lang) => {
            const isActive = lang.code === current;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 12px",
                  border: "none",
                  borderRadius: 6,
                  background: isActive ? "#E6F1FB" : "transparent",
                  color: isActive ? "#1B3A5C" : "#444441",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
