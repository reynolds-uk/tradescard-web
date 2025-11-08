// app/components/BuildMeta.tsx
"use client";

export default function BuildMeta() {
  // hide unless explicitly enabled
  if (process.env.NEXT_PUBLIC_SHOW_BUILD_META !== "true") return null;

  const env = process.env.NEXT_PUBLIC_VERCEL_ENV || "production";
  const hash = process.env.NEXT_PUBLIC_BUILD || "local";
  const note = process.env.NEXT_PUBLIC_BUILD_NOTE || "";

  return (
    <div className="text-[11px] text-neutral-500">
      env: {env} • build: {hash}{note ? ` • ${note}` : ""}
    </div>
  );
}