"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { viVN } from "@clerk/localizations";
import { I18nProvider } from "@/lib/i18n";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import posthog from "posthog-js";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { clientEnv } from "@/lib/env";
import { SentryUserContext } from "@/app/components/SentryUserContext";
import { setFieldLocale } from "@/lib/session/field-meta";

if (typeof window !== "undefined" && clientEnv.posthogKey) {
  // Only initialize analytics if user has consented (PDPL compliance)
  const consent = localStorage.getItem("giaytoai_consent");
  if (consent === "accepted") {
    posthog.init(clientEnv.posthogKey, {
      api_host: clientEnv.posthogHost ?? "https://app.posthog.com",
      capture_pageview: false, // handled manually by PageViewTracker
      capture_pageleave: true,
    });
  }
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
  setFieldLocale(locale);
  return (
    <ClerkProvider
      localization={viVN}
      appearance={{ variables: { colorBackground: "#ffffff" } }}
    >
      <SentryUserContext />
      <I18nProvider locale={locale} messages={messages}>
        <PHProvider client={posthog}>
          <PageViewTracker />
          {children}
        </PHProvider>
      </I18nProvider>
    </ClerkProvider>
  );
}
