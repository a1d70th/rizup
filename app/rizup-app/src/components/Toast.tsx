"use client";
import { useEffect, useState } from "react";

export type ToastKind = "success" | "error" | "info";

interface ToastData {
  id: number;
  kind: ToastKind;
  message: string;
}

let listener: ((t: ToastData) => void) | null = null;
let nextId = 1;

export function showToast(kind: ToastKind, message: string) {
  listener?.({ id: nextId++, kind, message });
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    listener = (t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 4200);
    };
    return () => { listener = null; };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]"
      role="status" aria-live="polite">
      {toasts.map((t) => {
        const base = "rounded-2xl px-4 py-3 shadow-lg text-sm font-bold animate-slide-up flex items-start gap-2";
        const cls = t.kind === "success" ? "bg-mint text-white"
          : t.kind === "error" ? "bg-red-500 text-white"
          : "bg-white border border-mint text-text";
        const icon = t.kind === "success" ? "✓" : t.kind === "error" ? "⚠" : "ℹ";
        return (
          <div key={t.id} className={`${base} ${cls}`} role="alert">
            <span className="text-base leading-none mt-0.5">{icon}</span>
            <span className="flex-1 leading-relaxed">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
