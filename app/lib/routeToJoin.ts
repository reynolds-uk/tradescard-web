// app/lib/routeToJoin.ts
export function routeToJoin(plan?: "member" | "pro") {
  try {
    if (plan) window.localStorage.setItem("join_wanted_plan", plan);
    else window.localStorage.removeItem("join_wanted_plan");
  } catch { /* ignore */ }

  const url = plan ? `/join?plan=${encodeURIComponent(plan)}` : "/join";
  if (typeof window !== "undefined") {
    // assign for reliability (avoids some SPA edge cases)
    window.location.assign(url);
  }
}