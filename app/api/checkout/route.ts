"use server";

import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/config";

const CHECKOUT_URL = `${API_BASE}/api/checkout`;

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const headers = new Headers({ "Content-Type": "application/json" });

    const auth = req.headers.get("authorization");
    if (auth) headers.set("Authorization", auth);

    const cookie = req.headers.get("cookie");
    if (cookie) headers.set("Cookie", cookie);

    const apiRes = await fetch(CHECKOUT_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    let json: any = null;
    try {
      json = await apiRes.json();
    } catch {
      const text = await apiRes.text();
      json = { error: "upstream_error", raw: text };
    }

    if (!apiRes.ok) {
      return NextResponse.json(
        { error: "checkout_upstream_failed", upstream: json },
        { status: apiRes.status },
      );
    }

    return NextResponse.json(json, { status: apiRes.status });
  } catch (error: any) {
    console.error("checkout proxy failed", error);
    return NextResponse.json(
      { error: "checkout_proxy_failed", details: error?.message ?? "unknown" },
      { status: 500 },
    );
  }
}
