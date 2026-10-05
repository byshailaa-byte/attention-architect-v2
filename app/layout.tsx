import type { Metadata } from "next";
import localFont from "next/font/local";
import { AnalyticsLoader } from "./analytics";
import { WhatsAppWidget } from "./components/WhatsAppWidget";
import "./globals.css";

// Self-hosted (next/font/local) so builds never fetch from Google. Same families/weights as
// before — the committed files are the latin-subset VARIABLE fonts, so every weight renders
// identically to the previous next/font/google setup.
const bricolage = localFont({
  src: "./fonts/bricolage.woff2",
  weight: "200 800",
  variable: "--font-bricolage",
  display: "swap",
});

const instrumentSans = localFont({
  src: [
    { path: "./fonts/instrument.woff2", weight: "400 600", style: "normal" },
    { path: "./fonts/instrument-italic.woff2", weight: "400 600", style: "italic" },
  ],
  variable: "--font-instrument",
  display: "swap",
});

const caveat = localFont({
  src: "./fonts/caveat.woff2",
  weight: "400 700",
  variable: "--font-caveat",
  display: "swap",
});

// Used only by the v2 start flow (?flow=v2): Newsreader headlines, Figtree body.
const newsreader = localFont({
  src: [
    { path: "./fonts/newsreader.woff2", weight: "500 600", style: "normal" },
    { path: "./fonts/newsreader-italic.woff2", weight: "500 600", style: "italic" },
  ],
  variable: "--font-newsreader",
  display: "swap",
});

const figtree = localFont({
  src: "./fonts/figtree.woff2",
  weight: "400 700",
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
