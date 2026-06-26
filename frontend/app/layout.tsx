import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Spectral, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/auth";
import { SearchProvider } from "./contexts/search";
import SearchOverlay from "./components/SearchOverlay";
import CursorFollow from "./components/CursorFollow";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const barlowCondensed = Barlow_Condensed({
  weight: ["700", "900"],
  subsets: ["latin"],
  variable: "--ff-display",
  display: "swap",
});

const spectral = Spectral({
  weight: ["400", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--ff-body",
  display: "swap",
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--ff-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CheckPoint — A journal for your games",
  description:
    "Track the played, the abandoned, the returned to. CheckPoint is a personal record of every game that mattered.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Shrink the layout viewport when the virtual keyboard opens so 100dvh and
  // fixed bottom: 0 elements (e.g. the AI chat input bar) stay above it
  // instead of being overlapped by the keyboard.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${spectral.variable} ${shareTechMono.variable}`}
    >
      <body>
        <div className="grain-overlay" aria-hidden="true" />
        <CursorFollow />
        <AuthProvider>
          <SearchProvider>
            <SearchOverlay />
            {children}
          </SearchProvider>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
