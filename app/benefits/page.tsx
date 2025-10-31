// app/benefits/page.tsx
'use client';

import Link from 'next/link';

export default function BenefitsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold">Benefits</h1>
      <p className="mt-3 text-sm text-neutral-400">
        Benefits are loaded on the home view. Use the tabs there.
      </p>
      <Link
        href="/"
        className="inline-block mt-4 px-3 py-2 rounded bg-neutral-200 text-neutral-900 hover:bg-neutral-300 text-sm"
      >
        Back to Home
      </Link>
    </div>
  );
}