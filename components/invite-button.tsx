"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useToast } from "@/components/kafila/toast";
import { Button } from "@/components/ui/button";
import { tap } from "@/lib/haptics";

/** Opens the phone's share sheet (WhatsApp etc.); falls back to copying the link. The toast announces the result. */
export function InviteButton({ code, tripName }: { code: string; tripName: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${location.origin}/join/${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: tripName, text: `Join "${tripName}" on Kafila`, url });
        tap();
        toast("Invite on its way", { tone: "success" });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // user closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return toast("Couldn't copy the link. Try again?", { tone: "error" });
    }
    tap();
    toast("Link copied — drop it in the group", { tone: "success" });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" onClick={share} className="h-11 w-full">
      {copied ? <Check aria-hidden strokeWidth={1.8} className="pop size-5" /> : <Share2 aria-hidden strokeWidth={1.8} className="size-5" />}
      {copied ? "Link copied" : "Invite friends"}
    </Button>
  );
}
