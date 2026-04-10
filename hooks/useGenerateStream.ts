"use client";

import { useCallback, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { QualityReport } from "@/lib/ai/quality";
import type { SafetyResult } from "@/lib/ai/safety";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GeneratePhase =
  | "idle"
  | "connecting"
  | "streaming"
  | "complete"
  | "error";

export interface GenerateTiming {
  /** ms from fetch() call to first delta token arriving */
  firstTokenMs: number | null;
  /** ms from fetch() call to stream close */
  totalMs: number | null;
}

export interface GenerateState {
  phase: GeneratePhase;
  /** Current draft id — set once the server emits the done event */
  draftId: string | null;
  /** Safety warning surfaced mid-stream (verdict === "warn" only; "block" never reaches here) */
  safety: Pick<SafetyResult, "verdict" | "flags" | "reason"> | null;
  /** Quality report from the post-generation Haiku pass */
  quality: QualityReport | null;
  timing: GenerateTiming;
  /** Human-readable error message when phase === "error" */
  error: string | null;
  /** Token counts reported by the server */
  inputTokens: number | null;
  outputTokens: number | null;
}

const INITIAL_STATE: GenerateState = {
  phase:        "idle",
  draftId:      null,
  safety:       null,
  quality:      null,
  timing:       { firstTokenMs: null, totalMs: null },
  error:        null,
  inputTokens:  null,
  outputTokens: null,
};

// ---------------------------------------------------------------------------
// useGenerateStream()
//
// Usage:
//   const { state, generate, abort } = useGenerateStream(editor);
//
//   // kick off generation
//   generate("/api/sessions/abc123/generate");
//
//   // editor receives tokens in real-time via Tiptap insertContent
// ---------------------------------------------------------------------------

export function useGenerateStream(editor: Editor | null) {
  const [state, setState] = useState<GenerateState>(INITIAL_STATE);

  // Track the AbortController so the caller can cancel mid-stream.
  const abortRef = useRef<AbortController | null>(null);

  // Wall-clock start time — set when fetch begins, used to compute timing.
  const startMsRef = useRef<number>(0);
  // Whether the editor has been cleared for this generation run.
  const clearedRef = useRef(false);

  const generate = useCallback(
    async (url: string) => {
      // Cancel any in-flight request before starting a new one.
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      startMsRef.current = Date.now();
      clearedRef.current = false;

      setState({
        ...INITIAL_STATE,
        phase: "connecting",
      });

      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          signal: abort.signal,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState((s) => ({
          ...s,
          phase: "error",
          error: "Could not reach the server. Check your connection.",
          timing: { ...s.timing, totalMs: Date.now() - startMsRef.current },
        }));
        return;
      }

      if (!response.ok) {
        // Parse error JSON for user-facing codes (no_credits, content_blocked, …)
        let code = "internal_error";
        let message = `Server error ${response.status}`;
        try {
          const body = (await response.json()) as { error?: string; reason?: string };
          code    = body.error ?? code;
          message = body.reason ?? body.error ?? message;
        } catch { /* ignore parse errors */ }

        setState((s) => ({
          ...s,
          phase: "error",
          error: message,
          timing: { ...s.timing, totalMs: Date.now() - startMsRef.current },
        }));
        return;
      }

      // Switch to streaming phase once we have a 200 body
      setState((s) => ({ ...s, phase: "streaming" }));

      const reader = response.body?.getReader();
      if (!reader) {
        setState((s) => ({
          ...s,
          phase: "error",
          error: "Server returned no response body.",
        }));
        return;
      }

      const decoder = new TextDecoder();
      // Leftover bytes from the last read that didn't end on a message boundary
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE messages are separated by double newlines.
          // Split on \n\n but keep a trailing partial message in the buffer.
          const messages = buffer.split("\n\n");
          buffer = messages.pop() ?? ""; // last element may be incomplete

          for (const msg of messages) {
            if (!msg.trim()) continue;

            let eventName = "message";
            let dataLine  = "";

            for (const line of msg.split("\n")) {
              if (line.startsWith("event:")) {
                eventName = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                dataLine = line.slice(5).trim();
              }
            }

            if (!dataLine) continue;

            let parsed: Record<string, unknown>;
            try {
              parsed = JSON.parse(dataLine);
            } catch {
              console.warn("[useGenerateStream] unparseable SSE data:", dataLine);
              continue;
            }

            handleEvent(eventName, parsed);
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState((s) => ({
          ...s,
          phase: "error",
          error: "Stream interrupted unexpectedly.",
          timing: { ...s.timing, totalMs: Date.now() - startMsRef.current },
        }));
      } finally {
        reader.releaseLock();
      }

      // ── Event handlers ───────────────────────────────────────────────────

      function handleEvent(name: string, data: Record<string, unknown>) {
        switch (name) {
          // ── safety: warn surfaced before first token ──────────────────────
          case "safety": {
            setState((s) => ({
              ...s,
              safety: {
                verdict: data.verdict as SafetyResult["verdict"],
                flags:   (data.flags as string[]) ?? [],
                reason:  (data.reason as string) ?? "",
              },
            }));
            break;
          }

          // ── delta: append token to Tiptap ─────────────────────────────────
          case "delta": {
            const text = data.text as string;
            if (!text) break;

            if (editor) {
              if (!clearedRef.current) {
                // Clear any previous draft content on the first token of a new run.
                editor.commands.clearContent(false);
                clearedRef.current = true;
              }
              // insertContent appends at the current cursor; move to end first.
              editor.commands.focus("end");
              editor.commands.insertContent(text, {
                parseOptions: { preserveWhitespace: "full" },
              });
            }

            // Record first-token timing on first delta
            setState((s) => {
              if (s.timing.firstTokenMs !== null) return s;
              return {
                ...s,
                timing: {
                  ...s.timing,
                  firstTokenMs: Date.now() - startMsRef.current,
                },
              };
            });
            break;
          }

          // ── done: save metadata, finalise timing ──────────────────────────
          case "done": {
            const serverFirstTokenMs = data.firstTokenMs as number | null;
            const serverTotalMs      = data.totalMs      as number | null;

            setState((s) => ({
              ...s,
              phase:        "complete",
              draftId:      (data.draftId as string) ?? null,
              quality:      (data.quality as QualityReport | null) ?? null,
              inputTokens:  (data.inputTokens as number) ?? null,
              outputTokens: (data.outputTokens as number) ?? null,
              timing: {
                // Prefer server-reported timing (more accurate for TTFT);
                // fall back to client-side wall-clock.
                firstTokenMs: serverFirstTokenMs ?? s.timing.firstTokenMs,
                totalMs:      serverTotalMs      ?? Date.now() - startMsRef.current,
              },
            }));
            break;
          }

          // ── error: stream-level failure after credit consumed ─────────────
          case "error": {
            setState((s) => ({
              ...s,
              phase: "error",
              error: (data.message as string) ?? "Generation failed.",
              timing: {
                ...s.timing,
                totalMs: Date.now() - startMsRef.current,
              },
            }));
            break;
          }
        }
      }
    },
    [editor],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => ({
      ...s,
      phase: "idle",
      timing: {
        ...s.timing,
        totalMs: s.timing.totalMs ?? Date.now() - startMsRef.current,
      },
    }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  return { state, generate, abort, reset };
}
