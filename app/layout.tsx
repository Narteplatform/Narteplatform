import type { Metadata } from "next";
import { Open_Sans, Space_Grotesk } from "next/font/google";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display-family",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-sans-family",
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
    <html lang="it" className={`${openSans.variable} ${spaceGrotesk.variable}`}>
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
