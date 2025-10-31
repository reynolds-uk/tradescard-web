import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  try {
    const { stripe_customer_id, return_url } = await req.json();
    if (!stripe_customer_id) return NextResponse.json({ error: "missing_customer_id" }, { status: 400 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const session = await stripe.billingPortal.sessions.create({
      customer: stripe_customer_id,
      return_url: return_url || (process.env.WEB_BASE ?? "http://localhost:3000") + "/app",
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}