"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { viVN } from "@clerk/localizations";
import { NextIntlClientProvider } from "next-intl";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import posthog from "posthog-js";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { clientEnv } from "@/lib/env";
import { SentryUserContext } from "@/app/components/SentryUserContext";

if (typeof window !== "undefined") {
  posthog.init(clientEnv.posthogKey, {
    api_host: clientEnv.posthogHost,
    capture_pageview: false, // handled manually by PageViewTracker
    capture_pageleave: true,
  });
}

function PageViewTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    posthog.capture("$pageview", { $current_url: window.location.href });
  }, [pathname, searchParams]);

  return null;
}

// useSearchParams requires a Suspense boundary in the App Router
function PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <PageViewTrackerInner />
    </Suspense>
  );
}

interface ProvidersProps {
  children: React.ReactNode;
  locale: string;
  messages: Record<string, unknown>;
}

export function Providers({ children, locale, messages }: ProvidersProps) {
  return (
    <ClerkProvider localization={viVN}>
      <SentryUserContext />
      <NextIntlClientProvider locale={locale} messages={messages}>
        <PHProvider client={posthog}>
          <PageViewTracker />
          {children}
        </PHProvider>
      </NextIntlClientProvider>
    </ClerkProvider>
  );
}
