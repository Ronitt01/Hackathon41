import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayInIndia } from "@/lib/dates";
import { buildDemoSeed, SAMPLE_TRIP_NAME, type SampleFriend, type Who } from "@/lib/demo-seed";
import { createAdminClient, MISSING_SECRET_KEY } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { displayNameOf } from "@/lib/supabase/user";
import manifest from "@/public/photos/manifest.json";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });
const REUSE_MS = 10 * 60_000;

/** "Try the demo trip": seeds a populated sample Goa trip for the caller and returns { tripId }. */
export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in first.");
  const user = auth.user;

  // Light rate limit: a sample trip made in the last 10 minutes is handed back instead of seeding another.
  // Only a fully seeded one (packing is fill()'s last insert), never one another request is still filling.
  const { data: recent } = await supabase
    .from("trips")
    .select("id, packing_items!inner(id)")
    .eq("created_by", user.id)
    .eq("name", SAMPLE_TRIP_NAME)
    .gte("created_at", new Date(Date.now() - REUSE_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent) return NextResponse.json({ tripId: recent.id });

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch {
    return fail(503, MISSING_SECRET_KEY);
  }

  const seed = buildDemoSeed({ today: todayInIndia(), photos: manifest });
  try {
    const ids = await Promise.all(seed.friends.map((f) => ensureSampleUser(admin, f)));
    seed.friends = seed.friends.map((f, i) => ({ ...f, userId: ids[i] }));
  } catch (err) {
    console.error("demo: sample users failed", err);
    return fail(500, "Couldn't set up the sample friends. Please try again.");
  }

  // Same RPC as the create form, as the caller: trip + organizer member (confirmed) + empty chosen plan.
  const callerName = (displayNameOf(user).trim() || "You").slice(0, 40);
  const { data: tripId, error: createError } = await supabase.rpc("create_trip", { p_name: seed.trip.name, p_display_name: callerName });
  if (createError || !tripId) {
    console.error("demo: create_trip failed", createError);
    return fail(500, "Couldn't create the sample trip. Please try again.");
  }

  try {
    await fill(admin, tripId as string, user.id, seed);
  } catch (err) {
    console.error("demo: seeding failed", err);
    const { error: cleanupError } = await admin.from("trips").delete().eq("id", tripId); // cascade removes everything seeded so far
    if (cleanupError) console.error("demo: cleanup of half-seeded trip failed", tripId, cleanupError);
    return fail(500, "Couldn't fill in the sample trip. Please try again.");
  }
  // Every sample budget is in, so the automatic plan would race the reveal the caller is about to watch: hold it off.
  await admin.from("trips").update({ auto_plan_at: new Date().toISOString() }).eq("id", tripId); // fails quietly before 0003
  return NextResponse.json({ tripId });
}

/** Reuses the sample auth user (fixed id, else found by email), creating it once. Returns its id.
 *  The random password is never stored or returned. */
async function ensureSampleUser(admin: SupabaseClient, f: SampleFriend): Promise<string> {
  if ((await admin.auth.admin.getUserById(f.userId)).data.user) return f.userId;
  const { data, error } = await admin.auth.admin.createUser({
    id: f.userId,
    email: f.email,
    password: randomBytes(24).toString("base64url"),
    email_confirm: true,
    user_metadata: { display_name: f.name, sample: true },
  });
  if (data.user) return data.user.id;
  // A parallel click made it a moment ago, or the email already exists under another id.
  if ((await admin.auth.admin.getUserById(f.userId)).data.user) return f.userId;
  // shortcut: scans the first 1,000 auth users only; fine for a hackathon project, use a lookup RPC if it grows.
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find((u) => u.email === f.email);
  if (existing) return existing.id;
  throw error;
}

