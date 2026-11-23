"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Opens the phone's share sheet (WhatsApp etc.); falls back to copying the link. */
export function InviteButton({ code, tripName }: { code: string; tripName: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${location.origin}/join/${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: tripName, text: `Join "${tripName}" on Kafila`, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // user closed the sheet
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" onClick={share} className="h-11 w-full" aria-live="polite">
      {copied ? <Check aria-hidden strokeWidth={1.8} className="size-5" /> : <Share2 aria-hidden strokeWidth={1.8} className="size-5" />}
      {copied ? "Link copied" : "Invite friends"}
    </Button>
  );
}
