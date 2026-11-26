"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Link2, Lock } from "lucide-react";
import { StickerAvatar } from "@/components/kafila/sticker-avatar";
import { cn } from "@/lib/utils";
import { PIECES, SCENES, SHOTS, type Piece, type Pose, type SceneId, type ShotKey } from "./scenes";
import s from "./tour.module.css";

const PHONE_W = 399;
const PHONE_H = 868;
const EDGES = 14; // 1px slices behind the face: the phone's thickness when it turns

const src = (k: ShotKey) => `/tour/${k}.webp`;

/** During the reveal the app under it is still empty; a wash veils it below this line (app px), so the lift is the one focus. */
const VEIL: Partial<Record<SceneId, number>> = { lock: 238, fan: 152, stamp: 152, fairest: 152 };
const shotH = (k: ShotKey) => Math.round((SHOTS[k].w * 1688) / 780);

/** The screenshot's own pixels under a rect, as a background. */
const crop = (k: ShotKey, [x, y]: Piece["rect"]) => ({
  backgroundImage: `url(${src(k)})`,
  backgroundSize: `${SHOTS[k].w}px ${shotH(k)}px`,
  backgroundPosition: `${-x}px ${-y}px`,
});

function transform(p: Pose, tx: number, ty: number) {
  return `translate3d(${tx}px, ${ty}px, ${p.z ?? 0}px) rotateX(${p.rx ?? 0}deg) rotateY(${p.ry ?? 0}deg) rotateZ(${p.rz ?? 0}deg) scale(${p.s ?? 1})`;
}

/** Where a piece is in this scene: its pose, or (hidden) its resting place flat on the screen. */
function place(piece: Piece, scene: SceneId, compact: boolean) {
  const pose = (compact && piece.compact?.[scene]) || piece.poses[scene];
  const p: Pose = pose ?? piece.from ?? {};
  const [x, y, w, h] = piece.rect;
  const tx = p.at ? p.at[0] - (x + w / 2) : (p.x ?? 0);
  const ty = p.at ? p.at[1] - (y + h / 2) : (p.y ?? 0);
  const on = !!pose && (pose.o ?? 1) > 0;
  return { p, tx, ty, on, leaving: !!pose && !on };
}

/**
 * The 3D stage: a phone with real thickness and a painted back, its screen showing the scene's screenshot,
 * and crops of that screenshot rising off the glass. Pure CSS 3D; React only swaps poses, the browser tweens them.
 */
