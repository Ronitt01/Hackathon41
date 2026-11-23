// One shared vocabulary: preference answers (member_private.prefs) and option/stop tags use the same ids,
// so the fit score can match them. prefs value per tag: 1 = love it, 0 = don't mind, -1 = rather not.
export const TAGS = [
  { id: "beach", label: "Beaches" },
  { id: "nature", label: "Nature & hikes" },
  { id: "adventure", label: "Adventure" },
  { id: "culture", label: "History & culture" },
  { id: "cafes", label: "Cafés" },
  { id: "nightlife", label: "Nightlife" },
  { id: "shopping", label: "Shopping" },
  { id: "veg", label: "Veg food" },
  { id: "relaxed", label: "Slow, relaxed days" },
  { id: "early", label: "Early mornings" },
] as const;

export type TagId = (typeof TAGS)[number]["id"];
export type Prefs = Partial<Record<TagId, -1 | 0 | 1>>;

export const tagLabel = (id: string) => TAGS.find((t) => t.id === id)?.label ?? id;
