"use client";

import { useEffect, useState } from "react";
import { NAV_LINK } from "./kit";

/** Link text echoes each section's heading, so the word you click is the word you land on. */
const LINKS = [
  { id: "how", label: "Fair plan" },
  { id: "decide", label: "Vote" },
  { id: "money", label: "Settle up" },
  { id: "privacy", label: "What stays private" },
  { id: "faq", label: "Questions" },
];

/** The header's section links, marking the one whose section crosses the middle of the screen. */
export function HeaderNav() {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const on = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) on.add(e.target.id);
          else on.delete(e.target.id);
        }
        setCurrent(LINKS.find((l) => on.has(l.id))?.id ?? null);
      },
      { rootMargin: "-45% 0px -54% 0px" },
    );
    for (const l of LINKS) {
      const el = document.getElementById(l.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  return (
    <nav aria-label="Sections" className="hidden flex-1 items-center justify-center gap-7 xl:flex">
      {LINKS.map((l) => (
        <a
          key={l.id}
          href={`#${l.id}`}
          aria-current={current === l.id ? "true" : undefined}
          className={`${NAV_LINK} aria-[current=true]:text-ink aria-[current=true]:after:scale-x-100`}
        >
          {l.label}
        </a>
      ))}
    </nav>
  );
}
