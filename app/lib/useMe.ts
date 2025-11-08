// add this flexible signature + implementation
export async function joinFree(
  arg: string | { email: string; next?: string } | { next?: string }
) {
  "use server";

  // Normalise inputs
  let email: string | undefined;
  let next: string | undefined;

  if (typeof arg === "string") {
    email = arg;
  } else if ("email" in arg) {
    email = arg.email;
    next = arg.next;
  } else {
    // legacy call that passed only { next }, but we still need email from somewhere
    // if your form provides it separately, throw a helpful error:
    throw new Error("joinFree requires an email address.");
  }

  // Build redirect (fallback to /offers)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectTo = new URL(next ?? "/offers", appUrl).toString();

  // Supabase magic-link (adjust to your client util)
  const { createServerClient } = await import("@supabase/ssr");
  const { cookies } = await import("next/headers");
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
      },
    }
  );

  const { error } = await supabase.auth.signInWithOtp({
    email!,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) throw error;
}