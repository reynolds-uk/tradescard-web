// Server Component (no 'use client')
import { Suspense } from 'react';
import CallbackClient from './CallbackClient';

// ✅ Segment config declared in a server file:
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-sm opacity-70">Signing you in…</p>}>
      <CallbackClient />
    </Suspense>
  );
}