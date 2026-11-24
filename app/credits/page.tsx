import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { H2, INTRO, NAV_LINK, PHOTOS, WRAP } from "@/components/landing/kit";
import { cn } from "@/lib/utils";
import credits from "@/public/photos/credits.json";

export const metadata: Metadata = { title: "Photo credits" };

/** Who took each photograph on the landing page, under which licence, and where it came from. */
export default function CreditsPage() {
  const byFile = new Map(credits.photos.map((c) => [`/photos/${c.file}`, c]));
  return (
    <main id="main" tabIndex={-1} className={cn(WRAP, "py-16 outline-none lg:py-24")}>
      <Link href="/" className={cn(NAV_LINK, "gap-1.5")}>
        <ArrowLeft aria-hidden strokeWidth={1.8} className="size-4" />
        Back to Kafila
      </Link>
      <h1 className={cn(H2, "mt-8")}>Photo credits</h1>
      <p className={INTRO}>
        The photographs of Goa on Kafila&apos;s home page come from Wikimedia Commons and are used under the licences below.
      </p>
      <ul className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {PHOTOS.map((p) => {
          const c = byFile.get(p.file);
          return (
            <li key={p.file} className="grid content-start gap-3">
              <Image
                src={p.file}
                alt=""
                width={p.width}
                height={p.height}
                sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
                className="aspect-[3/2] w-full rounded-lg object-cover"
              />
              <p className="text-[16px] leading-[1.5]">{p.alt}</p>
              {c && (
                <p className="text-[15px] text-muted-foreground">
                  By {c.by},{" "}
                  <a href={c.licenceUrl} rel="noopener" className="underline underline-offset-4 hover:text-ink">
                    {c.licence}
                  </a>
                  ,{" "}
                  <a href={c.page} rel="noopener" className="underline underline-offset-4 hover:text-ink">
                    source
                  </a>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
