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
      onClose={closeJoin}
      onJoinFree={joinFree}
      onMember={() => startMembership('member')}
      onPro={() => startMembership('pro')}
      busy={busy}
      error={error}
      initialPlan={plan ?? undefined}
    />
  );
}