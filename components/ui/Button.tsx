"use client";

import Link from "next/link";

// ---------------------------------------------------------------------------
// Arrow circle icon
// ---------------------------------------------------------------------------

function ArrowCircle({ size = 22, dark = false }: { size?: number; dark?: boolean }) {
  const svgSize = Math.round(size * 0.5);
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: dark ? "rgba(27,58,92,0.12)" : "rgba(255,255,255,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width={svgSize} height={svgSize} viewBox="0 0 11 11" fill="none" aria-hidden="true">
        <path
          d="M2 5.5h7M5.5 2l3.5 3.5L5.5 9"
          stroke={dark ? "#1B3A5C" : "white"}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "primary-dark" | "secondary" | "ghost";
  size?: "default" | "sm";
  arrow?: boolean;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const BASE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontFamily: "inherit",
  textDecoration: "none",
  transition: "all 0.15s ease",
  border: "none",
};

const VARIANTS: Record<string, React.CSSProperties> = {
  primary: {
    background: "#1B3A5C",
    color: "#ffffff",
    borderRadius: 8,
    padding: "14px 28px",
    fontSize: 16,
    fontWeight: 700,
    outline: "2px solid #3B6D11",
    outlineOffset: 3,
    gap: 10,
  },
  "primary-dark": {
    background: "#ffffff",
    color: "#1B3A5C",
    borderRadius: 8,
    padding: "14px 28px",
    fontSize: 16,
    fontWeight: 700,
    outline: "2px solid rgba(255,255,255,0.55)",
    outlineOffset: 3,
    gap: 10,
  },
  secondary: {
    background: "#ffffff",
    color: "#1B3A5C",
    border: "2px solid #1B3A5C",
    borderRadius: 8,
    padding: "13px 24px",
    fontSize: 15,
    fontWeight: 600,
    outline: "none",
    gap: 8,
  },
  ghost: {
    background: "transparent",
    color: "#5F5E5A",
    padding: "14px 8px",
    fontSize: 15,
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    outline: "none",
    gap: 6,
  },
};

const SM_OVERRIDES: React.CSSProperties = {
  padding: "10px 20px",
  fontSize: 14,
};

export function Button({
  children,
  variant = "primary",
  size = "default",
  arrow = false,
  onClick,
  href,
  type = "button",
  disabled = false,
  className = "",
  style: styleProp,
}: ButtonProps) {
  const variantStyle = VARIANTS[variant] ?? VARIANTS.primary;
  const arrowSize = size === "sm" ? 18 : 22;
  const isDark = variant === "primary-dark";

  const combined: React.CSSProperties = {
    ...BASE,
    ...variantStyle,
    ...(size === "sm" ? SM_OVERRIDES : {}),
    ...(disabled ? { opacity: 0.5, cursor: "not-allowed", outline: "none" } : {}),
    ...styleProp,
  };

  const content = (
    <>
      {children}
      {arrow && <ArrowCircle size={arrowSize} dark={isDark} />}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className} style={combined} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={className}
      style={combined}
    >
      {content}
    </button>
  );
}
