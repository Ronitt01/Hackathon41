"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { burst } from "@/components/kafila/confetti";
import { useToast } from "@/components/kafila/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { success, tap } from "@/lib/haptics";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";
import { SELECT, type CrewMember } from "./roles";

export type Task = { id: string; title: string; owner_member: string | null; done: boolean };
import { TASK_COLUMNS } from "./columns";

/** S-1 task split: add, assign, tick off, delete. Live for everyone via Realtime. */
export function Tasks({ tripId, members, initial }: { tripId: string; members: CrewMember[]; initial: Task[] }) {
  const [tasks, setTasks] = useState(initial);
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  });
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [ticked, setTicked] = useState<string | null>(null); // the box I just ticked pops; boxes done on load don't
  const doneCount = useRef(0);
  const crew = members.filter((m) => m.status !== "dropped");

  useEffect(() => {
    const supabase = createClient();
    const refresh = async () => {
      const { data } = await supabase.from("tasks").select(TASK_COLUMNS).eq("trip_id", tripId).order("created_at");
      if (data) setTasks(data);
    };
    const channel = supabase
      .channel(`trip:${tripId}:tasks`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `trip_id=eq.${tripId}` }, refresh)
      // Realtime can't filter DELETEs (old row carries only the id): listen unfiltered, refetch only for rows we hold.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "tasks" }, (p) => {
        if (tasksRef.current.some((t) => t.id === (p.old as { id?: string }).id)) void refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  // Every action re-reads so this phone updates even if Realtime is slow.
  async function run(action: (s: ReturnType<typeof createClient>) => PromiseLike<{ error: unknown }>) {
    setError(null);
    const supabase = createClient();
    const { error } = await action(supabase);
    const { data } = await supabase.from("tasks").select(TASK_COLUMNS).eq("trip_id", tripId).order("created_at");
    if (data) {
      tasksRef.current = data; // toggle() reads it right after this resolves, before the next render
      setTasks(data);
    }
    if (error) setError(errorMessage(error));
    return !error;
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return setError("Write what needs doing.");
    setPending(true);
    const ok = await run((s) => s.from("tasks").insert({ trip_id: tripId, title: title.trim(), owner_member: owner || null }));
    setPending(false);
    if (ok) {
      setTitle("");
      setOwner("");
    }
  }

  async function toggle(t: Task, checked: boolean) {
    setTicked(checked ? t.id : null);
    if (!(await run((s) => s.from("tasks").update({ done: checked }).eq("id", t.id))) || !checked) return;
    if (tasksRef.current.every((x) => x.done)) {
      success();
      burst();
      return toast("Every task done. Scene set hai!", { tone: "success" });
    }
    tap();
    // Praise the first tick, then every third: often enough to feel seen, rare enough to stay fun.
    if (doneCount.current++ % 3 === 0) toast("Task done, legend", { tone: "success" });
  }

  const done = tasks.filter((t) => t.done).length;

  return (
    <div className="grid gap-3">
      {tasks.length ? (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card" aria-label="Tasks">
          {tasks.map((t) => (
            <li key={t.id} className="grid gap-2 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={(e) => toggle(t, e.target.checked)}
                    className={`size-5 shrink-0 cursor-pointer ${t.done && ticked === t.id ? "pop" : ""}`}
                  />
                  {/* The strike is a background line so it can sweep across wrapped lines; forced-colors falls back to line-through. */}
                  <span
                    className={`bg-[linear-gradient(currentColor,currentColor)] bg-[position:0_55%] bg-no-repeat motion-safe:transition-[background-size,color] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      t.done ? "bg-[length:100%_1.5px] text-muted-foreground forced-colors:line-through" : "bg-[length:0%_1.5px] font-semibold"
                    }`}
                  >
                    {t.title}
                  </span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  className="size-11 p-0"
                  aria-label={`Delete "${t.title}"`}
                  onClick={() => run((s) => s.from("tasks").delete().eq("id", t.id))}
                >
                  <Trash2 aria-hidden strokeWidth={1.8} className="size-5" />
                </Button>
              </div>
              <label className="sr-only" htmlFor={`owner-${t.id}`}>Who&apos;s on &quot;{t.title}&quot;</label>
              <select
                id={`owner-${t.id}`}
                className={SELECT}
                value={t.owner_member ?? ""}
                onChange={(e) => run((s) => s.from("tasks").update({ owner_member: e.target.value || null }).eq("id", t.id))}
              >
                <option value="">Nobody yet</option>
                {crew.map((m) => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] text-muted-foreground">No tasks yet. Add the first one: book the cab, find a stay, buy snacks.</p>
      )}
      {tasks.length > 0 && <p className="tabular text-[13px] text-muted-foreground">{done} of {tasks.length} done</p>}

      <form onSubmit={add} className="grid gap-2 border-t pt-3">
        <Label htmlFor="task-title">New task</Label>
        <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Book the cab to the airport" className="h-11" />
        <Label htmlFor="task-owner">Who&apos;s on it</Label>
        <select id="task-owner" className={SELECT} value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">Decide later</option>
          {crew.map((m) => (
            <option key={m.id} value={m.id}>{m.display_name}</option>
          ))}
        </select>
        <Button type="submit" variant="outline" className="h-11" disabled={pending}>
          <Plus aria-hidden strokeWidth={1.8} className="size-5" />
          {pending ? "Adding…" : "Add task"}
        </Button>
      </form>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
    </div>
  );
}
