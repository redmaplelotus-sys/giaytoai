import { anthropic } from "@/lib/anthropic";
import type { CompileResult } from "@/lib/prompts/compile";

// ---------------------------------------------------------------------------
// StreamChunk — discriminated union yielded by streamDraft()
// ---------------------------------------------------------------------------
export type StreamChunk =
  | { type: "delta"; text: string }
  | {
      type: "done";
      inputTokens: number;
      outputTokens: number;
      /** Milliseconds from stream start to first text token. */
      firstTokenMs: number;
      /** Total elapsed milliseconds for the full stream. */
      totalMs: number;
    }
  | { type: "error"; message: string };

export interface StreamDraftOptions {
  model?: string;
  maxTokens?: number;
}

const DEFAULT_MODEL = "claude-opus-4-6";
const DEFAULT_MAX_TOKENS = 4096;

// ---------------------------------------------------------------------------
// streamDraft()
// Async generator — yields StreamChunks as they arrive from Anthropic.
// Tracks first-token latency for Helicone / internal dashboards.
//
// Usage:
//   for await (const chunk of streamDraft(compiled)) {
//     if (chunk.type === "delta") buffer += chunk.text;
//     if (chunk.type === "done")  console.log("ttft:", chunk.firstTokenMs);
//   }
// ---------------------------------------------------------------------------
export async function* streamDraft(
  compiled: Pick<CompileResult, "system" | "userPrompt">,
  options: StreamDraftOptions = {},
): AsyncGenerator<StreamChunk> {
  const { model = DEFAULT_MODEL, maxTokens = DEFAULT_MAX_TOKENS } = options;

  const startMs = Date.now();
  let firstTokenMs: number | null = null;
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const stream = anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      system: compiled.system as Parameters<
        typeof anthropic.messages.stream
      >[0]["system"],
      messages: [{ role: "user", content: compiled.userPrompt }],
    });

    for await (const event of stream) {
      switch (event.type) {
        case "message_start":
          inputTokens = event.message.usage.input_tokens;
          break;

        case "content_block_delta":
          if (event.delta.type === "text_delta") {
            if (firstTokenMs === null) {
              firstTokenMs = Date.now() - startMs;
            }
            yield { type: "delta", text: event.delta.text };
          }
          break;

        case "message_delta":
          outputTokens = event.usage.output_tokens;
          break;

        default:
          break;
      }
    }

    yield {
      type: "done",
      inputTokens,
      outputTokens,
      firstTokenMs: firstTokenMs ?? Date.now() - startMs,
      totalMs: Date.now() - startMs,
    };
  } catch (err) {
    yield {
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
