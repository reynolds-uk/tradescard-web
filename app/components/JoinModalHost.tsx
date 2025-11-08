"use client";

import JoinModal from "./JoinModal";
import { useJoinModal } from "./JoinModalContext";
import { useJoinActions } from "./useJoinActions";

const TRIAL = process.env.NEXT_PUBLIC_TRIAL_ACTIVE === "true";
const TRIAL_COPY =
  process.env.NEXT_PUBLIC_TRIAL_COPY || "Try Member for £1 (90 days)";

export default function JoinModalHost() {
  // Context: expose `open` and `closeJoin` (not `close`)
  const { open, closeJoin } = useJoinModal();

  // Where to return after auth/checkout
  const next =
    typeof window !== "undefined" ? window.location.pathname : "/";

  // Wire actions to modal CTAs
  const { busy, error, joinFree, startMembership } = useJoinActions(next);

  // (Optional) promo flags if you want to thread them into the modal later
  const isPromo = TRIAL;
  const memberPriceText = TRIAL ? TRIAL_COPY : "£2.99/mo";
  const proPriceText = "£7.99/mo";

  return (
    <JoinModal
      open={open}
      onClose={closeJoin}
      onJoinFree={joinFree}
      onMember={() => startMembership("member")}
      onPro={() => startMembership("pro")}
      busy={busy}
      error={error}
      // If you add props to JoinModal later, pass { isPromo, memberPriceText, proPriceText }
    />
  );
}