import { NextRequest, NextResponse } from "next/server";

const UPSTREAM = process.env.API_UPSTREAM || "https://tradescard-api.vercel.app";

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const url = new URL(req.url);
  const target = `${UPSTREAM}/api/${params.path.join("/")}${url.search || ""}`;
  const r = await fetch(target, {
    // forward only relevant headers
    headers: {
      "x-user-id": req.headers.get("x-user-id") || "",
      "content-type": "application/json",
    },
    cache: "no-store",
  });
  return NextResponse.json(await r.json(), { status: r.status });
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const url = new URL(req.url);
  const target = `${UPSTREAM}/api/${params.path.join("/")}${url.search || ""}`;
  const body = await req.text();
  const r = await fetch(target, {
    method: "POST",
    headers: {
      "x-user-id": req.headers.get("x-user-id") || "",
      "content-type": req.headers.get("content-type") || "application/json",
    },
    body,
    cache: "no-store",
  });
  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { "content-type": r.headers.get("content-type") || "application/json" },
  });
}