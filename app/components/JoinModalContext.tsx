// app/components/JoinModalContext.tsx
'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type Plan = 'access' | 'member' | 'pro';
type Ctx = { open: boolean; plan: Plan | null; openJoin: (p?: Plan) => void; closeJoin: () => void; };

const JoinCtx = createContext<Ctx | null>(null);

export function JoinModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const openJoin = useCallback((p?: Plan) => { setPlan(p ?? null); setOpen(true); }, []);
  const closeJoin = useCallback(() => setOpen(false), []);
  return <JoinCtx.Provider value={{ open, plan, openJoin, closeJoin }}>{children}</JoinCtx.Provider>;
}
export function useJoinModal() {
  const ctx = useContext(JoinCtx);
  if (!ctx) throw new Error('useJoinModal must be used within JoinModalProvider');
  return ctx;
}