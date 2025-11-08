// app/components/PrimaryButton.tsx
"use client";
import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export default function PrimaryButton({
  className = "",
  loading,
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
        // Base styles
        "rounded-xl px-4 py-2 font-medium transition-colors duration-150",
        "bg-brand text-brand-ink hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        // Optional brand glow on hover
        "hover:shadow-brand-ring",
        className,
      ].join(" ")}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}