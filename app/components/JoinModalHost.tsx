// app/components/JoinModalHost.tsx
'use client';
import JoinModal from '@/components/JoinModal';
import { useJoinModal } from '@/components/JoinModalContext';
import { useJoinActions } from '@/components/useJoinActions';

export default function JoinModalHost() {
  const { open, plan, closeJoin } = useJoinModal();
  const { busy, error, joinFree, startMembership } = useJoinActions();

  return (
    <JoinModal
      open={open}
      onClose={close}
      onJoinFree={joinFree}
      onMember={(billing) => startMembership("member", billing)}
      onPro={(billing) => startMembership("pro", billing)}
      busy={busy}
      error={error}
      initialPlan={plan}
    />
  );
}