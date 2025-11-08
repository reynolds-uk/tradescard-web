// app/components/JoinModalHost.tsx
"use client";

import JoinModal from "./JoinModal";
import { useJoinModal } from "./JoinModalContext";
import { useJoinActions } from "./useJoinActions";

const TRIAL = process.env.NEXT_PUBLIC_TRIAL_ACTIVE === "true";
const TRIAL_COPY =
  process.env.NEXT_PUBLIC_TRIAL_COPY || "Try Member for £1 (90 days)";

export default function JoinModalHost() {
  // from context: no `state` anymore
  const { open, close } = useJoinModal();

  // where to bounce back after auth/checkout
  const next =
    typeof window !== "undefined" ? window.location.pathname : "/";

  // wire actions for the modal CTAs
  const { busy, error, joinFree, startMembership } = useJoinActions(next);

  // you can use these flags for promo labelling if needed by the modal
  const isPromo = TRIAL;
  const memberPriceText = TRIAL ? TRIAL_COPY : "£2.99/mo";
  const proPriceText = "£7.99/mo";

  return (
    <JoinModal
      open={open}
      onClose={close}
      onJoinFree={joinFree}
      onMember={() => startMembership("member")}
      onPro={() => startMembership("pro")}
      busy={busy}
      error={error}
      // If you later want to surface promo text inside JoinModal,
      // just add props for it and pass { isPromo, memberPriceText, proPriceText }.
    />
  );
}