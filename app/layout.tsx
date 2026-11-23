import type { Metadata, Viewport } from "next";
import { Bungee, Hind } from "next/font/google";
import { OfflineBanner } from "@/components/offline-banner";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

// Bungee: sign-painter lettering, only for the one painted board per screen. Hind: everything else.
const bungee = Bungee({ variable: "--font-bungee", weight: "400", subsets: ["latin"] });
const hind = Hind({ variable: "--font-hind", weight: ["400", "500", "600", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kafila",
  description: "Group trip planning that's fair to everyone.",
  appleWebApp: { capable: true, title: "Kafila" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#F4F6F1" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bungee.variable} ${hind.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SwRegister />
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
