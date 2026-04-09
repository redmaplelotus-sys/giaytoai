import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-16 bg-zinc-50 dark:bg-black">
      <div className="max-w-sm w-full space-y-4">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4 space-y-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            🎁 Tặng 2 tài liệu miễn phí khi đăng ký
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Soạn thảo ngay personal statement, cover letter, hay bài luận học
            bổng — không cần thẻ tín dụng.
          </p>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Tạo tài khoản
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Bắt đầu hành trình du học cùng Giấy Tờ AI.
          </p>
        </div>
      </div>

      <SignUp />
    </main>
  );
}
