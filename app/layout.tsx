import type { Metadata, Viewport } from "next";
import { Bungee, Hind } from "next/font/google";
import { OfflineBanner } from "@/components/offline-banner";
import { SwRegister } from "@/components/sw-register";
import { ToastProvider } from "@/components/kafila/toast";
import "./globals.css";

// Bungee: sign-painter lettering, only for the one painted board per screen. Hind: everything else.
const bungee = Bungee({ variable: "--font-bungee", weight: "400", subsets: ["latin"] });
const hind = Hind({ variable: "--font-hind", weight: ["400", "500", "600", "700"], subsets: ["latin"] });

const TITLE = "Kafila · Group trip planning for friends on different budgets";
const DESCRIPTION =
  "Everyone adds a private budget. Kafila picks the trip plan that fits all of them and keeps the least happy friend as happy as possible.";

// The share image comes from app/opengraph-image.tsx; Next adds it to openGraph and twitter on every page.
export const metadata: Metadata = {
  title: { default: TITLE, template: "%s · Kafila" },
  description: DESCRIPTION,
  applicationName: "Kafila",
  openGraph: { type: "website", siteName: "Kafila", title: TITLE, description: DESCRIPTION, locale: "en_IN" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  appleWebApp: { capable: true, title: "Kafila" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#F4F6F1" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bungee.variable} ${hind.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* First stop for keyboard users; pages give their <main> id="main". */}
        <a
          href="#main"
          className="fixed top-3 left-3 z-50 -translate-y-[200%] rounded-lg bg-ink px-4 py-3 text-[15px] font-semibold text-wash focus-visible:translate-y-0"
        >
          Skip to content
        </a>
        <SwRegister />
        <OfflineBanner />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
