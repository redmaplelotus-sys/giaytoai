"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Translations } from "@/messages/vi";

export const SUPPORTED_LOCALES = ["vi", "en", "ko", "zh"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = "giaytoai_locale";
const DB_DEBOUNCE_MS = 1500;

export type I18nContextValue = {
  locale: Locale;
  messages: Translations;
  setLocale: (locale: Locale) => void;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18nContext(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18nContext must be used inside I18nProvider");
  return ctx;
}

async function loadMessages(locale: Locale): Promise<Translations> {
  const mod = await import(`@/messages/${locale}`);
  return mod.default as Translations;
}

interface I18nProviderProps {
  locale: string;
  messages: Record<string, unknown>;
  children: React.ReactNode;
}

export function I18nProvider({
  locale: initialLocale,
  messages: initialMessages,
  children,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(
    SUPPORTED_LOCALES.includes(initialLocale as Locale)
      ? (initialLocale as Locale)
      : "vi",
  );
  const [messages, setMessages] = useState<Translations>(
    initialMessages as Translations,
  );
  const dbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncToDb = useCallback((newLocale: Locale) => {
    if (dbTimer.current) clearTimeout(dbTimer.current);
    dbTimer.current = setTimeout(() => {
      fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferred_lang: newLocale }),
      }).catch(() => {
        // Fire-and-forget; user may not be authenticated
      });
    }, DB_DEBOUNCE_MS);
  }, []);

  const setLocale = useCallback(
    async (newLocale: Locale) => {
      if (newLocale === locale) return;
      localStorage.setItem(STORAGE_KEY, newLocale);
      const newMessages = await loadMessages(newLocale);
      setLocaleState(newLocale);
      setMessages(newMessages);
      syncToDb(newLocale);
    },
    [locale, syncToDb],
  );

  // On mount: hydrate from localStorage immediately (avoids DB round-trip)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && SUPPORTED_LOCALES.includes(stored) && stored !== locale) {
      setLocale(stored);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <I18nContext.Provider value={{ locale, messages, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}
