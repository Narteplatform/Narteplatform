import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "N'arte — Find your vibe",
  description:
    "Piattaforma di N'arte: eventi musicali, artisti emergenti, cultura. Trova la tua vibe.",
  metadataBase: new URL(getSiteUrl()),
  openGraph: {
    title: "N'arte — Find your vibe",
    description: "Eventi musicali, artisti emergenti, cultura intorno alla città.",
    type: "website",
  },
};

// Inline script che azzera ogni Service Worker registrato e svuota le
// CacheStorage del browser. Risolve il caso di utenti bloccati su una
// vecchia versione PWA-cached.
const KILL_SW = `
try {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { r.unregister(); });
    });
  }
  if (typeof caches !== 'undefined') {
    caches.keys().then(function (keys) {
      keys.forEach(function (k) { caches.delete(k); });
    });
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${dmSans.variable} ${fraunces.variable}`}>
      <head>
        <meta httpEquiv="cache-control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="pragma" content="no-cache" />
        <meta httpEquiv="expires" content="0" />
        <script dangerouslySetInnerHTML={{ __html: KILL_SW }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
