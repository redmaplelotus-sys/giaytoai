import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-16 bg-zinc-50 dark:bg-black">
      <div className="max-w-sm w-full text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Chào mừng trở lại
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Đăng nhập để tiếp tục soạn thảo hồ sơ du học của bạn với sự hỗ trợ
          của AI.
        </p>
      </div>

      <SignIn />
    </main>
  );
}
