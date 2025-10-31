"use client";

import { useState, FormEvent } from "react";

type PlanKey = "member" | "pro";

export default function Page() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [plan, setPlan] = useState<PlanKey>("member");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = { email: email.trim(), user_id: userId.trim(), plan };
    console.log("[UI] sending JSON payload ->", payload);

    try {
      setMsg("Posting…");
      const res = await fetch("https://tradescard-api.vercel.app/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      console.log("[UI] API status", res.status, "body:", text);

      if (!res.ok) {
        setMsg(`HTTP ${res.status}: ${text}`);
        return;
      }

      const data = JSON.parse(text) as { url: string };
      setMsg("Redirecting to Stripe…");
      window.location.href = data.url;
    } catch (err: any) {
      setMsg(`Fetch failed: ${err.message}`);
    }
  }

  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24}}>
      <form onSubmit={onSubmit} style={{width:520,maxWidth:"100%",gap:12,display:"grid"}}>
        <h1>TradesCard – Test Checkout (MVP DIRECT)</h1>

        <label>Email
          <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} />
        </label>

        <label>User ID (UUID)
          <input required value={userId} onChange={e=>setUserId(e.target.value)}
                 placeholder="11111111-1111-1111-1111-111111111111" />
        </label>

        <label>Plan
          <select value={plan} onChange={e=>setPlan(e.target.value as PlanKey)}>
            <option value="member">Member (monthly)</option>
            <option value="pro">Pro (monthly)</option>
          </select>
        </label>

        <button type="submit">Start Checkout</button>
        {msg && <p>{msg}</p>}
        <small>Success URL: http://localhost:3000/checkout/success</small>
      </form>
    </main>
  );
}