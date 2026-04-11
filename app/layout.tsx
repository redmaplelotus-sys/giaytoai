import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/app/providers";
import { Navbar } from "@/components/layout/Navbar";
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
  title: "Giấy Tờ AI — Tài liệu quốc tế chuyên nghiệp",
  description: "Tạo personal statement, cover letter và tài liệu visa bằng tiếng Việt trong 5 phút",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "Giấy Tờ AI",
    description: "Tài liệu quốc tế chuyên nghiệp — bằng tiếng Việt",
    images: ["/logo.svg"],
  },
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
      <body className="min-h-full flex flex-col" style={{ alignItems: "stretch" }}>
        <Providers locale={locale} messages={messages}>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
