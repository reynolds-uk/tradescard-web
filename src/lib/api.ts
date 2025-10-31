// src/lib/api.ts
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'https://tradescard-api.vercel.app';

export async function createCheckout(payload: {
  email: string;
  user_id: string;
  plan: 'member' | 'pro';
}) {
  // Debug: see exactly what we’re sending
  console.log('[createCheckout] payload =', payload, 'API_BASE =', API_BASE);

  const res = await fetch(`${API_BASE}/api/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload), // <-- IMPORTANT
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return data as { url: string };
}