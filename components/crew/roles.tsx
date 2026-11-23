"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";

export type CrewMember = { id: string; display_name: string; role: string; status: string; task_role: string | null };

export const CREW_COLUMNS = "id, display_name, role, status, task_role";
export const SELECT = "h-11 w-full rounded-lg border border-input bg-card px-2.5 text-base";
const PRESETS = ["Treasurer", "Navigator", "Food scout", "Stay hunter", "Memory keeper"];

/** S-1: everyone gets a job. The organiser can set anyone's role; members set their own. */
export function Roles({ tripId, meId, isOrganizer, initial }: { tripId: string; meId: string; isOrganizer: boolean; initial: CrewMember[] }) {
  const router = useRouter();
  const [members, setMembers] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const refresh = async () => {
      const { data } = await supabase.from("members").select(CREW_COLUMNS).eq("trip_id", tripId).order("joined_at");
      if (data) setMembers(data);
      router.refresh(); // the board counts roles
    };
    const channel = supabase
      .channel(`trip:${tripId}:crew-roles`)
      .on("postgres_changes", { event: "*", schema: "public", table: "members", filter: `trip_id=eq.${tripId}` }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, router]);

  async function save(memberId: string, role: string | null) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("members").update({ task_role: role }).eq("id", memberId);
    if (error) return setError(errorMessage(error));
    setMembers((ms) => ms.map((m) => (m.id === memberId ? { ...m, task_role: role } : m)));
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      <ul className="divide-y overflow-hidden rounded-xl border bg-card" aria-label="Roles">
        {members
          .filter((m) => m.status !== "dropped")
          .map((m) => (
            <RoleRow key={`${m.id}:${m.task_role ?? ""}`} member={m} isMe={m.id === meId} canEdit={isOrganizer || m.id === meId} onSave={(r) => save(m.id, r)} />
          ))}
      </ul>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
    </div>
  );
}

function RoleRow({ member, isMe, canEdit, onSave }: { member: CrewMember; isMe: boolean; canEdit: boolean; onSave: (role: string | null) => Promise<void> }) {
  const id = useId();
  const role = member.task_role;
  const isPreset = !role || PRESETS.includes(role);
  // Derived, not stored: task_role changes live from other phones (the row is keyed by role, so text re-seeds too).
  const [pickedCustom, setPickedCustom] = useState(false);
  const custom = pickedCustom || !isPreset;
  const [text, setText] = useState(isPreset ? "" : role);

  const name = (
    <span className="font-semibold">
      {member.display_name}
      {isMe && <span className="font-normal text-muted-foreground"> (you)</span>}
    </span>
  );

  if (!canEdit) {
    return (
      <li className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
        {name}
        <span className={role ? "text-[15px]" : "text-[13px] text-muted-foreground"}>{role ?? "No role yet"}</span>
      </li>
    );
  }

  return (
    <li className="grid gap-2 px-4 py-3">
      <label htmlFor={`${id}-role`} className="flex items-center justify-between gap-2">
        {name}
        <span className="sr-only">role</span>
      </label>
      <select
        id={`${id}-role`}
        className={SELECT}
        value={custom ? "custom" : (role ?? "")}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "custom") return setPickedCustom(true);
          setPickedCustom(false);
          void onSave(v || null);
        }}
      >
        <option value="">No role yet</option>
        {PRESETS.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
        <option value="custom">Something else…</option>
      </select>
      {custom && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void onSave(text.trim() || null);
          }}
        >
          <label htmlFor={`${id}-custom`} className="sr-only">Custom role for {member.display_name}</label>
          <Input
            id={`${id}-custom`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={40}
            placeholder="DJ, Chai finder…"
            className="h-11"
          />
          <Button type="submit" className="h-11" disabled={text.trim() === (role ?? "")}>Save</Button>
        </form>
      )}
    </li>
  );
}
