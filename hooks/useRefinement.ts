"use client";

import { useCallback, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { RefinementAction } from "@/app/api/drafts/[id]/refine/route";

// ---------------------------------------------------------------------------
// Re-export so consumers import from one place
// ---------------------------------------------------------------------------
export type { RefinementAction };

export type RefinementStatus =
  | "idle"
  | "loading"   // connecting / streaming
  | "done"
  | "error";

export interface RefinementState {
  status:       RefinementStatus;
  activeAction: RefinementAction | null;
  /** Feedback text from cultureCheck (analysis actions only) */
  feedback:     string | null;
  error:        string | null;
}

const INITIAL: RefinementState = {
  status:       "idle",
  activeAction: null,
  feedback:     null,
  error:        null,
};

/** Actions that stream feedback into a panel instead of replacing editor content. */
const ANALYSIS_ACTIONS = new Set<RefinementAction>(["cultureCheck"]);

// ---------------------------------------------------------------------------
// useRefinement
//
// Usage:
//   const { state, refine, clearFeedback } = useRefinement(editor, draftId);
//
//   <button onClick={() => refine("fixEnglish")}>Fix English</button>
//   {state.feedback && <FeedbackPanel text={state.feedback} />}
// ---------------------------------------------------------------------------

export function useRefinement(
  editor: Editor | null,
  draftId: string | null | undefined,
) {
  const [state, setState] = useState<RefinementState>(INITIAL);
  const abortRef          = useRef<AbortController | null>(null);

  const refine = useCallback(async (action: RefinementAction) => {
    if (!editor || !draftId) return;

    // Cancel any in-flight refinement
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    const currentText = editor.getText();
    if (!currentText.trim()) return;

    setState({
      status:       "loading",
      activeAction: action,
      feedback:     null,
      error:        null,
    });

    let response: Response;
    try {
      response = await fetch(`/api/drafts/${draftId}/refine`, {
        method:  "POST",
        signal:  abort.signal,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, currentText }),
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState((s) => ({ ...s, status: "error", error: "Kết nối thất bại." }));
      return;
    }

    if (!response.ok) {
      let message = `Error ${response.status}`;
      try {
        const body = (await response.json()) as { error?: string };
        message = body.error ?? message;
      } catch {}
      setState((s) => ({ ...s, status: "error", error: message }));
      return;
    }

    const isAnalysis   = ANALYSIS_ACTIONS.has(action);
    const reader       = response.body?.getReader();
    if (!reader) {
      setState((s) => ({ ...s, status: "error", error: "Máy chủ không trả về dữ liệu." }));
      return;
    }

    const decoder       = new TextDecoder();
    let   buffer        = "";
    let   accumulated   = "";   // replacement text OR analysis text
    let   editorCleared = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const messages = buffer.split("\n\n");
        buffer = messages.pop() ?? "";

        for (const msg of messages) {
          if (!msg.trim()) continue;

          let eventName = "message";
          let dataLine  = "";
          for (const line of msg.split("\n")) {
            if (line.startsWith("event:")) eventName = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLine  = line.slice(5).trim();
          }
          if (!dataLine) continue;

          let parsed: Record<string, unknown>;
          try { parsed = JSON.parse(dataLine); } catch { continue; }

          if (eventName === "delta" && !isAnalysis) {
            const text = parsed.text as string;
            if (!text) continue;
            accumulated += text;

            // For replacement actions: clear on first token, then type-in
            if (!editorCleared) {
              editor.commands.clearContent(false);
              editorCleared = true;
            }
            editor.commands.focus("end");
            editor.commands.insertContent(text, {
              parseOptions: { preserveWhitespace: "full" },
            });
          }

          if (eventName === "analysis" && isAnalysis) {
            accumulated += (parsed.text as string) ?? "";
            setState((s) => ({ ...s, feedback: accumulated }));
          }

          if (eventName === "done") {
            // Convert plain text to proper HTML paragraphs
            if (editorCleared && accumulated && !isAnalysis) {
              const html = accumulated
                .split(/\n{2,}/)
                .map((p) => p.trim())
                .filter(Boolean)
                .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
                .join("");
              editor.commands.clearContent(false);
              editor.commands.setContent(html);
            }
            setState((s) => ({ ...s, status: "done" }));
          }

          if (eventName === "error") {
            const message = (parsed.message as string) ?? "Refinement failed.";
            // If we already replaced editor content, restore original text
            if (editorCleared && currentText) {
              editor.commands.clearContent(false);
              editor.commands.insertContent(currentText, {
                parseOptions: { preserveWhitespace: "full" },
              });
            }
            setState((s) => ({ ...s, status: "error", error: message }));
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState((s) => ({ ...s, status: "error", error: "Kết nối bị gián đoạn." }));
    } finally {
      reader.releaseLock();
    }
  }, [editor, draftId]);

  const clearFeedback = useCallback(() => {
    setState((s) => ({ ...s, feedback: null }));
  }, []);

  const abortRefinement = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL);
  }, []);

  return { state, refine, clearFeedback, abort: abortRefinement };
}
