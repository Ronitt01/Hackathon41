import Image from "next/image";
import Link from "next/link";
import { DemoTripButton } from "@/components/demo-trip-button";
import { cn } from "@/lib/utils";
import { BTN_PRIMARY, DEMO_SECONDARY, WRAP, photo } from "./kit";
import { PhonePlan } from "./phone-plan";
import s from "./hero.module.css";

const H1 = "Group trip planning for friends on different budgets";

/** Screen one, alone: what Kafila is and for whom, one hard fact, two actions, and the product itself. */
export function Hero() {
  const ground = photo("palolem");
  const words = H1.split(" ");
  return (
    <section
      id="top"
      data-enter
      aria-labelledby="hero-h"
      className="hero relative flex min-h-svh flex-col pt-20 pb-8 lg:h-svh lg:min-h-[640px] lg:pt-30 lg:pb-24"
    >
      <div className={cn(WRAP, "flex flex-1 flex-col")}>
        {/* One .hero-text holds both columns, so the picture column is not read as a strip docked under the text. */}
        <div className="hero-text flex flex-1 flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-x-6 lg:gap-y-0">
          <div className="lg:col-span-6 lg:pr-6">
            <h1
              id="hero-h"
              className="text-[36px] leading-[1.05] font-semibold tracking-[-0.02em] text-balance md:text-[48px] xl:text-[60px]"
            >
              {words.map((w, i) => (
                <span key={i}>
                  <span className={s.word}>
                    <span style={{ ["--w" as string]: i }}>{w}</span>
                  </span>
                  {i < words.length - 1 && " "}
                </span>
              ))}
            </h1>
            <p
              className={cn(s.after, "hero__lead mt-5 max-w-[36ch] text-[18px] leading-[1.5] text-pretty md:text-[20px]")}
              style={{ ["--a" as string]: 0 }}
            >
              Everyone adds a budget only they can see. In under 20 seconds Kafila picks the plan that fits all of them and
              keeps the least happy friend as happy as possible.
            </p>
            <div className="mt-6 flex flex-wrap items-start gap-3 lg:mt-8">
              <Link href="/start" className={cn(s.after, BTN_PRIMARY)} style={{ ["--a" as string]: 1 }}>
                Start a trip
              </Link>
              <div className={s.after} style={{ ["--a" as string]: 2 }}>
                <DemoTripButton className={DEMO_SECONDARY} />
              </div>
            </div>
          </div>

          {/* The picture: a Goa beach as the panel's ground, the real Plan tab standing on it, cut by the panel's foot. */}
          <div className="hero__media relative min-h-[260px] flex-1 overflow-hidden rounded-[17px] lg:col-span-6 lg:col-start-7 lg:h-full">
            <Image
              src={ground.file}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 1100px, 160vw"
              className={cn(s.photo, "object-cover")}
            />
            <PhonePlan
              className={cn(
                s.device,
                "absolute inset-x-0 top-3 bottom-0 mx-auto w-[calc(100%-2.5rem-14px)] max-w-[326px] lg:top-10 lg:w-[calc(100%-4rem-14px)] lg:max-w-[346px]",
              )}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
