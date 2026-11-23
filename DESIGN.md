---
name: Kafila
description: Group trip planning that's fair to everyone, dressed as a hand-painted Indian goods truck.
colors:
  wash: "#F4F6F1"
  ink: "#1A1410"
  truck-yellow: "#F2B705"
  truck-red: "#C8102E"
  truck-green: "#1E8C45"
  truck-green-ink: "#17703A"
  track: "#E4E7DF"
  card: "#FFFFFF"
  muted: "#E9ECE4"
  muted-ink: "#5C534C"
  border: "#DCDFD6"
  input-edge: "#8F948A"
typography:
  display:
    fontFamily: "Bungee, Hind, sans-serif"
    fontSize: "23px"
    fontWeight: 400
    lineHeight: 1.1
  display-wordmark:
    fontFamily: "Bungee, Hind, sans-serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: 1.1
  headline:
    fontFamily: "Hind, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Hind, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.375
  title-sm:
    fontFamily: "Hind, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.375
  figure:
    fontFamily: "Hind, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    fontFeature: "\"tnum\""
  body:
    fontFamily: "Hind, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Hind, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
rounded:
  tape: "2px"
  board: "3px"
  md: "9.6px"
  lg: "12px"
  xl: "16.8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  tap: "44px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.wash}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "44px"
  button-cta:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.wash}"
    rounded: "{rounded.xl}"
    height: "50px"
    width: "100%"
  button-outline:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "44px"
  toggle-selected:
    backgroundColor: "{colors.truck-green-ink}"
    textColor: "{colors.card}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "44px"
  chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 10px"
  surface:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "44px"
  painted-board:
    backgroundColor: "{colors.truck-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
    rounded: "{rounded.board}"
    padding: "12px 16px"
  painted-board-red:
    backgroundColor: "{colors.truck-red}"
    textColor: "{colors.wash}"
    typography: "{typography.display}"
    rounded: "{rounded.board}"
  reflector-track:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.tape}"
    height: "14px"
  tab-bar:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.label}"
    height: "64px"
---

# Design System: Kafila

## Overview

**Creative North Star: "The Goods Truck, Built by Many Hands"**

Kafila dresses a group trip as a hand-painted Indian goods truck ("Horn OK Please"). The paint is spent in exactly one place per screen: a painted rear-board that carries that screen's verdict ("FITS EVERYONE'S BUDGET", "₹4,000 TO GO", the group favourite). Everything around it is a clean, quiet working app on a lime-wash ground, so the board reads as a sign, not as decoration.

The world is light only, built for phones held outdoors in daylight. Density is a single narrow column (448px max) with 44px tap targets and a fixed bottom tab bar; desktop centres the same column rather than spreading out. Each tab owns one paint, worn as a 4px band under the app bar and as its tab indicator, so the user always knows which part of the truck they are standing on.

Shares of a whole (fairness, budget used, savings) are drawn one way only: reflector tape, red and white segments in an ink-outlined track, on a single fixed length scale with the number set beside it as plain text. It replaces the earlier stock shadcn look and refuses the category's white-card-and-teal travel template and its dark-neon opposite.

**Key Characteristics:**
- One painted board per screen; the rest is plain UI.
- Lime-wash ground, deep ink text, three truck paints (chrome yellow, truck red, parrot green).
- One paint per tab: Trip yellow, Plan green, Decide red, Money ink.
- Parrot green is the only live/selected colour.
- Reflector tape is the only way to draw a proportion.
- Flat surfaces, hairline borders, no card shadows.

## Colors

A lime-washed ground with deep warm ink and three saturated truck paints used sparingly and by role.

### Primary
- **Deep Ink** (`ink`): all text, primary buttons, chip outlines, the board's 2px frame, the Money tab's paint. Also the "primary" token, so the main action is ink, not a brand hue.

### Secondary
- **Chrome Yellow** (`truck-yellow`): the default painted-board face, the Trip tab's paint, text selection. Never a text colour.
- **Truck Red** (`truck-red`): reflector tape stripes, the chevron strokes, the Decide tab's paint, the red board tone (for a "doesn't fit" verdict), and destructive actions.

