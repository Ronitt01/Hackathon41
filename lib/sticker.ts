/** Sticker avatars: a stable look per name, so a friend's chip never changes between screens. */

/** FNV-1a 32-bit: small, stable, good enough spread for picking a paint and a tilt. */
export function nameHash(name: string): number {
  let h = 0x811c9dc5;
  for (const ch of name.trim().toLowerCase()) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** A whole-degree tilt in −6..6, the same every time for the same name. */
export function stickerTilt(name: string): number {
  return (nameHash(name) % 13) - 6;
}

/** Index into the four sticker paints (yellow, red, green-ink, ink). Uses different bits than the tilt. */
export function stickerPaint(name: string): 0 | 1 | 2 | 3 {
  return ((nameHash(name) >>> 8) % 4) as 0 | 1 | 2 | 3;
}

/** Up to two initials: first + last word, or the first two letters of a single word. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = [...words[0]];
  if (words.length === 1) return first.slice(0, 2).join("").toUpperCase();
  return (first[0] + [...words[words.length - 1]][0]).toUpperCase();
}
