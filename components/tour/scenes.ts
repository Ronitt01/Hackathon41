/**
 * The tour's script. Every scene is one stop of the scroll (and one press of → / Space): the phone's pose,
 * the real app screenshot on its screen, and the pieces of that screen lifted toward the viewer.
 * Coordinates are app CSS px on a 375 × 844 screen, the size the screenshots were taken at.
 */

export type SceneId =
  | "intro"
  | "create"
  | "invite"
  | "budget"
  | "vote"
  | "lock"
  | "fan"
  | "stamp"
  | "fairest"
  | "fits"
  | "itinerary"
  | "confirm"
  | "settle"
  | "wrapped"
  | "end";

/** A 3D pose. x/y move from the resting place (or `at` names the centre to move to); z lifts toward the viewer. */
export type Pose = {
  at?: [number, number];
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  s?: number;
  o?: number;
  /** Start delay in ms, so a lift follows the phone's turn (cause, then effect). */
  d?: number;
};

export type ShotKey =
  | "create"
  | "join"
  | "budget"
  | "vote"
  | "reveal-lock"
  | "reveal-plans"
  | "reveal-stamp"
  | "reveal-fairest"
  | "plan"
  | "itinerary"
  | "home"
  | "settle"
  | "wrapped";

/** Screenshots are 780 × 1688 (390 × 844 at 2x). `w` is the drawn width: 390 crops the scrollbar off a 375 screen. */
export const SHOTS: Record<ShotKey, { w: number; alt: string }> = {
  create: {
    w: 390,
    alt: "Kafila's Start a trip form, filled in: where to, Goa; when, 11 to 14 December 2026; your name, Guest; and a Create trip button.",
  },
  join: {
    w: 375,
    alt: "The invite a friend opens: Guest invited you to Goa with friends, 11 to 14 December. Guest and 5 others are in. A Your name field and a Join trip button.",
  },
  budget: {
    w: 390,
    alt: "Your budget and preferences: a painted board says Only you see this, a lock note says only you will ever see this number, max budget per person ₹12,000, then Love it, Don't mind and Rather not for beaches, nature and adventure.",
  },
  vote: {
    w: 390,
    alt: "Quick vote, card 1 of 11: Candolim villa with a pool, ₹7,000 per head, with Not for me and Love it buttons under it.",
  },
  "reveal-lock": {
    w: 390,
    alt: "The Plan tab as the fair plan starts: Locking budgets, nobody sees anyone else's, over six friends' stickers, each with a padlock.",
  },
  "reveal-plans": {
    w: 390,
    alt: "Six draft plans, Plan 1 to Plan 6, in a grid under the six locked stickers while Kafila balances everyone's likes.",
  },
  "reveal-stamp": {
    w: 390,
    alt: "Checked 4 plans, 1 was over someone's budget: Plan 2 is stamped Over someone's budget in red.",
  },
  "reveal-fairest": {
    w: 390,
    alt: "Plan 2 is gone and Plan 1 wears a green Fairest pill.",
  },
  plan: {
    w: 390,
    alt: "The fair plan: a painted board says Fits everyone's budget; six reflector-tape bars show how well it fits each friend, from a group minimum of 70% up to 100%; why this works for you; and your share, ₹5,750.",
  },
  itinerary: {
    w: 390,
    alt: "Day 1 of the itinerary: Fontainhas café trail at 10:00, beach shack dinner at 13:00, check in at Anjuna beach huts at 15:00 and the Dudhsagar falls trek at 17:00, each with its cost for the group.",
  },
  home: {
    w: 390,
    alt: "The Trip tab: a painted board says 5 of 6 in, confirm you're in below; a card says the fair plan is ready, with a See the plan button; and the Who's in list, where Kabir is still a maybe.",
  },
  settle: {
    w: 390,
    alt: "The Money tab: you owe ₹1,061.54, everyone's balances, and Settle up with the fewest payments: you pay Rohan ₹1,061.54, with a Mark as paid button.",
  },
  wrapped: {
    w: 390,
    alt: "Trip Wrapped, card 1 of 6: a yellow painted story card, ₹6,600 spent together, about ₹1,100 each for 6 of you.",
  },
};

