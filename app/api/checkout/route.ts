"use server";

import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/config";

const CHECKOUT_URL = `${API_BASE}/api/checkout`;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const apiRes = await fetch(CHECKOUT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
      return new Response(
        JSON.stringify({ error: "checkout_upstream_failed", upstream: json }),
        {
          status: apiRes.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify(json), {
      status: apiRes.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("checkout proxy failed", error);
    return new Response(
      JSON.stringify({
        error: "checkout_proxy_failed",
        details: error?.message ?? "unknown",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
