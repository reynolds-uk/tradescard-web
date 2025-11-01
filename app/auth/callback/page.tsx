'use client';

import CallbackClient from './CallbackClient';

export default function Page() {
  return (
    <>
      <div className="p-6 text-sm text-neutral-300">Signing you in…</div>
      <CallbackClient />
    </>
  );
}