export type Fact = "phone" | "google" | "lock" | "heart" | "scale" | "edit" | "upi" | "share";

export type Scene = {
  id: SceneId;
  shot: ShotKey;
  phone: Pose;
  /** 1–9 for the steps of the journey; the five fair-plan beats share step 5. */
  step?: number;
  /** The chapter name in the step nav; set on the first scene of a step. */
  chapter?: string;
  title: string;
  body: string;
  fact?: { icon: Fact; text: string };
  /** Phone turn duration; the flips get longer. */
  dur?: number;
};

export const STEPS = 9;

export const SCENES: Scene[] = [
  {
    id: "intro",
    shot: "create",
    phone: { ry: 198, rx: 6, rz: -3, y: 6 },
    title: "How Kafila works",
    body: "A group trip, start to finish, in nine steps. Everyone keeps their budget to themselves, and Kafila still finds the plan that fits all of them.",
  },
  {
    id: "create",
    shot: "create",
    phone: { ry: -18, rx: 6 },
    dur: 1400,
    step: 1,
    chapter: "Create",
    title: "Start a trip",
    body: "Say where and when, add your name, and the trip exists. Not sure yet? Leave either blank and Kafila suggests places and dates that suit everyone.",
    fact: { icon: "phone", text: "It runs in the browser. Nobody installs an app." },
  },
  {
    id: "invite",
    shot: "join",
    phone: { ry: 16, rx: 5, rz: 1 },
    step: 2,
    chapter: "Invite",
    title: "Drop the link in your group chat",
    body: "Friends open the invite and join with just their name. No sign-up, no download, no form to fill.",
    fact: { icon: "google", text: "Google sign-in is there for anyone who wants it." },
  },
  {
    id: "budget",
    shot: "budget",
    phone: { ry: -12, rx: 16 },
    step: 3,
    chapter: "Budget",
    title: "Everyone adds a budget only they can see",
    body: "Your top budget, and what you'd love or rather skip. Nobody else in the group can read it, not even the organiser.",
    fact: { icon: "lock", text: "The database itself keeps it private (row-level security), not just the screen." },
  },
  {
    id: "vote",
    shot: "vote",
    phone: { ry: -20, rx: 4, rz: -2 },
    step: 4,
    chapter: "Vote",
    title: "Swipe through the ideas",
    body: "Kafila suggests stays and things to do, so nobody starts from a blank board. Swipe right if you'd love it, left to skip.",
    fact: { icon: "heart", text: "Skips stay on your phone. Nobody sees what you passed on." },
  },
  {
    id: "lock",
    shot: "reveal-lock",
    phone: { ry: 0, rx: 12 },
    step: 5,
    chapter: "Fair plan",
    title: "The budgets lock",
    body: "Once everyone has added theirs, or the plan-by date arrives, Kafila makes the plan by itself. The budgets go in locked: nobody sees anyone else's.",
  },
  {
    id: "fan",
    shot: "reveal-plans",
    phone: { ry: -4, rx: 20, s: 0.94 },
    step: 5,
    title: "Several whole plans, side by side",
    body: "Kafila drafts complete trips that balance what everyone said they love, then checks every one against every budget.",
  },
  {
    id: "stamp",
    shot: "reveal-stamp",
    phone: { ry: 6, rx: 20, s: 0.94 },
    step: 5,
    title: "Over anyone's budget? It's out.",
    body: "A plan that costs more than even one friend can spend is dropped. Kafila never says whose budget it broke.",
  },
  {
    id: "fairest",
    shot: "reveal-fairest",
    phone: { ry: -8, rx: 14 },
    step: 5,
    title: "The fairest plan wins",
    body: "Of the plans that fit, Kafila picks the one where the least happy friend is as happy as possible.",
  },
  {
    id: "fits",
    shot: "plan",
    phone: { ry: -16, rx: 10 },
    step: 5,
    title: "Fits everyone's budget",
    body: "Everyone sees one score per friend and never a name. The lowest, the group minimum, is the number Kafila pushes as high as it will go. You also get your own reasons, and your share.",
    fact: { icon: "scale", text: "Fair to the quietest person in the group, by design." },
  },
  {
    id: "itinerary",
    shot: "itinerary",
    phone: { ry: 18, rx: 6 },
    step: 6,
    chapter: "Itinerary",
    title: "A day-by-day plan, and your share",
    body: "The plan becomes an itinerary anyone in the trip can add to, reorder and rate. Your share sits right beside it.",
    fact: { icon: "edit", text: "Every stop shows what it costs the group." },
  },
  {
    id: "confirm",
    shot: "home",
    phone: { ry: -14, rx: 6 },
    step: 7,
    chapter: "Confirm",
    title: "Say you're in",
    body: "One tap to confirm. Everyone can see who's in and who's still a maybe, so the organiser never has to chase.",
  },
  {
    id: "settle",
    shot: "settle",
    phone: { ry: 15, rx: 8 },
    step: 8,
    chapter: "Settle up",
    title: "Settle up in the fewest payments",
    body: "Log what you spend on the trip. At the end Kafila works out the fewest payments that square everyone. Pay each one by UPI, then mark it paid.",
    fact: { icon: "upi", text: "Kafila never holds your money." },
  },
  {
    id: "wrapped",
    shot: "wrapped",
    phone: { ry: -10, rx: 4, rz: 2 },
    step: 9,
    chapter: "Wrapped",
    title: "Post your Trip Wrapped",
    body: "When you're home, the trip comes back as painted story cards, made to post.",
    fact: { icon: "share", text: "Six cards, one tap to share each." },
  },
  {
    id: "end",
    shot: "plan",
    phone: { ry: 162, rx: 6, rz: 3, y: 6 },
    dur: 1400,
    title: "Your turn",
    body: "Open a sample Goa trip with six friends already in and watch the fair plan happen, or start your own and send the link.",
  },
];

