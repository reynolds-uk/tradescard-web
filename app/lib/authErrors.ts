export const AUTH_ERROR_MAP: Record<string, string> = {
  otp_expired: "That sign-in link has expired. Please request a new one.",
  otp_disabled: "Magic links are currently unavailable. Please try again shortly.",
  invalid_grant: "That sign-in link is no longer valid. Request a new one.",
  server_error: "We had trouble verifying your link. Try again.",
};

export function readAuthErrorFromUrl(urlStr?: string) {
  try {
    const url = new URL(urlStr ?? window.location.href);
    const code = (url.searchParams.get("error") ||
      url.searchParams.get("error_code") ||
      "").toLowerCase();
    return code ? (AUTH_ERROR_MAP[code] ?? "We couldn’t verify your link. Please request a new one.") : "";
  } catch {
    return "";
  }
}