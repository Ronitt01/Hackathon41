// "Try the demo trip": the whole sample Goa trip as plain data. Pure, so the maths is tested here;
// app/api/demo/route.ts only turns names into row ids and inserts. All money is integer paise.
import { addDays } from "./dates.ts";
import { splitEqually } from "./money.ts";
import { splitItems } from "./split.ts";
import type { Prefs, TagId } from "./tags.ts";

export const SAMPLE_TRIP_NAME = "Goa with friends (sample)";

export type SampleKey = "meera" | "aarav" | "kabir" | "sana" | "rohan";
/** "me" = the person who clicked the button (the organizer). */
export type Who = "me" | SampleKey;

export type SampleFriend = {
  key: SampleKey;
  /** Fixed ids so the same five auth users are reused on every click. */
  userId: string;
  email: string;
  name: string;
  homeCity: string;
  status: "confirmed" | "maybe";
  budgetPaise: number;
  prefs: Prefs;
};

const friend = (key: SampleKey, n: number, name: string, homeCity: string, budgetRupees: number, prefs: Prefs, status: SampleFriend["status"] = "confirmed"): SampleFriend => ({
  key,
  userId: `5a3b1e00-0000-4000-8000-00000000000${n}`,
  email: `sample-${key}@kafila.example`,
  name,
  homeCity,
  status,
  budgetPaise: budgetRupees * 100,
  prefs,
});

export const SAMPLE_FRIENDS: SampleFriend[] = [
  // Mumbai, not Delhi: a live AI fare from Delhi (~₹9–10k return) leaves no plan inside ₹8,000 (see the test).
  friend("meera", 1, "Meera", "Mumbai", 8_000, { cafes: 1, veg: 1 }),
  friend("aarav", 2, "Aarav", "Pune", 14_000, { nightlife: 1, beach: 1 }),
  friend("kabir", 3, "Kabir", "Bengaluru", 12_000, { adventure: 1, nature: 1 }, "maybe"),
  friend("sana", 4, "Sana", "Mumbai", 10_000, { cafes: 1, culture: 1, veg: 1, early: -1 }),
  friend("rohan", 5, "Rohan", "Pune", 16_000, { beach: 1, relaxed: 1 }),
];

type AspectKind = "photo" | "location" | "price" | "amenity" | "vibe" | "other";
export type SeedAspect = { label: string; kind: AspectKind; value: string };
export type SeedOption = {
  key: string;
  kind: "stay" | "activity" | "food";
  title: string;
  description: string;
  pricePaise: number;
  imageUrl: string | null;
  tags: TagId[];
  by: Who;
  /** Attached to the "Where do we stay?" decision. */
  inDecision: boolean;
  aspects: SeedAspect[];
};
/** `aspect` is an aspect label on that option; absent = the whole option. */
export type SeedReaction = { who: SampleKey; option: string; aspect?: string; kind: "like" | "rose" };
export type SeedComment = { who: SampleKey; option: string; aspect?: string; body: string };
export type SeedExpense = {
  title: string;
  category: "food" | "travel";
  paidBy: Who;
  amountPaise: number;
  splitType: "equal" | "items";
  items: { name: string; amountPaise: number; kind: "item" | "tax" | "tip"; claimers: Who[] }[];
  shares: { who: Who; amountPaise: number }[];
};

export type DemoSeed = {
  trip: { name: string; destination: string; startDate: string; endDate: string };
  friends: SampleFriend[];
  decision: { question: string; kind: "stay"; deadline: string };
  options: SeedOption[];
  reactions: SeedReaction[];
  comments: SeedComment[];
  expenses: SeedExpense[];
  tasks: { title: string; owner: Who; done: boolean }[];
  packing: { name: string; who: Who | null }[];
};

/** The first Friday that is at least `minDays` after `today` ("YYYY-MM-DD"). */
export function fridayAtLeast(today: string, minDays = 14): string {
  const from = addDays(today, minDays);
  const day = new Date(`${from}T00:00:00Z`).getUTCDay();
  return addDays(from, (5 - day + 7) % 7);
}