/**
 * A piece of the phone's screen, lifted toward the viewer. With `shot` it is a crop of that screenshot, so what rises
 * is the real UI; without one it is a prop drawn by the tour (rendered by `kind`). `rect` is its resting box.
 */
export type Piece = {
  id: string;
  rect: [number, number, number, number];
  shot?: ShotKey;
  r?: number;
  kind?: "bubble" | "locked" | "ghost-red" | "ghost-green";
  name?: string;
  /** A stamp or pill the tour draws on top of the crop, shown in these scenes. */
  mark?: { kind: "love" | "over" | "fairest"; in: SceneId[] };
  /** A lifted crop leaves an empty recess in the glass, so it reads as pulled out, not copied. Off for the vote deck. */
  slot?: false;
  /** Other scenes whose screenshot has this piece in the same place, so the recess shows there too. */
  slotAlso?: SceneId[];
  /** Where a prop waits while hidden (crops wait flat on the screen). */
  from?: Pose;
  poses: Partial<Record<SceneId, Pose>>;
  compact?: Partial<Record<SceneId, Pose>>;
};

const AVATAR_X = [34, 80, 126, 172, 218, 264];
const LOCK_DELAY = [0, 45, 85, 115, 140, 160]; // shrinking gaps: a wave, not a metronome

const avatars: Piece[] = AVATAR_X.map((c, i) => {
  const u = i - 2.5;
  const arch = (2.5 - Math.abs(u)) * 12;
  return {
    id: `lock-${i}`,
    shot: "reveal-lock",
    rect: [c - 23, 106, 50, 50],
    r: 18,
    poses: { lock: { at: [187.5 + u * 68, 372 - arch], z: 150 - Math.abs(u) * 12, rz: u * 4, s: 1.5, d: 220 + LOCK_DELAY[i] } },
    compact: { lock: { at: [187.5 + u * 62, 372 - arch], z: 150 - Math.abs(u) * 12, rz: u * 4, s: 1.4, d: 220 + LOCK_DELAY[i] } },
  };
});

const PLAN_RECTS: [number, number, number, number][] = [
  [16, 157, 109, 77],
  [133, 158, 109, 77],
  [250, 158, 109, 77],
  [16, 240, 109, 78],
  [133, 240, 109, 78],
  [250, 240, 109, 78],
];

