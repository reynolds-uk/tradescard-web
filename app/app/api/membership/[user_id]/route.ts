import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  _req: Request,
  { params }: { params: { user_id: string } }
) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE!; // server-only
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("user_id", params.user_id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ status: "none" });

    return NextResponse.json({
      status: data.status,               // e.g. 'active', 'canceled', etc.
      plan: data.plan,                   // 'member' | 'pro'
      current_period_end: data.current_period_end,
      stripe_customer_id: data.stripe_customer_id,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}