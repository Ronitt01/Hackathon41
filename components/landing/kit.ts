import photos from "@/public/photos/manifest.json";

/** Shared scaffold for the landing page, so every section is learned once. */

/** The one content container: the same left and right edges on the header, every section and the footer. */
export const WRAP = "wrap mx-auto w-[calc(100%-3rem)] max-w-[1200px] md:w-[calc(100%-6rem)]";

/** A section box: one or two screens tall, its h2 first, top-aligned under the fixed header. */
export const SECTION = "relative flex flex-col pt-24 pb-12 lg:pt-30 lg:pb-16";
export const ONE_SCREEN = "min-h-svh";

export const H2 = "max-w-[22ch] text-[30px] leading-[1.1] font-semibold tracking-[-0.01em] text-balance md:text-[38px] xl:text-[44px]";
export const INTRO = "mt-4 max-w-[52ch] text-[17px] leading-[1.55] text-pretty md:text-[18px]";

/** Card title + line, inside a card: 18/16, ink. */
export const CARD = "rounded-[17px] border bg-card";
export const CARD_TITLE = "text-[18px] leading-snug font-bold";
export const CARD_TEXT = "mt-1 text-[16px] leading-[1.5]";

/** Buttons step up 1px on hover and press 1px down on click; reduced motion keeps only the colour change. */
const STEP =
  "transition-[translate,scale,background-color,border-color] duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-px active:translate-y-px active:scale-[.985] motion-reduce:translate-none motion-reduce:scale-100";
export const BTN_PRIMARY = `inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-[16px] font-semibold text-wash hover:bg-ink/85 ${STEP}`;
/** Restyles DemoTripButton's inner Button as the outline secondary (the wrapper is all it lets us style). */
export const DEMO_SECONDARY =
  "[&_button]:h-12 [&_button]:rounded-xl [&_button]:border-input [&_button]:bg-card [&_button]:px-5 [&_button]:text-[16px] [&_button]:text-ink [&_button:hover]:-translate-y-px [&_button:hover]:bg-muted motion-reduce:[&_button:hover]:translate-none";

/** Nav and footer words: bare at rest, darken and draw a 1px line under the word on hover. */
export const NAV_LINK =
  "relative inline-flex h-11 items-center text-[15px] font-semibold text-muted-foreground transition-[color] duration-150 hover:text-ink after:absolute after:inset-x-0 after:bottom-2.5 after:h-px after:origin-left after:scale-x-0 after:bg-ink after:transition-transform after:duration-150 hover:after:scale-x-100 motion-reduce:after:transition-none";

export type Photo = (typeof photos)[number];
/** A Goa frame from public/photos/manifest.json, by subject. Each is used once on the page. */
export function photo(subject: string): Photo {
  const p = photos.find((x) => x.subject === subject);
  if (!p) throw new Error(`No photo for "${subject}" in public/photos/manifest.json`);
  return p;
}
export const PHOTOS = photos;
