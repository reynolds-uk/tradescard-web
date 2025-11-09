// app/components/TierGate.tsx
"use client";
import { useMe } from "@/lib/useMe";
import PrimaryButton from "./PrimaryButton";

export default function TierGate({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const tier = me?.profile?.tier ?? "access";
  const isFree = tier === "access";

  return (
    <div className="relative">
      {children}
      {isFree && (
        <div className="absolute inset-0 z-10 backdrop-blur-sm bg-black/40 border border-neutral-800 rounded-xl flex items-center justify-center p-4">
          <div className="max-w-sm text-center">
            <div className="text-base font-semibold mb-1">Members only</div>
            <p className="text-sm text-neutral-300 mb-3">
              Upgrade to unlock full benefits and monthly rewards entries.
            </p>
            <PrimaryButton onClick={() => (window.location.href = "/join?plan=member")}>
              Unlock with Member
            </PrimaryButton>
            <div className="mt-2 text-xs text-neutral-400">From £2.99/month • Cancel any time</div>
          </div>
        </div>
      )}
    </div>
  );
}