import Link from "next/link";
import { notFound } from "next/navigation";
import { TripTabs } from "@/components/trip-tabs";
import { createClient } from "@/lib/supabase/server";

export default async function TripLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // RLS returns nothing unless the viewer is a member, so "not found" also covers "not yours".
  const { data: trip } = await supabase.from("trips").select("id, name").eq("id", id).maybeSingle();
  if (!trip) notFound();

  return (
    <main className="mx-auto grid w-full max-w-md gap-6 px-4 py-8">
      <header className="grid gap-3">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">← All trips</Link>
        <h1 className="text-2xl font-semibold tracking-tight">{trip.name}</h1>
        <TripTabs tripId={trip.id} />
      </header>
      {children}
    </main>
  );
}
