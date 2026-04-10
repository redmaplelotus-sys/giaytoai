import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Giấy Tờ AI",
  description: "Soạn thảo hồ sơ du học bằng AI",
};

// Locale defaults to Vietnamese. Dynamic per-user locale can be layered on
// top later by reading a cookie or the users.locale column here.
const DEFAULT_LOCALE = "vi";

async function loadMessages(locale: string): Promise<Record<string, unknown>> {
  if (locale === "en") return (await import("@/messages/en")).default;
  if (locale === "ko") return (await import("@/messages/ko")).default;
  if (locale === "zh") return (await import("@/messages/zh")).default;
  return (await import("@/messages/vi")).default;
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = DEFAULT_LOCALE;
  const messages = await loadMessages(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
