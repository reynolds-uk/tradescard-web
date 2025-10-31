// tradescard-api/pages/api/benefits.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Supabase admin env vars missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  const allowed = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.origin ?? '';
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = adminClient();

    const { data, error } = await supabase
      .from('benefits')
      .select('id, title, tier, description')
      .order('title', { ascending: true });

    if (error) {
      console.error('/api/benefits supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data ?? []);
  } catch (e: any) {
    console.error('Unexpected /api/benefits error:', e);
    return res.status(500).json({ error: e?.message ?? 'Unexpected failure' });
  }
}