"use client";
import PrimaryButton from "@/components/PrimaryButton";
import { routeToJoin } from "@/lib/routeToJoin";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { useMe } from "@/lib/useMe";

export default function PromoRewards() {
  const me = useMe();
  const trial = shouldShowTrial(me);
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <h1 className="text-xl font-semibold">Rewards</h1>
      <p className="mt-2 text-neutral-300 text-sm">
        Upgrade your tradecard membership to unlock weekly and monthly prize entries.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-neutral-200">
        <li>• Points become prize entries automatically</li>
        <li>• Member 1.25× boost • Pro 1.5× boost</li>
        <li>• More coming soon</li>
      </ul>
      <div className="mt-4">
        <PrimaryButton onClick={() => routeToJoin("member")}>
          {trial ? TRIAL_COPY : "Start with Member"}
        </PrimaryButton>
      </div>
    </section>
  );
}
