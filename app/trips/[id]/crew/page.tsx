import { PaintedBoard } from "@/components/kafila/painted-board";
import { CREW_COLUMNS, PACKING_COLUMNS, TASK_COLUMNS } from "@/components/crew/columns";
import { Packing } from "@/components/crew/packing";
import { ParentLink } from "@/components/crew/parent-link";
import { Roles, type CrewMember } from "@/components/crew/roles";
import { Tasks } from "@/components/crew/tasks";
import { errorMessage } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

/** S-1 roles + tasks, S-2 who-brings-what, T-3 parent link. Lives under the Trip tab. */
export default async function CrewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const [trip, members, me, tasks, packing] = await Promise.all([
    supabase.from("trips").select("name").eq("id", id).single(),
    supabase.from("members").select(CREW_COLUMNS).eq("trip_id", id).order("joined_at"),
    supabase.from("members").select("id, role").eq("trip_id", id).eq("user_id", auth.user?.id ?? "").maybeSingle(),
    supabase.from("tasks").select(TASK_COLUMNS).eq("trip_id", id).order("created_at"),
    supabase.from("packing_items").select(PACKING_COLUMNS).eq("trip_id", id).order("created_at"),
  ]);
  const meId: string | undefined = me.data?.id;
  // parent_links and locations are owner-only under RLS: these return only my rows.
  const [link, loc] = meId
    ? await Promise.all([
        supabase
          .from("parent_links")
          .select("id, token, share_location")
          .eq("trip_id", id)
          .is("revoked_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("locations").select("updated_at").eq("member_id", meId).maybeSingle(),
      ])
    : [];
  const error = trip.error ?? members.error ?? me.error ?? tasks.error ?? packing.error ?? link?.error ?? loc?.error;
  if (error) return <p role="alert" className="text-[13px] text-destructive">{errorMessage(error)}</p>;
  if (!meId || !trip.data) return <p className="text-muted-foreground">Join this trip to see the crew.</p>;

  const crew = (members.data ?? []) as CrewMember[];
  const active = crew.filter((m) => m.status !== "dropped");
  const roleless = active.filter((m) => !m.task_role).length;

  return (
    <>
      <PaintedBoard note={crew.find((m) => m.id === meId)?.task_role ? undefined : "Pick yours below"}>
        {roleless === 0 ? "Everyone has a job" : roleless === 1 ? "1 still needs a role" : `${roleless} still need a role`}
      </PaintedBoard>

      <section aria-labelledby="crew-roles" className="grid gap-3">
        <div className="grid gap-0.5">
          <h2 id="crew-roles" className="text-[17px] font-bold">Roles</h2>
          <p className="text-[13px] text-muted-foreground">
            {me.data?.role === "organizer" ? "You can set anyone's role." : "Set your own role. The organiser can set anyone's."}
          </p>
        </div>
        <Roles tripId={id} meId={meId} isOrganizer={me.data?.role === "organizer"} initial={crew} />
      </section>

      <section aria-labelledby="crew-tasks" className="grid gap-3 border-t pt-4">
        <h2 id="crew-tasks" className="text-[17px] font-bold">Tasks</h2>
        <Tasks tripId={id} members={crew} initial={tasks.data ?? []} />
      </section>

      <section aria-labelledby="crew-packing" className="grid gap-3 border-t pt-4">
        <div className="grid gap-0.5">
          <h2 id="crew-packing" className="text-[17px] font-bold">Who brings what</h2>
          <p className="text-[13px] text-muted-foreground">Shared stuff only. Claim it so nobody packs two speakers.</p>
        </div>
        <Packing tripId={id} meId={meId} members={crew} initial={packing.data ?? []} />
      </section>

      <ParentLink
        tripId={id}
        meId={meId}
        tripName={trip.data.name}
        initial={link?.data ?? null}
        locationUpdatedAt={loc?.data?.updated_at ?? null}
      />
    </>
  );
}
