// src/lib/user.ts
/**
 * Supabase client + common user/session helpers.
 * Keeps authentication logic clean and consistent across pages/components.
 */

import { createClient, type User, type Session } from "@supabase/supabase-js";

// ---------- Supabase Client ----------

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ---------- Auth Helpers ----------

/**
 * Returns the current Supabase user, or null if not signed in.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user ?? null;
  } catch (err) {
    console.warn("[getCurrentUser] failed:", err);
    return null;
  }
}

/**
 * Returns just the current user_id (or null if no session).
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

/**
 * Returns the current session (access token, expiry, etc.).
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session ?? null;
  } catch (err) {
    console.warn("[getCurrentSession] failed:", err);
    return null;
  }
}

/**
 * Signs in via magic link (email). You can also use this for the header form.
 */
export async function signInWithMagicLink(email: string) {
  try {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[signInWithMagicLink] failed:", err);
    return false;
  }
}

/**
 * Signs the user out completely.
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[signOut] failed:", err);
    return false;
  }
}

// ---------- Utility ----------

/**
 * Simple wrapper to ensure an authenticated user before calling protected APIs.
 * Returns user_id or throws if not signed in.
 */
export async function requireUserId(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) throw new Error("User not signed in");
  return id;
}