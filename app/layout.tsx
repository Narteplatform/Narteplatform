import type { Metadata } from "next";
import localFont from "next/font/local";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const ignazio = localFont({
  src: "../public/fonts/Ignazio.ttf",
  variable: "--font-display",
  display: "swap",
  weight: "400 900",
});

const din2014 = localFont({
  src: [
    { path: "../public/fonts/DIN2014-Regular.woff2", format: "woff2" },
    { path: "../public/fonts/DIN2014-Regular.woff", format: "woff" },
    { path: "../public/fonts/DIN2014-Regular.ttf", format: "truetype" },
  ],
  variable: "--font-sans",
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
    <html lang="it" className={`${din2014.variable} ${ignazio.variable}`}>
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
