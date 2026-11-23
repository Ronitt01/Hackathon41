import Link from "next/link";
import { ChevronRight, Film, MapPinned, PiggyBank, Users } from "lucide-react";
import { InviteButton } from "@/components/invite-button";
import { PaintedBoard } from "@/components/kafila/painted-board";
import { MemberList, type Member } from "@/components/member-list";
import { createClient } from "@/lib/supabase/server";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const [{ data: trip }, { data: members }, { data: me }, { data: tasks }] = await Promise.all([
    supabase.from("trips").select("id, name, invite_code, pledge_paise").eq("id", id).single(),
    supabase.from("members").select("id, display_name, role, status, task_role").eq("trip_id", id).order("joined_at"),
    supabase.from("members").select("id, role").eq("trip_id", id).eq("user_id", auth.user?.id ?? "").maybeSingle(),
    supabase.from("tasks").select("id, title, owner_member, done").eq("trip_id", id).order("created_at"),
  ]);
  if (!trip) return null; // layout already 404s for non-members

  const active = (members ?? []).filter((m) => m.status !== "dropped");
  const confirmed = active.filter((m) => m.status === "confirmed").length;
  const openTasks = (tasks ?? []).filter((t) => !t.done);
  const open = openTasks.length;
  // S-1: up to three open tasks on the home, the viewer's own first.
  const topTasks = [...openTasks].sort((a, b) => Number(b.owner_member === me?.id) - Number(a.owner_member === me?.id)).slice(0, 3);
  const ownerName = (id: string | null) =>
    id === me?.id ? "You" : ((members ?? []).find((m) => m.id === id)?.display_name ?? "Nobody yet");
  const crewDesc = tasks?.length
    ? open ? `${open} task${open === 1 ? "" : "s"} open · ${tasks.length - open} done` : "Every task done"
    : "Roles, tasks, who brings what";
  const links = [
    { href: `/trips/${trip.id}/crew`, Icon: Users, title: "Crew & tasks", desc: crewDesc },
    { href: `/trips/${trip.id}/live`, Icon: MapPinned, title: "On the trip", desc: "For when you're on the road" },
    { href: `/trips/${trip.id}/jar`, Icon: PiggyBank, title: "Trip Jar", desc: "Save a little every week" },
    { href: `/trips/${trip.id}/wrapped`, Icon: Film, title: "Trip Wrapped", desc: "Your trip, in story cards" },
  ];

  return (
    <>
      <PaintedBoard note={confirmed < 2 ? "Share the link to bring the gang" : undefined}>
        {active.length <= 1 ? "Just you so far" : `${confirmed} of ${active.length} in`}
      </PaintedBoard>

      <section aria-labelledby="whos-in" className="grid gap-3">
        <div className="grid gap-0.5">
          <h2 id="whos-in" className="text-[17px] font-bold">Who&apos;s in</h2>
          <p className="text-[13px] text-muted-foreground">Share the link in your group chat. Up to 12 people.</p>
        </div>
        <MemberList
          tripId={trip.id}
          initial={(members ?? []) as Member[]}
          meId={me?.id ?? null}
          isOrganizer={me?.role === "organizer"}
          pledgePaise={Number(trip.pledge_paise)} // bigint can arrive as a string
        />
        <InviteButton code={trip.invite_code} tripName={trip.name} />
      </section>

      {topTasks.length > 0 && (
        <section aria-labelledby="open-tasks" className="grid gap-2">
          <h2 id="open-tasks" className="text-[17px] font-bold">Open tasks</h2>
          <ul className="divide-y border-y">
            {topTasks.map((t) => (
              <li key={t.id} className="flex min-h-11 items-center justify-between gap-3 py-2">
                <span className="min-w-0 break-words">{t.title}</span>
                <span className={t.owner_member === me?.id ? "shrink-0 text-[13px] font-semibold text-truck-green-ink" : "shrink-0 text-[13px] text-muted-foreground"}>
                  {ownerName(t.owner_member)}
                </span>
              </li>
            ))}
          </ul>
          <Link href={`/trips/${trip.id}/crew`} className="inline-flex h-11 items-center gap-1 justify-self-start font-semibold underline-offset-4 hover:underline">
            {open > topTasks.length ? `See all ${open} tasks` : "See all tasks"}
            <ChevronRight aria-hidden strokeWidth={1.8} className="size-4" />
          </Link>
        </section>
      )}

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
