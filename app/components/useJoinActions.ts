// add a second arg "interval" with default "month"
export function useJoinActions(next: string = "/offers") {
  const startMembership = async (
    plan: "member" | "pro",
    interval: "month" | "year" = "month",
    opts?: { trial?: boolean }
  ) => {
    setBusy(true);
    setError("");
    try {
      if (!me?.user) {
        // store intent for /join to continue after auth
        window.localStorage.setItem(
          "join_wanted_plan",
          JSON.stringify({ plan, interval })
        );
        routeToJoin(plan);
        return;
      }

      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: me.user.id,
          email: me.email,
          plan,             // "member" | "pro"
          interval,         // "month" | "year"  ⟵ NEW
          trial: opts?.trial,
          next,
        }),
        keepalive: true,
      });

      const json = await res.json().catch(() => ({} as { url?: string; error?: string }));
      if (!res.ok || !json.url) throw new Error(json?.error || "Checkout failed");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, startMembership };
}