// tradescard-web/app/components/ManageBillingButton.tsx
"use client";

import { useState } from "react";
import { openBillingPortal } from "@/lib/billing";
import PrimaryButton from "@/components/PrimaryButton";
import { track } from "@/lib/track";

export default function ManageBillingButton({ className = "" }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleClick = async () => {
    setErr(null);
    setLoading(true);
    track("account_manage_billing_click");
    try {
      await openBillingPortal("/account");
    } catch (e: any) {
      setErr(e?.message || "We couldn’t open billing just now.");
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <PrimaryButton onClick={handleClick} disabled={loading} className="w-full sm:w-auto">
        {loading ? "Opening…" : "Manage billing"}
      </PrimaryButton>
      {err && (
        <div className="mt-2 text-sm text-red-300 rounded border border-red-600/40 bg-red-900/10 px-3 py-2">
          {err}
        </div>
      )}
    </div>
  );
}