### Tertiary
- **Parrot Green** (`truck-green`): focus rings, caret and native control accent, the chevron band ground, the Plan tab's paint.
- **Text-Strength Green** (`truck-green-ink`): the green used wherever it carries text or a white label: selected toggle and chip fills, check icons, member avatars. It clears 4.5:1 where parrot green does not.

### Neutral
- **Lime Wash** (`wash`): page ground and app bar (95% with blur), text on ink and red.
- **Card White** (`card`): surfaces, inputs, tab bar, chips.
- **Muted Wash** (`muted`): hover fills and secondary button ground.
- **Warm Grey Ink** (`muted-ink`): secondary text, inactive tab labels, helper lines.
- **Hairline** (`border`): 1px surface borders and list dividers.
- **Field Edge** (`input-edge`): input and unselected-toggle outlines, scrollbar thumb; a 3:1 boundary on white.
- **Tape Track** (`track`): the empty part of a reflector track, toggle-switch track, neutral icon discs.

### Named Rules
**The One Live Colour Rule.** Green is the only colour that means "selected", "on" or "focused". Selected states use text-strength green with white text; focus is a 2px parrot-green outline at 2px offset. Yellow, red and ink never signal state.

**The One Paint Per Tab Rule.** The trip shell sets `--paint` from the active tab (Trip yellow, Plan green, Decide red, Money ink); only the app bar's 4px bottom band and the active tab's 4px top indicator wear it. Jar and Wrapped live under Trip and wear yellow.

## Typography

**Display Font:** Bungee (with Hind, sans-serif)
**Body Font:** Hind (with system-ui, sans-serif)

**Character:** Bungee is sign-painter lettering and appears only where paint appears; Hind is a clear Indian-designed sans that does all the working text in regular, 600 and 700.

### Hierarchy
- **Display** (Bungee 400, 23px, 1.1, uppercase, balanced): the painted-board verdict. A 2px/2px drop-shade (red at 55% on yellow, ink at 45% on red) is part of the lettering.
- **Display Wordmark** (Bungee 400, 36px): the "Kafila" board on home and join; the app bar carries a 13px uppercase Bungee wordmark.
- **Headline** (Hind 700, 18px, tight): trip name in the app bar, truncated.
- **Title** (Hind 700, 17px, 1.375): section headings ("Itinerary", "Trip details"), each with a 13px muted helper line under it. 15px bold for sub-sections inside a screen.
- **Figure** (Hind 700, 22px, tabular): the money number that answers a card ("Your share").
- **Body** (Hind 400, 15px, 1.45): everything else. Fields set to 16px to stop iOS zoom.
- **Label** (Hind 600, 13px): chips, meta lines, tab labels, meter values (tabular).

### Named Rules
**The Paint-Only Lettering Rule.** Bungee appears only on a painted board, a Wrapped story card (which is a board) and the wordmark. Headings in the working UI are Hind bold.

**The Lettering Speaks First Rule.** A board has no label above it. If it needs context, a 13px semibold note sits under the lettering.

## Layout

A single centred column, `max-width: 28rem`, 16px side padding, 16px gap between blocks, 112px bottom padding to clear the fixed tab bar. The app bar is sticky, 64px tall; the tab bar is fixed, 64px tall, four equal columns, respecting the bottom safe-area inset. A screen's primary action may dock above the tab bar on a wash scrim. Desktop does not reflow; it centres the phone column.

Rhythm runs on 4px steps (4, 8, 12, 16), with 14px inner padding on compact surfaces. Every interactive target is at least 44px; visually smaller chips get a 44px hit area around them. Meter lists use a three-column grid (104px label, tape, 40px value) so tape lengths share one origin.

## Elevation & Depth

Flat. Surfaces sit on the wash with a 1px hairline border (or a 10% ink ring on the shared Card component); there are no card or button shadows. Depth comes from paint against wash, not from lift. The only shadows are the board's lettering drop-shade, a wash-coloured upward fade behind the docked action bar, and a 95% wash with backdrop blur on the sticky app bar.

