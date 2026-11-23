import Image from "next/image";
import { GoogleButton } from "@/components/google-button";
import { PaintedBoard } from "@/components/kafila/painted-board";
import { TripEntryForm } from "@/components/trip-entry-form";
import { createClient } from "@/lib/supabase/server";
import { displayNameOf } from "@/lib/supabase/user";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="mx-auto grid w-full max-w-md content-start gap-6 px-4 pt-8 pb-12">
      <PaintedBoard className="[&_p:first-child]:py-1 [&_p:first-child]:text-[36px]">Kafila</PaintedBoard>
      <section aria-labelledby="invited" className="grid gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <Image src="/illustrations/chai.svg" alt="" width={160} height={160} className="size-16 shrink-0 sm:size-20" />
          <div className="grid gap-1">
            <h1 id="invited" className="text-[22px] leading-tight font-bold">You&apos;re invited</h1>
            <p className="text-muted-foreground">Chai&apos;s on. Your friends are planning a trip and saved you a seat. Add your name to hop in.</p>
          </div>
        </div>
        <TripEntryForm mode="join" code={code} defaultName={displayNameOf(user)} />
        {(!user || user.is_anonymous) && <GoogleButton next={`/join/${encodeURIComponent(code)}`} />}
      </section>
    </main>
  );
}
