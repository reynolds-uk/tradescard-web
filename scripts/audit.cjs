/* scripts/audit.cjs */
const { createClient } = require('@supabase/supabase-js');

const missing = [];
function mustEnv(k) { const v = process.env[k]; if (!v) missing.push(k); return v; }

const SUPABASE_URL  = mustEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_ANON = mustEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const API_BASE      = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL;

(async () => {
  if (missing.length) {
    console.log('❌ Missing env:', missing.join(', '));
    process.exit(1);
  }

  const supa = createClient(SUPABASE_URL, SUPABASE_ANON);

  async function checkTable(t) {
    try {
      const { error } = await supa.from(t).select('id', { count: 'exact', head: true });
      console.log(`${error ? '❌' : '✅'} ${t}${error ? ` – ${error.message}` : ''}`);
    } catch (e) {
      console.log(`❌ ${t} – ${e.message}`);
    }
  }

  console.log('\n🔎 Table checks:');
  for (const t of ['competitions','rewards_ledger','offers','benefits','profiles']) {
    await checkTable(t);
  }

  if (API_BASE) {
    console.log('\n🌐 API checks:');
    for (const ep of ['/api/checkout','/api/claim','/api/stripe/webhook']) {
      try {
        const res = await fetch(`${API_BASE.replace(/\/$/,'')}${ep}`, { method: 'OPTIONS' });
        console.log(`${res.ok ? '✅' : '⚠️'} ${ep} (OPTIONS ${res.status})`);
      } catch (e) {
        console.log(`❌ ${ep} – ${e.message}`);
      }
    }
  } else {
    console.log('\n⚠️ API_BASE not set; skipped API checks.');
  }

  console.log('\nDone.\n');
})();