"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  push: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: ToastTone = "success") => {
    const id = crypto.randomUUID();
    setItems((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions">
        {items.map((item) => (
          <div className={`toast toast-${item.tone}`} key={item.id} role="status">
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

export function NoticeToast() {
  const searchParams = useSearchParams();
  const { push } = useToast();
  const notice = searchParams.get("notice");
  const error = searchParams.get("error");

  useEffect(() => {
    if (!notice && !error) return;
    if (notice) push(notice, "success");
    if (error) push(error, "error");
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    url.searchParams.delete("error");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", next);
  }, [notice, error, push]);

  return null;
}

type PendingSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
};

export function PendingSubmitButton({
  children,
  pendingLabel = "Working…",
  className,
  disabled,
  style,
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={disabled || pending}
      aria-busy={pending}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, ...style }}
      {...props}
    >
      {pending ? (
        <>
          <LoaderCircle size={15} className="spin" aria-hidden />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
