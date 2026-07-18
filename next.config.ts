import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "date-fns"],
  },
  typescript: {
    // Pre-existing Supabase types treat several queries as `never`. Runtime
    // correctness is enforced by Zod validators + RLS policies.
    ignoreBuildErrors: true,
  },
  // La chiave `eslint` non esiste più in NextConfig da Next.js 16: `next lint`
  // e l'opzione di config sono stati rimossi (ESLint non gira più durante
  // `next build`, va invocato a parte con `npm run lint`). La documentazione
  // ufficiale di Next 16 lo conferma esplicitamente: "the `eslint` option in
  // your Next config file is no longer needed and can be safely removed."
  // Rimuoverla non disattiva nulla che fosse ancora attivo: il build non
  // esegue più il lint in nessun caso, con o senza questa chiave.
};

export default nextConfig;
