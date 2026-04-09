import { useCallback } from "react";
import type { Translations } from "@/messages/vi";
import { interpolate } from "./interpolate";
import { useI18nContext, type Locale } from "./provider";

export type Params = Record<string, string | number>;

/** Returns the current locale and a setter that persists to localStorage + DB. */
export function useI18n(): { locale: Locale; setLocale: (locale: Locale) => void } {
  const { locale, setLocale } = useI18nContext();
  return { locale, setLocale };
}

function getNestedString(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

/**
 * Namespace-scoped translator:
 *   const t = useT('common');
 *   t('loading')                      // "Loading…"
 *   t('credits', { count: 3 })        // "3 documents remaining"
 *
 * Unscoped (full dot-notation key):
 *   const t = useT();
 *   t('common.loading')
 *   t('nav.credits', { count: 3 })
 */
export function useT(): (key: string, params?: Params) => string;
export function useT<N extends keyof Translations>(
  namespace: N,
): (key: keyof Translations[N] & string, params?: Params) => string;
export function useT(namespace?: string) {
  const { messages } = useI18nContext();
  return useCallback(
    (key: string, params?: Params): string => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      const raw = getNestedString(messages, fullKey) ?? fullKey;
      return interpolate(raw, params);
    },
    [messages, namespace],
  );
}

/**
 * Typed accessor — returns the full messages object.
 * Useful when you need multiple keys or a nested sub-object:
 *   const m = useTA();
 *   m.documentTypes['cover-letter'].name
 */
export function useTA(): Translations {
  return useI18nContext().messages;
}
