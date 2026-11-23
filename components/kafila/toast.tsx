"use client";

import { Check, CircleAlert } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "error";
type Toast = { id: number; message: string; tone: Tone; leaving: boolean };
type ToastFn = (message: string, opts?: { tone?: Tone }) => void;

const ToastContext = createContext<ToastFn>(() => {});

/** `const toast = useToast(); toast("Chalo! Plan saved", { tone: "success" })`. One at a time; a new toast replaces the old. */
export const useToast = () => useContext(ToastContext);

const SHOW_MS = 2600;
const LEAVE_MS = 200;

/** Wraps the app and owns the single live region, so any screen can toast without mounting its own. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<Toast | null>(null);
  const timers = useRef<number[]>([]);
  const nextId = useRef(0);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const toast = useCallback<ToastFn>((message, opts) => {
    timers.current.forEach(clearTimeout);
    const id = ++nextId.current;
    setCurrent({ id, message, tone: opts?.tone ?? "default", leaving: false });
    timers.current = [
      window.setTimeout(() => setCurrent((t) => (t?.id === id ? { ...t, leaving: true } : t)), SHOW_MS),
      window.setTimeout(() => setCurrent((t) => (t?.id === id ? null : t)), SHOW_MS + LEAVE_MS),
    ];
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(88px+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md justify-center"
      >
        {current && (
          <p
            key={current.id}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 py-2 text-[15px] font-semibold text-wash",
              current.leaving ? "toast-out" : current.tone === "error" ? "toast-in wiggle" : "toast-in",
            )}
          >
            {current.tone === "success" && <Check aria-hidden className="size-4 shrink-0 text-truck-yellow" strokeWidth={3} />}
            {current.tone === "error" && <CircleAlert aria-hidden className="size-4 shrink-0 text-truck-yellow" strokeWidth={2.5} />}
            {current.message}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}