### Named Rules
**The Flat Truck Rule.** Nothing lifts. If an element needs emphasis it gets paint (a board) or weight (bold, figure size), never a shadow.

## Shapes

Working UI is gently rounded: 12px for buttons and inputs, about 17px for surfaces and lists, full pills for chips and toggles, circles for avatars and the back button. The paint world is squarer: the board's outer chevron frame is about 10px round, its inner board 3px with a 2px ink frame, and reflector tape 2px with a 1px ink outline. The chevron band is a tiled 16x10 pattern of red V-strokes on parrot green framing the board.

## Components

### Buttons
Ink and confident, never coloured for brand.
- **Shape:** gently rounded (12px); the screen's docked primary action is full width, 50px, 16px bold, about 17px round.
- **Primary:** ink fill, wash text, 44px tall, 16px horizontal padding, 15px semibold.
- **Hover / Focus:** hover drops the ink to 80%; focus shows the 2px green outline; press nudges down 1px.
- **Outline / Ghost:** wash or transparent ground, hairline border, muted hover fill. Destructive is a 10% red tint with red text.

### Toggles and Chips
- **Toggle (like, rose, compare):** 44px pill. Off: white with field-edge outline. On: text-strength green fill, white text and icon (filled heart).
- **Chip:** white pill, 1px ink outline, 13px semibold. Selected filter or choice chips fill text-strength green with white text.
- **Segmented control:** white strip in a 1px ink frame, 4px inset; the checked segment fills green.

### Cards / Containers
- **Corner Style:** about 17px.
- **Background:** card white on wash.
- **Shadow Strategy:** none (see Flat Truck Rule).
- **Border:** 1px hairline; empty states use a dashed hairline.
- **Internal Padding:** 16px, or 14px x 12px for compact explanation cards. Lists inside a surface divide with hairlines.

### Inputs / Fields
- **Style:** 44px, white, 1px field-edge outline, 12px round, 16px text.
- **Focus:** 2px green outline at 2px offset; caret is green.
- **Error:** red text in a `role="alert"` line under the field.

### Navigation
- **App bar:** sticky, wash at 95% with blur, 4px paint band underneath. Circular 44px back button, trip name (18px bold) over "dates · friends" (13px muted), small Bungee wordmark at right.
- **Tab bar:** fixed, white, hairline top. Each tab is a 22px line icon over a 13px label. Active: 4px paint indicator on top, bold ink label, heavier icon stroke. Inactive: muted label.

### Painted Board (signature)
A truck rear-board: chevron-band frame (10px padding, about 10px round) around a 3px-round board with a 2px ink frame, centred Bungee lettering with drop-shade. Yellow by default; red for a verdict that fails. It lands with a stamp (420ms, scale 0.96 and -0.6deg to rest, expo-out) only when motion is allowed. One per screen.

### Reflector Tape (signature)
A `role="meter"` bar: 14px tall, 2px round, 1px ink outline, track-grey ground, filled with 10px red / 10px white stripes to the value. The percentage sits beside it as tabular text. In lists it fills left to right (700ms, expo-out, 60ms stagger) only when motion is allowed.

## Do's and Don'ts

### Do:
- **Do** put exactly one painted board on a screen, carrying that screen's verdict or headline.
- **Do** use text-strength green (#17703A) for any selected fill that carries white text; keep parrot green (#1E8C45) for focus, paint bands and the chevron ground.
- **Do** draw every proportion as reflector tape on the shared fixed-length track, with the number as text beside it.
- **Do** keep tap targets at 44px and form fields at 16px text.
- **Do** gate the stamp and tape-fill motion behind `prefers-reduced-motion: no-preference`.

### Don't:
- **Don't** add a second painted board, or set Bungee on working UI headings, buttons or labels.
- **Don't** put a label or kicker above a board; context goes in the note under it.
- **Don't** use yellow, red or ink to show a selected or active state; that is green's job alone.
- **Don't** lift surfaces with box shadows; the board's lettering drop-shade is the only offset shade in the world.
- **Don't** introduce teal, gradients or a dark theme; the world is light only.
- **Don't** encode a proportion with a ring, pie or colour scale.
