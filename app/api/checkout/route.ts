// app/api/checkout/route.ts
import { NextRequest } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://tradescard-api.vercel.app";

export async function POST(req: NextRequest) {
  try {
    // Read the body once
    const body = await req.json();

    // Forward to the tradescard-api checkout endpoint
    const upstreamRes = await fetch(`${API_BASE}/api/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await upstreamRes.text();

    // Try to parse JSON, but don’t explode if it’s plain text
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!upstreamRes.ok) {
      // Surface upstream error details to the client
      return new Response(
        JSON.stringify({
          error: "checkout_upstream_failed",
          upstream: json,
        }),
        {
          status: upstreamRes.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Pass through the successful JSON (e.g. { url })
    return new Response(JSON.stringify(json), {
      status: upstreamRes.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("checkout_proxy_failed", err);
    return new Response(
      JSON.stringify({
        error: "checkout_proxy_failed",
        details: err?.message ?? String(err),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}