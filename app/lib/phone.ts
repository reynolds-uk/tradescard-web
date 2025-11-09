// lib/phone.ts

/**
 * Strip spaces, dashes, brackets and non-digits (except leading +).
 */
export function clean(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  // Keep + if it's the first char; strip everything else non-digit
  const keepPlus = trimmed[0] === "+";
  const digits = trimmed.replace(/[^\d]/g, "");
  return keepPlus ? `+${digits}` : digits;
}

/**
 * Very light validator: 10–15 digits total (E.164 range). Accepts leading +.
 */
export function isLikelyE164(raw: string): boolean {
  const c = clean(raw);
  const digits = c.startsWith("+") ? c.slice(1) : c;
  return /^\d{10,15}$/.test(digits);
}

/**
 * Normalise to E.164-like string.
 * - If starts with +, just clean and return (+XXXXXXXXXXX).
 * - If starts with 0 (UK national), convert to +44… (or supply another default).
 * - Otherwise, if all digits and you provided a defaultCountry ("GB" → +44),
 *   prefix the default code.
 */
export function normaliseToE164(raw: string, defaultCountry: "GB" | null = "GB"): string {
  let v = clean(raw);
  if (!v) return "";

  if (v.startsWith("+")) {
    return v; // already international
  }

  // Local UK format like 07… or 01…
  if (defaultCountry === "GB" && v.startsWith("0")) {
    // drop the 0, prefix +44
    const digits = v.slice(1);
    return `+44${digits}`;
  }

  // If it's just digits and we have a default country, prefix its code
  if (/^\d{6,15}$/.test(v) && defaultCountry === "GB") {
    return `+44${v}`;
  }

  // Fallback: return cleaned digits (not ideal but won't crash)
  return v;
}

/**
 * Friendly display for UK numbers, e.g. "+447700900123" → "+44 7700 900 123".
 * Leaves non-GB numbers as-is (still spaced a bit).
 */
export function formatForDisplay(raw: string): string {
  const n = normaliseToE164(raw, "GB");
  if (!n.startsWith("+44")) {
    // generic spacing every 3–4 digits
    const body = n.startsWith("+") ? n.slice(1) : n;
    return "+" + body.replace(/(\d{3,4})(?=\d)/g, "$1 ");
  }
  // UK: +44 7xxx xxx xxx or +44 1/2/3… groupings
  const body = n.slice(3); // drop "+44"
  if (body.startsWith("7")) {
    // mobiles: 7 3-4-4
    return "+44 " + body.replace(/^(\d)(\d{4})(\d{3})(\d{3})$/, "$1$2 $3 $4");
  }
  // landlines: rough 3-4-4
  return "+44 " + body.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1 $2 $3");
}