/** `photos` is public/photos/manifest.json; an option whose subject has no photo gets no image. */
export function buildDemoSeed({ today, photos }: { today: string; photos: { subject: string; file: string }[] }): DemoSeed {
  const photo = (subject: string) => photos.find((p) => p.subject === subject)?.file ?? null;
  const startDate = fridayAtLeast(today);
  const confirmed: Who[] = ["me", ...SAMPLE_FRIENDS.filter((f) => f.status === "confirmed").map((f) => f.key)];

  const option = (o: Omit<SeedOption, "imageUrl" | "pricePaise" | "inDecision"> & { rupees: number; photo?: string }): SeedOption => {
    const { rupees, photo: subject, ...rest } = o;
    return { ...rest, pricePaise: rupees * 100, imageUrl: subject ? photo(subject) : null, inDecision: o.kind === "stay" };
  };

  // The guesthouse has no photo: the only Fontainhas one belongs to the café trail, so no image shows twice.
  const options: SeedOption[] = [
    option({ key: "villa", kind: "stay", title: "Candolim villa with a pool", description: "Three bedrooms, private pool, ten minutes to the beach. Whole stay, all four nights.", rupees: 42_000, photo: "villa", tags: ["relaxed", "beach"], by: "sana", aspects: [
      { label: "The pool", kind: "amenity", value: "Private, open till midnight" },
      { label: "Location", kind: "location", value: "Candolim, 10 min walk to the beach" },
      { label: "Price", kind: "price", value: "₹42,000 for 4 nights" },
    ] }),
    option({ key: "guesthouse", kind: "stay", title: "Fontainhas heritage guesthouse", description: "Old Portuguese house in Panjim's Latin quarter. Breakfast included.", rupees: 24_000, tags: ["culture", "cafes"], by: "sana", aspects: [
      { label: "Location", kind: "location", value: "Fontainhas, Panjim" },
      { label: "Breakfast", kind: "amenity", value: "Poi, eggs and chai every morning" },
      { label: "Price", kind: "price", value: "₹24,000 for 4 nights" },
    ] }),
    option({ key: "huts", kind: "stay", title: "Anjuna beach huts", description: "Simple wooden huts on the sand. Fans, no AC, sea view.", rupees: 15_000, photo: "beach", tags: ["beach", "relaxed"], by: "rohan", aspects: [
      { label: "The view", kind: "vibe", value: "Wake up to the sea" },
      { label: "Price", kind: "price", value: "₹15,000 for 4 nights" },
    ] }),
    option({ key: "cafes", kind: "activity", title: "Fontainhas café trail", description: "Slow morning through Panjim's old quarter: bakeries, bebinca and filter coffee.", rupees: 3_000, photo: "fontainhas", tags: ["cafes", "culture", "veg"], by: "meera", aspects: [
      { label: "The cafés", kind: "vibe", value: "Four stops, all veg-friendly" },
      { label: "Timing", kind: "other", value: "Starts 10:30, no early alarm" },
    ] }),
    option({ key: "dudhsagar", kind: "activity", title: "Dudhsagar falls trek", description: "Jeep safari and a short trek to the four-tier falls. Full day.", rupees: 9_000, photo: "dudhsagar", tags: ["adventure", "nature", "early"], by: "kabir", aspects: [
      { label: "The falls", kind: "photo", value: "310 m, at its fullest after the monsoon" },
      { label: "Start time", kind: "other", value: "Leaves 6:30 am" },
      { label: "Price", kind: "price", value: "₹9,000 for the group, jeep included" },
    ] }),
    option({ key: "chapora", kind: "activity", title: "Chapora fort sunset", description: "Short climb, best sunset view in North Goa. Free.", rupees: 0, photo: "chapora", tags: ["culture", "nature"], by: "aarav", aspects: [
      { label: "The view", kind: "vibe", value: "Vagator beach and the river mouth" },
      { label: "Price", kind: "price", value: "Free" },
    ] }),
    option({ key: "churches", kind: "activity", title: "Old Goa churches walk", description: "Bom Jesus, Se Cathedral and the ruins of St Augustine, on foot.", rupees: 0, photo: "bomjesus", tags: ["culture"], by: "sana", aspects: [
      { label: "Bom Jesus", kind: "photo", value: "UNESCO World Heritage basilica" },
      { label: "Price", kind: "price", value: "Free" },
    ] }),
    option({ key: "palolem", kind: "activity", title: "Palolem beach day", description: "Day trip south: kayaks, calm water, lunch on the sand.", rupees: 1_500, photo: "palolem", tags: ["beach", "relaxed"], by: "rohan", aspects: [
      { label: "The beach", kind: "vibe", value: "Calm, swimmable, palm-lined" },
      { label: "Kayaks", kind: "amenity", value: "₹1,500 for the group" },
    ] }),
    option({ key: "market", kind: "activity", title: "Anjuna flea market", description: "Spices, scarves and serious haggling. Entry is free.", rupees: 0, photo: "market", tags: ["shopping", "culture"], by: "meera", aspects: [
      { label: "The stalls", kind: "vibe", value: "Spices, silver, cotton" },
      { label: "Price", kind: "price", value: "Free to walk in" },
    ] }),
    // The only thali photo shows a fish plate, so the title says what's on it rather than "veg thali".
    option({ key: "thali", kind: "food", title: "Goan thali lunch", description: "Red rice, curry, beans and brinjal. Veg and fish plates side by side.", rupees: 1_800, photo: "thali", tags: ["veg", "culture"], by: "meera", aspects: [
      { label: "Veg plates", kind: "other", value: "Ask for the veg thali" },
      { label: "Price", kind: "price", value: "₹1,800 for the group" },
    ] }),
    option({ key: "shack", kind: "food", title: "Beach shack dinner", description: "Sunset table at a shack on the sand, music till late.", rupees: 4_200, photo: "shack", tags: ["beach", "nightlife"], by: "aarav", aspects: [
      { label: "Sunset", kind: "vibe", value: "Tables right on the sand" },
      { label: "Music", kind: "amenity", value: "Live set from 9 pm" },
      { label: "Price", kind: "price", value: "₹4,200 for the group" },
    ] }),
  ];

  // At most one Rose per person per trip (unique index one_rose_per_member).
  const reactions: SeedReaction[] = [
    { who: "meera", option: "cafes", kind: "rose" },
    { who: "sana", option: "cafes", kind: "rose" },
    { who: "aarav", option: "shack", kind: "rose" },
    { who: "rohan", option: "villa", kind: "rose" },
    { who: "aarav", option: "villa", aspect: "The pool", kind: "like" },
    { who: "rohan", option: "villa", aspect: "The pool", kind: "like" },
    { who: "meera", option: "guesthouse", aspect: "Price", kind: "like" },
    { who: "sana", option: "guesthouse", aspect: "Location", kind: "like" },
    { who: "sana", option: "guesthouse", kind: "like" },
    { who: "meera", option: "huts", aspect: "Price", kind: "like" },
    { who: "rohan", option: "huts", aspect: "The view", kind: "like" },
    { who: "sana", option: "cafes", aspect: "Timing", kind: "like" },
    { who: "kabir", option: "dudhsagar", kind: "like" },
    { who: "kabir", option: "dudhsagar", aspect: "The falls", kind: "like" },
    { who: "aarav", option: "chapora", kind: "like" },
    { who: "kabir", option: "chapora", aspect: "The view", kind: "like" },
    { who: "sana", option: "churches", kind: "like" },
    { who: "rohan", option: "palolem", kind: "like" },
    { who: "aarav", option: "palolem", aspect: "The beach", kind: "like" },
    { who: "meera", option: "thali", aspect: "Veg plates", kind: "like" },
    { who: "rohan", option: "shack", aspect: "Sunset", kind: "like" },
  ];

  const comments: SeedComment[] = [
    { who: "sana", option: "cafes", aspect: "Timing", body: "10:30 start is perfect. I am not a 7 am person." },
    { who: "kabir", option: "dudhsagar", body: "Jeep slots sell out, we'd need to book a day ahead." },
    { who: "rohan", option: "villa", aspect: "The pool", body: "Pool at midnight. Need I say more?" },
  ];

  const cab = 240_000;
  const cabShares = splitEqually(cab, confirmed.length);
  const dinnerItems: SeedExpense["items"] = [
    { name: "Food", amountPaise: 270_000, kind: "item", claimers: confirmed },
    { name: "Drinks", amountPaise: 120_000, kind: "item", claimers: ["aarav", "rohan"] },
    { name: "Tax", amountPaise: 30_000, kind: "tax", claimers: [] },
  ];
  const dinnerShares = splitItems(dinnerItems.map((i) => ({ amount: i.amountPaise, kind: i.kind, claimers: i.claimers })));

  return {
    trip: { name: SAMPLE_TRIP_NAME, destination: "Goa", startDate, endDate: addDays(startDate, 3) },
    friends: SAMPLE_FRIENDS,
    decision: { question: "Where do we stay?", kind: "stay", deadline: `${addDays(today, 1)}T19:00:00+05:30` },
    options,
    reactions,
    comments,
    expenses: [
      { title: "Cab from the airport", category: "travel", paidBy: "aarav", amountPaise: cab, splitType: "equal", items: [], shares: confirmed.map((who, i) => ({ who, amountPaise: cabShares[i] })) },
      { title: "Welcome dinner", category: "food", paidBy: "rohan", amountPaise: 420_000, splitType: "items", items: dinnerItems, shares: [...dinnerShares].map(([who, amountPaise]) => ({ who: who as Who, amountPaise })) },
    ],
    tasks: [
      { title: "Book the airport cab", owner: "aarav", done: true },
      { title: "Find a stay", owner: "sana", done: false },
      { title: "Buy snacks", owner: "rohan", done: false },
    ],
    // Aarav and Rohan both bring a speaker: the Crew tab shows its duplicate warning.
    packing: [
      { name: "Speaker", who: "aarav" },
      { name: "Speaker", who: "rohan" },
      { name: "First-aid kit", who: "sana" },
      { name: "Power bank", who: null },
    ],
  };
}
