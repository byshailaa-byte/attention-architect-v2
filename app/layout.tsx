import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, Caveat, Newsreader, Figtree } from "next/font/google";
import { AnalyticsLoader } from "./analytics";
import { WhatsAppWidget } from "./components/WhatsAppWidget";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-caveat",
  display: "swap",
});

// Used only by the v2 start flow (?flow=v2): Newsreader headlines, Figtree body.
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-figtree",
  display: "swap",
});

const GA_ID     = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const PIXEL_ID  = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export const metadata: Metadata = {
  title: "Attention Architect — Free Attention Assessment for Parents",
  description:
    "A free, adaptive assessment that shows you exactly what's going on with your child's attention — in plain language, under 5 minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${instrumentSans.variable} ${caveat.variable} ${newsreader.variable} ${figtree.variable} h-full antialiased`}
    >
      <head />
      <body className="min-h-full flex flex-col">
        {children}
        <WhatsAppWidget />
        <AnalyticsLoader gaId={GA_ID} pixelId={PIXEL_ID} />
      </body>
    </html>
  );
}
