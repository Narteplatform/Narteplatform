import type { Metadata, Viewport } from "next";
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
  // Monogramma N'arte bianco su notte (#0d1b2a), generato da
  // public/brand/narte-monogram.png. Percorsi con estensione .png: il matcher
  // del middleware li salta già, nessun round-trip Supabase per una favicon.
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "N'arte — Find your vibe",
    description: "Eventi musicali, artisti emergenti, cultura intorno alla città.",
    type: "website",
  },
};

// I tre meta `http-equiv` (cache-control / pragma / expires) e lo script
// KILL_SW che stavano qui sono stati rimossi.
//
// Erano due rimedi temporanei allo stesso incidente: utenti rimasti bloccati su
// una versione vecchia servita da un Service Worker della PWA. Il rimedio ha
// funzionato, ma il costo era permanente e pagato da tutti:
//
//   - i meta dicevano a OGNI browser di non conservare NULLA di OGNI pagina del
//     sito. Ogni navigazione ripartiva da zero, comprese le pagine pubbliche che
//     Next serve già con le proprie intestazioni di cache;
//   - lo script girava a ogni singolo caricamento per disinstallare un Service
//     Worker che, nella stragrande maggioranza dei casi, non c'era più da mesi.
//
// Chi fosse ancora bloccato — se esiste — si sblocca con un ricaricamento
// forzato. Non vale il rallentamento di tutti gli altri, per sempre.
export const viewport: Viewport = {
  themeColor: "#0d1b2a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${openSans.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
