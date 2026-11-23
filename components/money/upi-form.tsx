"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";
import { isValidVpa } from "@/lib/upi";

export function UpiForm({ meId, current, onChange }: { meId: string; current: string | null; onChange: () => void }) {
  const [vpa, setVpa] = useState(current ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = vpa.trim();
    if (value && !isValidVpa(value)) return setError("That doesn't look like a UPI ID — it should be like name@okicici.");
    setPending(true);
    setError(null);
    const { error } = await createClient().from("members").update({ upi_vpa: value || null }).eq("id", meId);
    setPending(false);
    if (error) setError(errorMessage(error));
    else onChange();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2">
      <Label htmlFor="upi-vpa" className="sr-only">UPI ID</Label>
      <div className="flex gap-2">
        <Input id="upi-vpa" value={vpa} onChange={(e) => setVpa(e.target.value)} placeholder="name@okicici" autoCapitalize="none" autoComplete="off" className="h-11 min-w-0 flex-1 bg-card text-[15px]" />
        <Button type="submit" className="h-11 px-5 text-[15px]" disabled={pending || vpa.trim() === (current ?? "")}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
    </form>
  );
}