export function Stage({ index, compact }: { index: number; compact: boolean }) {
  const scene = SCENES[index];
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);

  // Fit the phone to the viewport. k scales the 399 × 868 device; the stage shows once it is sized.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const wide = w >= 1024;
      const k = wide
        ? Math.min((h - 150) / PHONE_H, (w * 0.3) / PHONE_W, 1.05)
        : // Phone: as big as the words below allow; on tall screens they overlap its tab bar, behind their wash fade.
          Math.min(Math.max(h * 0.59, h - 270) / PHONE_H, (w * 0.74) / PHONE_W, 0.8);
      el.style.setProperty("--k", k.toFixed(4));
      el.dataset.ready = "";
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // A few degrees of tilt toward a fine pointer: the phone feels held, not printed. Off for touch and reduced motion.
  useEffect(() => {
    const el = tiltRef.current;
    const mq = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!el || !mq.matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--tx", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
        el.style.setProperty("--ty", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  const ph = scene.phone;
  const shown = scene.shot;

  return (
    <div ref={stageRef} className={s.stage} data-scene={scene.id} style={{ ["--step" as string]: index }}>
      <div className={s.ground} aria-hidden>
        <div className={s.road}>
          <div className={s.lane} />
        </div>
        <div className={s.floorShadow} />
      </div>

      <div className={s.rig}>
        <div className={s.enter}>
          <div ref={tiltRef} className={s.tilt}>
            <div className={s.float}>
              <div
                className={s.phone}
                style={{
                  transform: transform(ph, ph.x ?? 0, ph.y ?? 0),
                  transitionDuration: `${scene.dur ?? 1000}ms`,
                  ["--g" as string]: Math.max(-40, Math.min(40, -(ph.ry ?? 0) * 1.6)),
                }}
              >
                <PhoneBack />
                {Array.from({ length: EDGES }, (_, i) => (
                  <div key={i} aria-hidden className={s.edge} style={{ transform: `translateZ(${-(i + 1)}px)` }} />
                ))}
                <div aria-hidden className={s.body} />

                <div className={s.screen} role="group" aria-label="Kafila on a phone">
                  {(Object.keys(SHOTS) as ShotKey[]).map((k) => (
                    <Image
                      key={k}
                      src={src(k)}
                      alt={SHOTS[k].alt}
                      aria-hidden={k !== shown}
                      width={SHOTS[k].w}
                      height={shotH(k)}
                      unoptimized
                      loading="eager"
                      draggable={false}
                      className={s.shot}
                      data-on={k === shown ? "" : undefined}
                      style={{ width: SHOTS[k].w }}
                    />
                  ))}
                  <div aria-hidden className={s.glare} />
                </div>

                {/* Shadows the lifted pieces cast on the glass; clipped to the screen, like real shadows on a screen. */}
                <div aria-hidden className={s.shades}>
                  {PIECES.filter((pc) => pc.shot && pc.slot !== false).map((pc) => {
                    const { p, on } = place(pc, scene.id, compact);
                    const here = pc.shot === shown || !!pc.slotAlso?.includes(scene.id);
                    return (
                      <div
                        key={`slot-${pc.id}`}
                        className={s.slot}
                        data-on={on && here ? "" : undefined}
                        style={{
                          left: pc.rect[0],
                          top: pc.rect[1],
                          width: pc.rect[2],
                          height: pc.rect[3],
                          borderRadius: pc.r,
                          ["--d" as string]: `${p.d ?? 0}ms`,
                        }}
                      />
                    );
                  })}
                  <div className={s.veil} data-on={VEIL[scene.id] ? "" : undefined} style={{ transform: `translateY(${VEIL[scene.id] ?? 322}px)` }} />
                  {PIECES.filter((pc) => pc.shot).map((pc) => {
                    const { p, tx, ty, on } = place(pc, scene.id, compact);
                    const z = p.z ?? 0;
                    return (
                      <div
                        key={pc.id}
                        className={s.shade}
                        data-on={on ? "" : undefined}
                        style={{
                          left: pc.rect[0],
                          top: pc.rect[1],
                          width: pc.rect[2],
                          height: pc.rect[3],
                          borderRadius: pc.r,
                          transform: `translate(${tx + z * 0.1}px, ${ty + z * 0.26}px) rotate(${p.rz ?? 0}deg) scale(${(p.s ?? 1) * 1.02})`,
                          ["--so" as string]: Math.max(0.1, 0.34 - z / 800), // higher lifts cast fainter shadows
                          ["--d" as string]: `${p.d ?? 0}ms`,
                        }}
                      />
                    );
                  })}
                </div>

                <div aria-hidden className={s.space}>
                  {PIECES.map((pc) => (
                    <PieceView key={pc.id} piece={pc} scene={scene.id} compact={compact} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PieceView({ piece, scene, compact }: { piece: Piece; scene: SceneId; compact: boolean }) {
  const { p, tx, ty, on, leaving } = place(piece, scene, compact);
  const [x, y, w, h] = piece.rect;
  const shot = piece.shot;
  return (
    <div
      className={cn(s.piece, piece.kind && s.prop)}
      data-on={on ? "" : undefined}
      data-leaving={leaving ? "" : undefined}
      data-piece={piece.id}
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: piece.r,
        transform: transform(p, tx, ty),
        ["--d" as string]: `${p.d ?? 0}ms`,
        ...(shot && crop(shot, piece.rect)),
      }}
    >
      {piece.kind === "bubble" && <ChatBubble />}
      {piece.kind === "locked" && piece.name && <LockedBudget name={piece.name} />}
      {piece.kind === "ghost-red" && <GhostCard tone="red" />}
      {piece.kind === "ghost-green" && <GhostCard tone="green" />}
      {piece.mark && <Mark kind={piece.mark.kind} on={piece.mark.in.includes(scene)} />}
    </div>
  );
}

/** The real app's stamps and pill, drawn over the lifted crop so they can land on cue. */
function Mark({ kind, on }: { kind: "love" | "over" | "fairest"; on: boolean }) {
  if (kind === "love") {
    return (
      <span className={cn(s.mark, s.love)} data-on={on ? "" : undefined}>
        Love it
      </span>
    );
  }
  if (kind === "over") {
    return (
      <span className={cn(s.mark, s.over)} data-on={on ? "" : undefined}>
        Over someone&apos;s budget
      </span>
    );
  }
  return (
    <span className={cn(s.mark, s.fairest)} data-on={on ? "" : undefined}>
      Fairest
    </span>
  );
}

function ChatBubble() {
  return (
    <div className={s.bubble}>
      <div className="flex items-center gap-2">
        <StickerAvatar name="Guest" size="sm" />
        <span className="text-[14px] font-bold">Guest</span>
      </div>
      <p className="mt-1.5 text-[15px] leading-snug">Goa, 11–14 Dec. Who&apos;s in? Add your name here:</p>
      <p className="mt-2 flex items-center gap-2 rounded-xl border bg-wash px-2.5 py-2 text-[14px] font-semibold">
        <Link2 className="size-4 shrink-0 text-truck-green-ink" strokeWidth={2} />
        <span className="truncate underline decoration-1 underline-offset-2">Join Goa with friends</span>
      </p>
    </div>
  );
}

function LockedBudget({ name }: { name: string }) {
  return (
    <div className="flex h-full items-center gap-2.5 rounded-[17px] border bg-card px-3">
      <StickerAvatar name={name} size="md" />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[14px] font-bold">{name}</span>
        <span className="tabular block text-[14px] tracking-[0.08em] text-muted-foreground">₹ ••,•••</span>
      </span>
      <Lock className="size-4.5 shrink-0 text-truck-green-ink" strokeWidth={2} />
    </div>
  );
}

function GhostCard({ tone }: { tone: "red" | "green" }) {
  return (
    <div className="chevron-band h-full rounded-[12px] p-2.5">
      <div className={cn("h-full rounded-[3px] border-2 border-ink", tone === "red" ? "bg-truck-red" : "bg-truck-green-ink")} />
    </div>
  );
}

/** The back of the phone is a truck's tailboard: the one place the tour paints on the device itself. */
function PhoneBack() {
  return (
    <div aria-hidden className={s.back}>
      <div className={cn("chevron-band", s.backBand)}>
        <div className={s.backBoard}>
          <div className={s.camera}>
            <i />
            <i />
          </div>
          <p className={s.horn}>Horn</p>
          <p className={s.ok}>OK</p>
          <p className={s.please}>Please</p>
          <div className={s.backTape} />
          <p className={s.backMark}>Kafila</p>
        </div>
      </div>
    </div>
  );
}
