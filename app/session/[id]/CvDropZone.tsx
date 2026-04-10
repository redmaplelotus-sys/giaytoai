"use client";

import { useRef, useState } from "react";
import { useT } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; progress: number }
  | { phase: "extracting" }
  | { phase: "done"; count: number }
  | { phase: "error"; code: "generic" | "format" | "read" | "size" };

const ACCEPT = ".pdf,.txt,.md,text/plain,application/pdf";
const MAX_MB = 5;
const MAX_BYTES = MAX_MB * 1024 * 1024;

// ---------------------------------------------------------------------------
// Progress ring (SVG)
// ---------------------------------------------------------------------------

function ProgressRing({ pct }: { pct: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <svg width={44} height={44} className="-rotate-90">
      <circle cx={22} cy={22} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-neutral-200 dark:text-neutral-700" />
      <circle
        cx={22} cy={22} r={r} fill="none"
        stroke="currentColor" strokeWidth={3}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        className="text-neutral-900 dark:text-white transition-all duration-150"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CvDropZoneProps {
  sessionId: string;
  onExtracted: (values: Record<string, string>) => void;
}

export function CvDropZone({ sessionId, onExtracted }: CvDropZoneProps) {
  const t = useT("cvUpload");
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  function upload(file: File) {
    if (file.size > MAX_BYTES) {
      setState({ phase: "error", code: "size" });
      return;
    }

    const name = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
    const isTxt = file.type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md");
    if (!isPdf && !isTxt) {
      setState({ phase: "error", code: "format" });
      return;
    }

    setState({ phase: "uploading", progress: 0 });

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setState({ phase: "uploading", progress: Math.round((e.loaded / e.total) * 100) });
      }
    };

    xhr.upload.onload = () => {
      setState({ phase: "extracting" });
    };

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const data = JSON.parse(xhr.responseText) as {
            extracted: Record<string, string>;
            count: number;
          };
          onExtracted(data.extracted);
          setState({ phase: "done", count: data.count });
        } catch {
          setState({ phase: "error", code: "generic" });
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText) as { error?: string };
          const code = err.error;
          if (code === "unsupported_format") setState({ phase: "error", code: "format" });
          else if (code === "could_not_read")  setState({ phase: "error", code: "read" });
          else if (code === "file_too_large")  setState({ phase: "error", code: "size" });
          else setState({ phase: "error", code: "generic" });
        } catch {
          setState({ phase: "error", code: "generic" });
        }
      }
    };

    xhr.onerror = () => setState({ phase: "error", code: "generic" });

    xhr.open("POST", `/api/sessions/${sessionId}/upload-cv`);
    xhr.send(formData);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  }

  function reset() {
    xhrRef.current?.abort();
    setState({ phase: "idle" });
  }

  const { phase } = state;

  // ── Uploading ──
  if (phase === "uploading") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-700 dark:bg-neutral-900">
        <ProgressRing pct={state.progress} />
        <p className="text-sm font-medium">{t("uploading")}</p>
        <p className="tabular-nums text-xs text-neutral-400">{state.progress}%</p>
        <button type="button" onClick={reset} className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
          Cancel
        </button>
      </div>
    );
  }

  // ── Extracting ──
  if (phase === "extracting") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-700 dark:bg-neutral-900">
        <span className="animate-spin text-2xl" aria-hidden="true">⟳</span>
        <p className="text-sm font-medium">{t("extracting")}</p>
      </div>
    );
  }

  // ── Done ──
  if (phase === "done") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
        <p className="text-sm font-medium text-green-700 dark:text-green-400">
          ✓ {t("done", { count: state.count })}
        </p>
        <button type="button" onClick={reset} className="text-xs text-green-600 hover:text-green-800 dark:text-green-500 dark:hover:text-green-300">
          {t("retry")}
        </button>
      </div>
    );
  }

  // ── Error ──
  if (phase === "error") {
    const msg =
      state.code === "format" ? t("errorFormat")
      : state.code === "read"   ? t("errorRead")
      : t("errorGeneric");
    return (
      <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">{msg}</p>
        <button type="button" onClick={reset} className="text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200">
          {t("retry")}
        </button>
      </div>
    );
  }

  // ── Idle drop zone ──
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t("dropIdle")}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      className={[
        "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8",
        "transition-colors focus-visible:outline-none focus-visible:ring-2",
        dragging
          ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800"
          : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500",
      ].join(" ")}
    >
      <span className="text-2xl leading-none" aria-hidden="true">
        {dragging ? "⬇" : "📄"}
      </span>
      <p className="text-sm font-medium">
        {dragging ? t("dropActive") : t("dropIdle")}
      </p>
      <p className="text-xs text-neutral-400">
        {t("hint")}{" "}
        <span className="font-medium text-neutral-600 underline dark:text-neutral-300">
          {t("browse")}
        </span>
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleFileInput}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}
