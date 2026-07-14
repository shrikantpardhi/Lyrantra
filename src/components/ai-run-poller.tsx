"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

/** Poll the AI workspace while a run is queued/running so status flips to failed/needs review without a manual refresh. */
export function AIRunPoller({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      router.refresh();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [active, router]);

  if (!active) return null;

  return (
    <div className="notice" style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <LoaderCircle size={15} className="spin" aria-hidden />
      Research is running in the background. This page refreshes automatically…
    </div>
  );
}
