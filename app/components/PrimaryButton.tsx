// app/components/PrimaryButton.tsx
"use client";
import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export default function PrimaryButton({ className = "", loading, children, ...btn }: Props) {
  return (
    <button
      type="button"
      {...btn}
      aria-busy={loading ? "true" : undefined}
      disabled={loading || btn.disabled}
      className={[
        "rounded-xl bg-amber-500 text-black px-4 py-2 font-medium hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed transition",
        className,
      ].join(" ")}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}