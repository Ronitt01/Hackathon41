import { ImageResponse } from "next/og";

export const alt = "Kafila: a painted truck board saying Fits everyone's budget, beside the line Group trip planning for friends on different budgets";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The "Horn OK Please" palette (DESIGN.md), copied here because the image can't read CSS variables.
const WASH = "#F4F6F1";
const INK = "#1A1410";
const YELLOW = "#F2B705";
const RED = "#C8102E";
const GREEN = "#1E8C45";
const TRACK = "#E4E7DF";

/** One weight of a Google font as TTF, or null (offline build): the image then falls back to the default face. */
async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`,
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await fetch(url).then((r) => r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

const HEADLINE = "Group trip planning for friends on different budgets";
const BOARD = "FITS EVERYONE'S BUDGET";
const SCORES = [64, 78, 93];

export default async function OpengraphImage() {
  const [bungee, hind] = await Promise.all([
    googleFont("Bungee", 400, BOARD),
    googleFont("Hind", 600, `KAFILA ${HEADLINE} Group minimum 0123456789%`),
  ]);
  const fonts = [
    ...(bungee ? [{ name: "Bungee", data: bungee, weight: 400 as const }] : []),
    ...(hind ? [{ name: "Hind", data: hind, weight: 600 as const }] : []),
  ];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: WASH, color: INK, padding: 72, fontFamily: "Hind" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 560 }}>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: 6 }}>KAFILA</div>
          <div style={{ fontSize: 60, fontWeight: 600, lineHeight: 1.05, letterSpacing: -1 }}>{HEADLINE}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 28, marginLeft: "auto", width: 470 }}>
          {/* The painted rear-board: green frame with red chevrons stands in as a solid red keyline here. */}
          <div style={{ display: "flex", background: GREEN, padding: 14, borderRadius: 12, border: `4px solid ${RED}` }}>
            <div
              style={{
                display: "flex",
                flex: 1,
                justifyContent: "center",
                background: YELLOW,
                border: `3px solid ${INK}`,
                borderRadius: 4,
                padding: "26px 20px",
                fontFamily: "Bungee",
                fontSize: 40,
                lineHeight: 1.1,
                textAlign: "center",
                textShadow: "3px 3px 0 rgba(200,16,46,0.55)",
              }}
            >
              {BOARD}
            </div>
          </div>
          {SCORES.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 120, fontSize: 20, fontWeight: 600 }}>{i === 0 ? "Group minimum" : ""}</div>
              {/* Reflector tape: red and white segments up to the value, on a fixed-length track. */}
              <div style={{ display: "flex", flex: 1, height: 22, background: TRACK, border: `2px solid ${INK}`, borderRadius: 3, overflow: "hidden" }}>
                {Array.from({ length: Math.round(s / 5) }, (_, k) => (
                  <div key={k} style={{ width: 13, height: "100%", background: k % 2 ? "#FFFFFF" : RED }} />
                ))}
              </div>
              <div style={{ width: 56, fontSize: 22, fontWeight: 600, textAlign: "right" }}>{`${s}%`}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
