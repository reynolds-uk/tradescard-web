"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import Container from "@/components/Container";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const ready = useMeReady();
  const router = useRouter();
  const isPaid = (me?.tier === "member" || me?.tier === "pro") &&
                 (me?.status === "active" || me?.status === "trialing");

  useEffect(() => {
    if (!ready) return;
    if (!isPaid) router.replace("/join?mode=signin");
  }, [ready, isPaid, router]);

  if (!ready || !isPaid) return null;
  return <Container>{children}</Container>;
}
