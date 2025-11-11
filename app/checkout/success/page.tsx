import { redirect } from "next/navigation";

export default function CheckoutSuccessRedirect({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sessionId =
    typeof searchParams.session_id === "string" ? searchParams.session_id : "";

  // If Stripe provided a session id (guest or signed-in), send to Welcome’s new path.
  if (sessionId) {
    redirect(`/welcome?pending=1&session_id=${encodeURIComponent(sessionId)}`);
  }

  // No session id present:
  // - If they’re already signed in, Welcome will just continue as normal.
  // - If not signed in, Welcome shows nothing special (no overlay) and they can proceed.
  redirect("/welcome");
}