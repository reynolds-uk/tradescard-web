// app/lib/routeToJoin.ts
export function routeToJoin(plan?: "member" | "pro") {
  try {
    if (plan) localStorage.setItem("join_wanted_plan", plan);
    else localStorage.removeItem("join_wanted_plan");
  } catch {}
  window.location.href = "/join";
}