"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useT } from "@/lib/i18n";

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
    <Link href="/" className="flex items-center gap-2.5 shrink-0" style={{ textDecoration: "none" }}>
      {/* Navy rounded square icon */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "var(--radius-md)",
          background: "var(--color-navy)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {/* Document lines */}
        <svg width="18" height="20" viewBox="0 0 18 20" fill="none" aria-hidden="true">
          <rect x="2" y="1" width="12" height="16" rx="1.5" fill="white" fillOpacity="0.9" />
          <rect x="4.5" y="5"  width="7" height="1.5" rx="0.75" fill="var(--color-navy)" />
          <rect x="4.5" y="8"  width="5" height="1.5" rx="0.75" fill="var(--color-navy)" />
          <rect x="4.5" y="11" width="6" height="1.5" rx="0.75" fill="var(--color-navy)" />
        </svg>
        {/* Green checkmark badge */}
        <div
          style={{
            position: "absolute",
            bottom: -3,
            right: -3,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "var(--color-green)",
            border: "2px solid white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="7" height="6" viewBox="0 0 7 6" fill="none" aria-hidden="true">
            <path d="M1 3L2.8 5L6 1" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col leading-none gap-0.5">
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
          Giấy Tờ AI
        </span>
        <span style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 500 }}>
          Tài liệu quốc tế
        </span>
      </div>
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
  dashboard: "/dashboard",
  history:   "/dashboard",   // placeholder until /history page exists
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
        className="page-container"
        style={{ display: "flex", alignItems: "center", height: 56, gap: 16 }}
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
              <CreditPill />
              <UserButton />
            </>
          )}
          {isLoaded && !isSignedIn && (
            <>
              <Link
                href="/sign-in"
                className="btn-ghost"
                style={{ fontSize: 13, padding: "6px 12px" }}
              >
                {t("signIn")}
              </Link>
              <Link
                href="/sign-up"
                className="btn-primary"
                style={{ fontSize: 13, padding: "6px 14px" }}
              >
                {t("tryFree")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile: credit pill + hamburger */}
        <div className="flex md:hidden items-center gap-2 ml-auto">
          {isLoaded && isSignedIn && <CreditPill />}
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
          className="page-container py-3 flex flex-col gap-1"
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
                paddingTop: 12,
                borderTop: "1px solid var(--color-border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 12px 4px",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                {t("settings")}
              </span>
              <UserButton />
            </div>
          )}

          {isLoaded && !isSignedIn && (
            <div className="flex flex-col gap-2 pt-3 px-1" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
              <Link
                href="/sign-in"
                className="btn-ghost w-full"
                style={{ fontSize: 14, padding: "10px 12px", textAlign: "center" }}
                onClick={() => setMobileOpen(false)}
              >
                {t("signIn")}
              </Link>
              <Link
                href="/sign-up"
                className="btn-primary w-full"
                style={{ fontSize: 14, padding: "10px 12px", textAlign: "center" }}
                onClick={() => setMobileOpen(false)}
              >
                {t("tryFree")}
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
