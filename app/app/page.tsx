"use client";
import { useEffect, useState } from "react";

type View = { status: string; plan?: string; current_period_end?: string };

export default function MembershipDashboard() {
  const [userId, setUserId] = useState("");
  const [data, setData] = useState<View | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    setMsg("");
    setData(null);
    if (!userId.trim()) return setMsg("Enter a user_id first.");
    try {
      const res = await fetch(`/api/membership/${encodeURIComponent(userId.trim())}`);
      const json = await res.json();
      if (!res.ok) return setMsg(`Error: ${json?.error ?? res.status}`);
      setData(json);
    } catch (e: any) {
      setMsg(e?.message ?? "Fetch error");
    }
  }

  useEffect(() => { /* no auto-load */ }, []);

  return (
    <section className="grid gap-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">My membership</h1>

      <div className="grid gap-3 rounded-xl border border-neutral-800 p-6">
        <label className="text-sm text-neutral-300">User ID (UUID)</label>
        <input
          className="rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 outline-none focus:border-neutral-400"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="11111111-1111-1111-1111-111111111111"
        />
        <div className="flex gap-3">
          <button
            onClick={load}
            className="inline-flex items-center justify-center rounded-md bg-white text-black px-4 py-2 font-medium hover:opacity-90"
          >
            Check status
          </button>
        </div>

        {msg && <p className="text-amber-300 text-sm">{msg}</p>}

        {data && (
          <div className="rounded-lg bg-neutral-900 border border-neutral-800 p-4 grid gap-1">
            <div><span className="text-neutral-400">Status:</span> {data.status}</div>
            {data.plan && <div><span className="text-neutral-400">Plan:</span> {data.plan}</div>}
            {data.current_period_end && (
              <div><span className="text-neutral-400">Renews / ends:</span> {new Date(data.current_period_end).toLocaleString()}</div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}