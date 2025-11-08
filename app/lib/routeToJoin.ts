// app/lib/routeToJoin.ts
export function routeToJoin(
  preselect?: "member" | "pro" | "access"
): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const url = new URL("/join", base);

  if (preselect === "member" || preselect === "pro") {
    url.searchParams.set("plan", preselect);
  } else if (preselect === "access") {
    // tell /join to focus the free email box
    url.hash = "free";
  }
  return url.toString();
}