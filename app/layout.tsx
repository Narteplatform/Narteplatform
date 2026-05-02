import type { Metadata } from "next";
import { Inter, Archivo_Black } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "N'arte — Find your vibe",
  description:
    "Piattaforma di N'arte: eventi musicali, artisti emergenti, cultura. Trova la tua vibe.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "N'arte — Find your vibe",
    description: "Eventi musicali, artisti emergenti, cultura intorno alla città.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${inter.variable} ${archivoBlack.variable}`}>
      <body>{children}</body>
    </html>
  );
}
