// app/lib/authErrors.ts
export type AuthError =
  | "otp_expired"
  | "email_link_invalid"
  | "email_link_is_invalid_or_expired";

export function readAndClearAuthError(): AuthError | null {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("error_code") || url.searchParams.get("error");
    if (code === "otp_expired" || code === "email_link_invalid" || code === "email_link_is_invalid_or_expired") {
      // clean the URL so the error doesn't stick
      window.history.replaceState({}, "", url.pathname + url.hash);
      return code as AuthError;
    }
    return null;
  } catch {
    return null;
  }
}