/** Throws on the first failed insert; the caller deletes the trip. */
async function fill(admin: SupabaseClient, tripId: string, userId: string, seed: ReturnType<typeof buildDemoSeed>) {
  const must = <T>({ data, error }: { data: T; error: unknown }): NonNullable<T> => {
    if (error) throw error;
    return data as NonNullable<T>;
  };

  must(await admin.from("trips").update({ destination: seed.trip.destination, start_date: seed.trip.startDate, end_date: seed.trip.endDate }).eq("id", tripId));
  const me = must(await admin.from("members").select("id").eq("trip_id", tripId).eq("user_id", userId).single());
  const friendRows = must(
    await admin
      .from("members")
      .insert(seed.friends.map((f) => ({ trip_id: tripId, user_id: f.userId, display_name: f.name, home_city: f.homeCity, status: f.status })))
      .select("id, user_id"),
  ) as { id: string; user_id: string }[];
  const memberIds = new Map<Who, string>([["me", me.id]]);
  for (const f of seed.friends) memberIds.set(f.key, friendRows.find((r) => r.user_id === f.userId)!.id);
  const mid = (who: Who) => memberIds.get(who)!;

  // Budgets and prefs for everyone. The caller gets editable starter answers too: without them they score the
  // bare 40% baseline and become the "least happy friend" on every demo. Their row stays private to them.
  must(await admin.from("member_private").insert([
    ...seed.friends.map((f) => ({ member_id: mid(f.key), trip_id: tripId, budget_paise: f.budgetPaise, prefs: f.prefs })),
    { member_id: me.id, trip_id: tripId, budget_paise: 1_200_000, prefs: { beach: 1, cafes: 1, culture: 1 } },
  ]));

  const decision = must(await admin.from("decisions").insert({ trip_id: tripId, question: seed.decision.question, kind: seed.decision.kind, deadline: seed.decision.deadline }).select("id").single()) as { id: string };
  const optionRows = must(
    await admin
      .from("options")
      .insert(seed.options.map((o) => ({ trip_id: tripId, decision_id: o.inDecision ? decision.id : null, kind: o.kind, title: o.title, description: o.description, price_paise: o.pricePaise, image_url: o.imageUrl, tags: o.tags, source: "seed", created_by: mid(o.by) })))
      .select("id, title"),
  ) as { id: string; title: string }[];
  const optionIds = new Map(seed.options.map((o) => [o.key, optionRows.find((r) => r.title === o.title)!.id]));
  const oid = (key: string) => optionIds.get(key)!;

  const aspectRows = must(
    await admin
      .from("option_aspects")
      .insert(seed.options.flatMap((o) => o.aspects.map((a, position) => ({ trip_id: tripId, option_id: oid(o.key), label: a.label, kind: a.kind, value: a.value, position }))))
      .select("id, option_id, label"),
  ) as { id: string; option_id: string; label: string }[];
  const aid = (option: string, label?: string) => (label ? aspectRows.find((a) => a.option_id === oid(option) && a.label === label)!.id : null);

  must(await admin.from("reactions").insert(seed.reactions.map((r) => ({ trip_id: tripId, option_id: oid(r.option), aspect_id: aid(r.option, r.aspect), member_id: mid(r.who), kind: r.kind }))));
  must(await admin.from("comments").insert(seed.comments.map((c) => ({ trip_id: tripId, option_id: oid(c.option), aspect_id: aid(c.option, c.aspect), member_id: mid(c.who), body: c.body }))));

  for (const e of seed.expenses) {
    const expense = must(
      await admin
        .from("expenses")
        .insert({ trip_id: tripId, paid_by: mid(e.paidBy), title: e.title, amount_paise: e.amountPaise, category: e.category, split_type: e.splitType, created_by: mid(e.paidBy) })
        .select("id")
        .single(),
    ) as { id: string };
    must(await admin.from("expense_shares").insert(e.shares.filter((s) => s.amountPaise > 0).map((s) => ({ expense_id: expense.id, member_id: mid(s.who), trip_id: tripId, amount_paise: s.amountPaise }))));
    for (const item of e.items) {
      const row = must(await admin.from("expense_items").insert({ trip_id: tripId, expense_id: expense.id, name: item.name, amount_paise: item.amountPaise, kind: item.kind }).select("id").single()) as { id: string };
      if (item.claimers.length) must(await admin.from("expense_item_claims").insert(item.claimers.map((who) => ({ item_id: row.id, member_id: mid(who), trip_id: tripId }))));
    }
  }

  must(await admin.from("tasks").insert(seed.tasks.map((t) => ({ trip_id: tripId, title: t.title, owner_member: mid(t.owner), done: t.done }))));
  must(await admin.from("packing_items").insert(seed.packing.map((p) => ({ trip_id: tripId, name: p.name, member_id: p.who ? mid(p.who) : null }))));
}
