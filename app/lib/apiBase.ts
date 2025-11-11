// app/lib/apiBase.ts
const raw =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://tradescard-api.vercel.app";

export const API_BASE = raw.replace(/\/$/, "");