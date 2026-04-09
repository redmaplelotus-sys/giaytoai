import type { Translations } from "@/messages/vi";

/**
 * Recursively extracts all leaf keys of an object type as dot-notation
 * string literals. Only terminal string values are included — intermediate
 * objects are not.
 *
 * @example
 * DotNotation<{ a: { b: string; c: { d: string } }; e: string }>
 *   → "a.b" | "a.c.d" | "e"
 */
export type DotNotation<T extends Record<string, unknown>> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends Record<string, unknown>
      ? `${K}.${DotNotation<T[K]>}`
      : never;
}[keyof T & string];

/** Every valid translation key across all namespaces (unscoped). */
export type TranslationKey = DotNotation<Translations>;

/** Every valid key within a single top-level namespace, including nested paths. */
export type NamespaceKey<N extends keyof Translations> =
  Translations[N] extends Record<string, unknown>
    ? DotNotation<Translations[N]>
    : never;
