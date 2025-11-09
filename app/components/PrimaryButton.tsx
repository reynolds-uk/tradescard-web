// app/components/PrimaryButton.tsx
"use client";
import * as React from "react";

type Size = "sm" | "md" | "lg";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  size?: Size;          // default: md
  block?: boolean;      // full width on mobile
};

const sizeCls: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2 text-[15px] rounded-xl",
  lg: "px-5 py-3 text-base rounded-2xl",   // great for primary CTAs
};

export default function PrimaryButton({
  className = "",
  loading,
  size = "md",
  block = false,
  children,
  ...btn
}: Props) {
  return (
    <button
      type="button"
      {...btn}
      aria-busy={loading ? "true" : undefined}
      disabled={loading || btn.disabled}
      className={[
        // layout
        block ? "w-full" : "",
        // size
        sizeCls[size],
        // brand look
        "bg-brand text-brand-ink transition-colors duration-150",
        "hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        // subtle glow on hover/press (defined in globals.css)
        "hover:shadow-brand-ring active:shadow-brand-ring",
        // disabled
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}