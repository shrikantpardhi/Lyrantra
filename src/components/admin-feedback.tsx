"use client";

import { Suspense, type ReactNode } from "react";
import { NoticeToast, ToastProvider } from "@/components/ui-feedback";

export function AdminFeedbackShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <NoticeToast />
      </Suspense>
      {children}
    </ToastProvider>
  );
}
