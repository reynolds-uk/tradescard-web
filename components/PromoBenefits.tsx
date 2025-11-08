"use client";
import PrimaryButton from "@/components/PrimaryButton";
import { routeToJoin } from "@/lib/routeToJoin";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { useMe } from "@/lib/useMe";

export default function PromoBenefits() {
  const me = useMe();
  const trial = shouldShowTrial(me);
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <h1 className="text-xl font-semibold">Benefits</h1>
      <p className="mt-2 text-neutral-300 text-sm">
        Upgrade your tradecard membership for built-in protection and support.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-neutral-200">
        <li>• WeCare 24/7 wellbeing support</li>
        <li>• AA Lite roadside assistance (Pro)</li>
        <li>• Priority partner hotline (Pro)</li>
      </ul>
      <div className="mt-4">
        <PrimaryButton onClick={() => routeToJoin("member")}>
          {trial ? TRIAL_COPY : "Become a Member"}
        </PrimaryButton>
      </div>
    </section>
  );
}