/** A hand of cards: each card sits a little nearer than the one to its left, so they overlap cleanly, titles showing. */
function fanPose(i: number, n: number, gap: number, s: number, d: number): Pose {
  const u = i - (n - 1) / 2;
  return { at: [187.5 + u * gap, 340 + u * u * 10], z: 100 + i * 14, rz: u * 6, s, d };
}

function gridPose(i: number, dx: number, dy: number, s: number): Pose {
  const col = i % 2;
  const row = Math.floor(i / 2);
  return { at: [187.5 + (col ? dx : -dx), 300 + row * dy], z: i === 1 ? 175 : 140 - row * 10, rz: [-2, 2.5, 1.5, -1.5][i], s, d: i * 30 };
}

const plans: Piece[] = PLAN_RECTS.map((rect, i) => {
  const out = Math.abs(i - 2.5) - 0.5; // centre cards first, then outward
  const poses: Partial<Record<SceneId, Pose>> = { fan: fanPose(i, 6, 100, 1.6, 200 + out * 70) };
  const compact: Partial<Record<SceneId, Pose>> = { fan: fanPose(i, 6, 60, 1.2, 200 + out * 70) };
  if (i < 4) {
    // Checked: the hand sorts itself into a 2 × 2 table, so each verdict has room.
    poses.stamp = gridPose(i, 100, 140, 1.6);
    compact.stamp = gridPose(i, 82, 126, 1.45);
  }
  if (i === 0) {
    poses.fairest = { at: [187.5, 300], z: 200, s: 2.2, rz: -2, d: 120 };
    compact.fairest = { at: [187.5, 300], z: 200, s: 2.0, rz: -2, d: 120 };
  }
  if (i === 2 || i === 3) {
    // The other fits step back out of the way, so the winner stands alone.
    poses.fairest = { ...gridPose(i, 100, 140, 1.6), z: -40, o: 0 };
    compact.fairest = { ...gridPose(i, 82, 126, 1.45), z: -40, o: 0 };
  }
  if (i === 1) {
    // Dropped: it falls away rather than sinking back into the grid.
    poses.fairest = { at: [287.5, 900], z: 60, rx: 70, rz: 18, s: 1.4, o: 0 };
    compact.fairest = { at: [269.5, 900], z: 60, rx: 70, rz: 18, s: 1.4, o: 0 };
  }
  return {
    id: `plan-${i}`,
    shot: "reveal-plans",
    rect,
    r: 12,
    slotAlso: ["stamp", "fairest"],
    mark: i === 1 ? { kind: "over", in: ["stamp", "fairest"] } : i === 0 ? { kind: "fairest", in: ["fairest"] } : undefined,
    poses,
    compact,
  };
});

const LOCKED = [
  { name: "Meera", rect: [-215, 96], pose: { z: 40, rz: -6, ry: 20 }, side: -1 },
  { name: "Aarav", rect: [425, 200], pose: { z: -10, rz: 5, ry: -20 }, side: 1 },
  { name: "Kabir", rect: [-245, 430], pose: { z: -30, rz: 4, ry: 22 }, side: -1 },
  { name: "Sana", rect: [445, 520], pose: { z: 30, rz: -4, ry: -18 }, side: 1 },
  { name: "Rohan", rect: [-180, 690], pose: { z: 70, rz: 3, ry: 16 }, side: -1 },
] as const;

const locked: Piece[] = LOCKED.map((l, i) => ({
  id: `locked-${i}`,
  kind: "locked",
  name: l.name,
  rect: [l.rect[0], l.rect[1], 168, 60],
  from: { z: -220, s: 0.9, o: 0, x: l.side * -40 },
  poses: { budget: { ...l.pose, d: 380 + [0, 50, 90, 120, 140][i] } },
  // On a phone the props tuck behind the device and peek out at its sides.
  compact: { budget: { ...l.pose, x: l.side * -96, z: -120, d: 380 + [0, 50, 90, 120, 140][i] } },
}));

