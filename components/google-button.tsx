"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { errorMessage, signInWithGoogle } from "@/lib/supabase/auth";

export function GoogleButton({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full bg-card"
        onClick={() => signInWithGoogle(next).catch((e) => setError(errorMessage(e)))}
      >
        Continue with Google
      </Button>
      {error && <p role="alert" className="text-[15px] text-destructive">{error}</p>}
    </div>
  );
}
