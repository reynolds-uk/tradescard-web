// app/components/JoinModalHost.tsx
"use client";

import { useJoinModal } from "./JoinModalContext";
import JoinModal from "./JoinModal";
import { useJoinActions } from "./useJoinActions";

export default function JoinModalHost() {
  const { state, close } = useJoinModal();
  const { 
    isPromo,
    memberPriceText, proPriceText,
    memberCtaText,  proCtaText,
    busy, error,
    startMembership, joinFree
  } = useJoinActions("/welcome");

  return (
    <JoinModal
      open={state.open}
      onClose={close}
      busy={busy}
      error={error}
      // labels / price decoration
      isPromo={isPromo}
      memberPriceText={memberPriceText}
      proPriceText={proPriceText}
      memberCtaText={memberCtaText}
      proCtaText={proCtaText}
      // actions
      onJoinFree={() => joinFree({ next: "/welcome" })}
      onMember={() => startMembership("member", { next: "/welcome" })}
      onPro={() => startMembership("pro", { next: "/welcome" })}
    />
  );
}