export const PIECES: Piece[] = [
  {
    id: "create-fields",
    shot: "create",
    rect: [16, 366, 343, 228],
    r: 16,
    poses: { create: { z: 90, s: 1.04, d: 260 } },
  },
  {
    id: "join-stack",
    shot: "join",
    rect: [25, 240, 318, 55],
    r: 14,
    poses: { invite: { z: 120, s: 1.12, d: 260 } },
  },
  {
    id: "join-button",
    shot: "join",
    rect: [31, 448, 314, 43],
    r: 12,
    poses: { invite: { z: 60, d: 340 } },
  },
  {
    id: "bubble",
    kind: "bubble",
    rect: [-262, 520, 262, 132],
    from: { z: -160, y: 40, o: 0 },
    poses: { invite: { z: 150, ry: 14, rz: -3, d: 120 } },
    compact: { invite: { x: 170, y: 150, z: 190, ry: 8, rz: -3, d: 120 } },
  },
  {
    id: "budget-board",
    shot: "budget",
    rect: [16, 180, 343, 73],
    r: 8,
    poses: { budget: { z: 140, s: 1.06, d: 260 } },
  },
  {
    id: "budget-field",
    shot: "budget",
    rect: [16, 357, 343, 58],
    r: 17,
    poses: { budget: { z: 70, d: 330 } },
  },
  ...locked,
  {
    id: "vote-card",
    shot: "vote",
    rect: [16, 126, 343, 387],
    r: 17,
    slot: false, // the card beneath reads as the next card in the deck
    mark: { kind: "love", in: ["vote"] },
    poses: { vote: { x: 120, y: -4, z: 130, rz: 11, ry: -16, d: 260 } },
    compact: { vote: { x: 76, y: -4, z: 130, rz: 10, ry: -14, d: 260 } },
  },
  ...avatars,
  ...plans,
  {
    id: "fits-board",
    shot: "plan",
    rect: [16, 84, 343, 97],
    r: 10,
    poses: { fits: { z: 160, s: 1.08, d: 240 } },
  },
  {
    id: "fits-bars",
    shot: "plan",
    rect: [16, 197, 343, 172],
    r: 10,
    poses: { fits: { z: 80, d: 340 } },
  },
  {
    id: "itin-day",
    shot: "itinerary",
    rect: [16, 96, 343, 268],
    r: 12,
    poses: { itinerary: { z: 70, d: 260 } },
  },
  {
    id: "itin-share",
    shot: "plan",
    rect: [16, 386, 343, 152],
    r: 17,
    poses: { itinerary: { at: [222, 640], z: 170, rz: -3, ry: -10, d: 380 } },
    compact: { itinerary: { at: [200, 640], z: 170, rz: -3, ry: -8, d: 380 } },
  },
  {
    id: "home-board",
    shot: "home",
    rect: [16, 84, 343, 95],
    r: 10,
    poses: { confirm: { z: 60, d: 260 } },
  },
  {
    id: "home-you",
    shot: "home",
    rect: [17, 412, 341, 56],
    r: 14,
    poses: { confirm: { z: 150, s: 1.1, d: 330 } },
  },
  {
    id: "settle-balances",
    shot: "settle",
    rect: [16, 331, 343, 278],
    r: 17,
    poses: { settle: { z: 60, d: 240 } },
  },
  {
    id: "settle-pay",
    shot: "settle",
    rect: [16, 676, 343, 66], // the card's head only: in settle.webp the tab bar cuts its button
    r: 17,
    slot: false,
    poses: { settle: { at: [187.5, 716], z: 170, s: 1.08, rz: -2, d: 330 } },
  },
  {
    id: "ghost-red",
    kind: "ghost-red",
    rect: [16, 84, 343, 610],
    from: { z: 0, o: 0 },
    poses: { wrapped: { x: -78, z: 30, rz: -8, ry: 12, d: 300 } },
    compact: { wrapped: { x: -46, z: 30, rz: -7, ry: 10, d: 300 } },
  },
  {
    id: "ghost-green",
    kind: "ghost-green",
    rect: [16, 84, 343, 610],
    from: { z: 0, o: 0 },
    poses: { wrapped: { x: 78, z: 55, rz: 7, ry: -10, d: 360 } },
    compact: { wrapped: { x: 46, z: 55, rz: 6, ry: -8, d: 360 } },
  },
  {
    id: "wrapped-card",
    shot: "wrapped",
    rect: [16, 84, 343, 610],
    r: 12,
    poses: { wrapped: { z: 120, rz: -2, s: 1.02, d: 220 } },
  },
];
