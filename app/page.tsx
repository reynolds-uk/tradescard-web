
"use client";
import { FormEvent, useState } from "react";
import { createCheckout } from "@/lib/api";

export default function Page() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [plan, setPlan] = useState<"member" | "pro">("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const { url } = await createCheckout(email, userId, plan);
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">TradesCard – Test Checkout</h1>
        <p className="small mt-2">Posts to <code className="text-white">/api/checkout</code> and redirects to Stripe.</p>
      </div>
      <form onSubmit={onSubmit} className="card space-y-5">
        <div><label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div><label className="label">User ID (UUID)</label>
          <input className="input" type="text" required value={userId} onChange={e=>setUserId(e.target.value)} />
          <p className="small mt-1">Must exist in <code>profiles.user_id</code> if FK enforced.</p>
        </div>
        <div><label className="label">Plan</label>
          <select className="select" value={plan} onChange={e=>setPlan(e.target.value as any)}>
            <option value="member">Member (monthly)</option>
            <option value="pro">Pro (monthly)</option>
          </select>
        </div>
        {error && <div className="text-red-400">{error}</div>}
        <button className="btn" disabled={busy}>{busy ? "Creating…" : "Start Checkout"}</button>
      </form>
      <div className="small mt-6">
        Success URL: <code>http://localhost:3000/checkout/success</code> | Cancel URL: <code>http://localhost:3000/checkout/cancel</code>
      </div>
    </main>
  );
}
