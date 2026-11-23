// S-2 Who-brings-what. packing_items holds one row per claim (member_id null = nobody yet);
// rows with the same name (case/space-insensitive) are one item on the list.

export type PackingRow = { id: string; name: string; member_id: string | null };
export type PackingItem = { key: string; name: string; rows: PackingRow[]; claimers: string[] };

export const itemKey = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

/** Rows → items in first-seen order; `claimers` are distinct member ids. */
export function groupPacking(rows: PackingRow[]): PackingItem[] {
  const items = new Map<string, PackingItem>();
  for (const row of rows) {
    const key = itemKey(row.name);
    if (!key) continue;
    const item = items.get(key) ?? { key, name: row.name.trim().replace(/\s+/g, " "), rows: [], claimers: [] };
    item.rows.push(row);
    if (row.member_id && !item.claimers.includes(row.member_id)) item.claimers.push(row.member_id);
    items.set(key, item);
  }
  return [...items.values()];
}

/** "2 people are bringing a speaker" when 2+ people claimed the same thing, else null. */
export function duplicateNote(item: PackingItem): string | null {
  const n = item.claimers.length;
  if (n < 2) return null;
  // shortcut: plural = ends in "s" (snacks, cards); good enough for packing lists
  const article = item.key.endsWith("s") ? "" : /^[aeiou]/.test(item.key) ? "an " : "a ";
  return `${n} people are bringing ${article}${item.key}`;
}

/** "I'll bring it": take the item's unclaimed row if there is one, else add my own row. */
export function claimAction(item: PackingItem, me: string): { kind: "take"; id: string } | { kind: "insert" } | null {
  if (item.claimers.includes(me)) return null;
  const open = item.rows.find((r) => !r.member_id);
  return open ? { kind: "take", id: open.id } : { kind: "insert" };
}

/** Un-claim: delete my row, but if it is the item's last row, release it so the item stays on the list. */
export function unclaimAction(item: PackingItem, me: string): { kind: "release" | "delete"; id: string } | null {
  const mine = item.rows.find((r) => r.member_id === me);
  if (!mine) return null;
  return { kind: item.rows.length === 1 ? "release" : "delete", id: mine.id };
}
