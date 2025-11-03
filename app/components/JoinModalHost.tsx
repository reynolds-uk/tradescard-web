"use client";

import JoinModal from "@/components/JoinModal";
import { useJoinActions } from "@/components/useJoinActions";
import { useJoinModal } from "@/components/JoinModalContext";

type Plan = "member" | "pro" | "access";

export default function JoinModalHost() {
  const { open, plan, close } = useJoinModal(); // <- no unused vars
  const { busy, error, joinFree, startMembership } = useJoinActions();

  if (!open) return null;

  return (
    <JoinModal
      open={open}
      onClose={close}
      onJoinFree={joinFree}
      onMember={(billing) => startMembership("member", billing)}
      onPro={(billing) => startMembership("pro", billing)}
      busy={busy}
      error={error}
      initialPlan={plan as Plan}
    />
  );
}