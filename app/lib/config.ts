// app/lib/config.ts
const rawApi = process.env.NEXT_PUBLIC_API_URL || "https://tradescard-api.vercel.app";
const rawSite = process.env.NEXT_PUBLIC_SITE_URL || "https://tradescard-web.vercel.app";

const normalise = (url: string) => url.replace(/\/$/, "");

export const API_BASE = normalise(rawApi);
export const SITE_URL = normalise(rawSite);
