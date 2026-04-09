"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SetupState = "loading" | "ready" | "error";

export default function OnboardingPage() {
  const router = useRouter();
  const [state, setState] = useState<SetupState>("loading");

  useEffect(() => {
    async function setup() {
      try {
        const res = await fetch("/api/users/setup", { method: "POST" });
        if (!res.ok) throw new Error(await res.text());
        setState("ready");
        setTimeout(() => router.replace("/dashboard"), 2500);
      } catch (err) {
        console.error("[onboarding]", err);
        setState("error");
      }
    }

    setup();
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16 bg-zinc-50 dark:bg-black">
      {state === "loading" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Đang thiết lập tài khoản…
          </p>
        </div>
      )}

      {state === "ready" && (
        <div className="max-w-sm w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-8 py-10 text-center space-y-4">
          <div className="text-4xl">🎉</div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Chào mừng bạn đến với Giấy Tờ AI!
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Tài khoản của bạn đã sẵn sàng. Chúng tôi đã tặng bạn{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              2 tài liệu miễn phí
            </span>{" "}
            để bắt đầu.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            Đang chuyển hướng đến bảng điều khiển…
          </p>
        </div>
      )}

      {state === "error" && (
        <div className="max-w-sm w-full rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-zinc-900 px-8 py-10 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Có lỗi xảy ra
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Không thể thiết lập tài khoản. Vui lòng thử lại hoặc liên hệ hỗ
            trợ.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm font-medium text-zinc-900 dark:text-zinc-50 underline underline-offset-4"
          >
            Thử lại
          </button>
        </div>
      )}
    </main>
  );
}
