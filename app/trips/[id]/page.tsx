import Link from "next/link";
import { ChevronRight, Film, PiggyBank } from "lucide-react";
import { InviteButton } from "@/components/invite-button";
import { MemberList, type Member } from "@/components/member-list";
import { createClient } from "@/lib/supabase/server";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: trip }, { data: members }] = await Promise.all([
    supabase.from("trips").select("id, name, invite_code").eq("id", id).single(),
    supabase.from("members").select("id, display_name, role, status").eq("trip_id", id).order("joined_at"),
  ]);
  if (!trip) return null; // layout already 404s for non-members

  const links = [
    { href: `/trips/${trip.id}/jar`, Icon: PiggyBank, title: "Trip Jar", desc: "Save a little every week" },
    { href: `/trips/${trip.id}/wrapped`, Icon: Film, title: "Trip Wrapped", desc: "Your trip, in story cards" },
  ];

  return (
    <>
      <section aria-labelledby="whos-in" className="grid gap-3">
        <div className="grid gap-0.5">
          <h2 id="whos-in" className="text-[17px] font-bold">Who&apos;s in</h2>
          <p className="text-[13px] text-muted-foreground">Share the link in your group chat. Up to 12 people.</p>
        </div>
        <MemberList tripId={trip.id} initial={(members ?? []) as Member[]} />
        <InviteButton code={trip.invite_code} tripName={trip.name} />
      </section>

      <ul className="mt-2 divide-y overflow-hidden rounded-xl border bg-card">
        {links.map(({ href, Icon, title, desc }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-ink">
                <Icon aria-hidden strokeWidth={1.8} className="size-5" />
              </span>
              <span className="grid min-w-0 flex-1">
                <span className="font-semibold">{title}</span>
                <span className="text-[13px] text-muted-foreground">{desc}</span>
              </span>
              <ChevronRight aria-hidden strokeWidth={1.8} className="size-5 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
