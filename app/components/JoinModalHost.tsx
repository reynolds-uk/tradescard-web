// app/components/JoinModalHost.tsx
"use client";

import JoinModal from "./JoinModal";
import { useJoinModal } from "./JoinModalContext";
import { useJoinActions } from "./useJoinActions";

export default function JoinModalHost() {
  // ⬇️ drop `plan` to satisfy no-unused-vars
  const { open, closeJoin } = useJoinModal();
  const { busy, error, joinFree, startMembership } = useJoinActions();

  if (!open) return null;

  return (
    <JoinModal
      open={open}
      onClose={closeJoin}
      onJoinFree={joinFree}
      onMember={() => startMembership("member")}
      onPro={() => startMembership("pro")}
      busy={busy}
      error={error}
    />
  );
}