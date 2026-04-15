"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

// ---------------------------------------------------------------------------
// Credit pill
// ---------------------------------------------------------------------------

function CreditPill() {
  const t = useT("nav");
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users/credits")
      .then((r) => r.json())
      .then((d: { credits_remaining: number; plan: string }) => {
        setCredits(d.credits_remaining);
        setPlan(d.plan);
      })
      .catch(() => {/* silent */});
  }, []);

  if (credits === null) return null;

  const isUnlimited = plan === "unlimited";
  const isEmpty = !isUnlimited && credits === 0;

  if (isUnlimited) return null;

  return (
    <Link
      href="/pricing"
      className="btn-pill"
      style={{
        fontSize: 12,
        color: isEmpty ? "var(--color-red)" : "var(--color-text-secondary)",
        borderColor: isEmpty ? "var(--color-red)" : undefined,
      }}
    >
      {isEmpty
        ? t("noCredits")
        : t("credits", { count: String(credits) })}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------

function Logo() {
  return (
    <Link href="/" className="shrink-0" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
      {/* Desktop */}
      <Image
        src="/logo.svg"
        alt="Giấy Tờ AI"
        width={270}
        height={78}
        className="hidden md:block"
        style={{ height: 72, width: "auto" }}
        priority
      />
      {/* Mobile */}
      <Image
        src="/logo.svg"
        alt="Giấy Tờ AI"
        width={225}
        height={66}
        className="block md:hidden"
        style={{ height: 60, width: "auto" }}
        priority
      />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Nav links config
// ---------------------------------------------------------------------------

const NAV_LINKS_AUTH   = ["dashboard", "history", "pricing"] as const;
const NAV_LINKS_GUEST  = ["pricing"] as const;

type NavKey = (typeof NAV_LINKS_AUTH)[number];

const LINK_HREF: Record<NavKey, string> = {
  dashboard: "/",
  history:   "/dashboard",
  pricing:   "/pricing",
};

// ---------------------------------------------------------------------------
// Hamburger button
// ---------------------------------------------------------------------------

interface HamburgerProps { open: boolean; onClick: () => void; }

function Hamburger({ open, onClick }: HamburgerProps) {
  return (
    <button
      type="button"
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      onClick={onClick}
      className="flex flex-col justify-center items-center gap-1 p-2 rounded"
      style={{ width: 36, height: 36, color: "var(--color-text-secondary)", background: "transparent", border: "none", cursor: "pointer" }}
    >
      <span
        style={{
          display: "block",
          width: 18,
          height: 2,
          background: "currentColor",
          borderRadius: 2,
          transformOrigin: "center",
          transition: "transform 0.2s, opacity 0.2s",
          transform: open ? "translateY(4px) rotate(45deg)" : "none",
        }}
      />
      <span
        style={{
          display: "block",
          width: 18,
          height: 2,
          background: "currentColor",
          borderRadius: 2,
          transition: "opacity 0.2s",
          opacity: open ? 0 : 1,
        }}
      />
      <span
        style={{
          display: "block",
          width: 18,
          height: 2,
          background: "currentColor",
          borderRadius: 2,
          transformOrigin: "center",
          transition: "transform 0.2s, opacity 0.2s",
          transform: open ? "translateY(-4px) rotate(-45deg)" : "none",
        }}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Navbar
// ---------------------------------------------------------------------------

export function Navbar() {
  const t        = useT("nav");
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();

  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    function onClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [mobileOpen]);

  // Don't render on auth pages
  if (pathname === "/sign-in" || pathname === "/sign-up" || pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) {
    return null;
  }

  const links = (isSignedIn ? NAV_LINKS_AUTH : NAV_LINKS_GUEST) as readonly string[];

  return (
    <header
      ref={navRef}
      className="app-header"
      style={{ position: "sticky", top: 0, zIndex: 100 }}
    >
      <div
        className="page-container-wide"
        style={{ display: "flex", alignItems: "center", height: 84, gap: 16 }}
      >
        {/* Logo */}
        <Logo />

        {/* Desktop nav links (centered) */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center" aria-label="Main navigation">
          {links.map((key) => {
            const href = LINK_HREF[key as NavKey] ?? `/${key}`;
            const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));
            return (
              <Link
                key={key}
                href={href}
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-md)",
                  background: isActive ? "var(--color-bg-subtle)" : "transparent",
                  textDecoration: "none",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {t(key as NavKey)}
              </Link>
            );
          })}
        </nav>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-2 shrink-0 ml-auto">
          {isLoaded && isSignedIn && (
            <>
              <Button variant="primary" size="sm" arrow href="/dashboard/new">
                {t("createDoc")}
              </Button>
              <CreditPill />
              <LanguageSwitcher />
              <UserButton />
            </>
          )}
          {isLoaded && !isSignedIn && (
            <>
              <LanguageSwitcher />
              <Button variant="ghost" size="sm" href="/sign-in" style={{ fontSize: 13, padding: "6px 12px" }}>
                {t("signIn")}
              </Button>
              <Button variant="primary" size="sm" arrow href="/sign-up">
                {t("tryFree")}
              </Button>
            </>
          )}
        </div>

        {/* Mobile: credit pill + language + hamburger */}
        <div className="flex md:hidden items-center gap-2 ml-auto">
          {isLoaded && isSignedIn && <CreditPill />}
          <LanguageSwitcher />
          <Hamburger open={mobileOpen} onClick={() => setMobileOpen((v) => !v)} />
        </div>
      </div>

      {/* Mobile push-down menu */}
      <div
        style={{
          overflow: "hidden",
          maxHeight: mobileOpen ? 400 : 0,
          transition: "max-height 0.25s ease",
          borderTop: mobileOpen ? "1px solid var(--color-border-subtle)" : "none",
          background: "var(--color-bg-surface)",
        }}
      >
        <nav
          className="page-container-wide py-3 flex flex-col gap-1"
          aria-label="Mobile navigation"
        >
          {links.map((key) => {
            const href = LINK_HREF[key as NavKey] ?? `/${key}`;
            const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));
            return (
              <Link
                key={key}
                href={href}
                onClick={() => setMobileOpen(false)}
                style={{
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  background: isActive ? "var(--color-bg-subtle)" : "transparent",
                  textDecoration: "none",
                  display: "block",
                }}
              >
                {t(key as NavKey)}
              </Link>
            );
          })}

          {isLoaded && isSignedIn && (
            <div
              style={{
                marginTop: 8,
                borderTop: "1px solid var(--color-border-subtle)",
                paddingTop: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <Link
                href="/dashboard/new"
                className="btn-primary w-full"
                style={{ fontSize: 14, padding: "10px 12px", textAlign: "center" }}
                onClick={() => setMobileOpen(false)}
              >
                {t("createDoc")}
              </Link>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 4px" }}>
                <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{t("settings")}</span>
                <UserButton />
              </div>
            </div>
          )}

          {isLoaded && !isSignedIn && (
            <div className="flex flex-col gap-2 pt-3 px-1" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
              <Button variant="secondary" href="/sign-in" onClick={() => setMobileOpen(false)} style={{ width: "100%", justifyContent: "center" }}>
                {t("signIn")}
              </Button>
              <Button variant="primary" arrow href="/sign-up" onClick={() => setMobileOpen(false)} style={{ width: "100%", justifyContent: "center" }}>
                {t("tryFree")}
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
