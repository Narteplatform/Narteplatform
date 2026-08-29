import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // *.supabase.co RESTA: è la convivenza. I contenuti già caricati hanno un
      // URL Supabase assoluto in colonna e continuano a passare di lì anche
      // dopo il passaggio a bunny.net. Rimuoverlo li renderebbe invisibili.
      { protocol: "https", hostname: "*.supabase.co" },
      // bunny.net: sia la pull zone dello storage (immagini, audio) sia quella
      // di Stream (poster e anteprime dei video).
      { protocol: "https", hostname: "*.b-cdn.net" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "date-fns"],
  },

  // Prima dell'aggiunta di questo blocco il sito non mandava NESSUN header di
  // sicurezza: né qui, né in vercel.json, né nel middleware.
  //
  // La CSP parte in `Report-Only` DI PROPOSITO. Una policy troppo stretta non
  // dà errore al deploy: rompe in silenzio pezzi di pagina (un'immagine che non
  // carica, uno script che non parte) e ce ne si accorge dagli utenti. In
  // sola segnalazione il browser esegue tutto normalmente e scrive in console
  // ciò che avrebbe bloccato. Si verifica su home, profilo artista, dashboard,
  // admin e chat; se la console resta pulita si rinomina la chiave in
  // `Content-Security-Policy` e la policy diventa attiva.
  //
  // QUANDO ENTRERÀ IUBENDA: aggiungere `https://cdn.iubenda.com` a script-src e
  // connect-src, e `https://cs.iubenda.com` a script-src. Senza, il banner non
  // si carica.
  // I documenti legali vivono in una sola pagina dinamica (app/(public)/legale/[doc])
  // ma devono rispondere a indirizzi brevi e stabili: `/privacy`, non
  // `/legale/privacy`. Sono URL che finiscono nelle informative, nei contratti e
  // nel piè di pagina delle email, e cambiarli dopo significa rompere link
  // stampati altrove.
  //
  // Riscrittura e non redirect, di proposito: l'utente vede sempre e solo
  // l'indirizzo breve, senza un passaggio intermedio.
  async rewrites() {
    return [
      { source: "/privacy", destination: "/legale/privacy" },
      { source: "/cookie-policy", destination: "/legale/cookie-policy" },
      { source: "/termini", destination: "/legale/termini" },
    ];
  },

  async headers() {
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' e 'unsafe-eval' servono a Next in sviluppo e agli
      // script JSON-LD inline. Da stringere quando si passerà ai nonce.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      // blob: serve alle anteprime locali degli upload prima dell'invio.
      "img-src 'self' data: blob: https://*.supabase.co https://*.b-cdn.net https://images.unsplash.com https://source.unsplash.com",
      "media-src 'self' blob: https://*.supabase.co https://*.b-cdn.net",
      // video.bunnycdn.com  → l'upload TUS dei video, che parte dal browser.
      // *.storage.bunnycdn.com → la PUT presigned dell'audio: il file non può
      //   passare dal server perché il body di una funzione Vercel si ferma a
      //   4,5 MB e una traccia arriva a 25 MB.
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://video.bunnycdn.com https://*.storage.bunnycdn.com https://*.b-cdn.net",
      // Il player dei video è un iframe Bunny. Entrambi gli hostname: la
      // documentazione indica player.mediadelivery.net, ma il pannello ha
      // storicamente proposto anche iframe.mediadelivery.net.
      "frame-src https://js.stripe.com https://hooks.stripe.com https://player.mediadelivery.net https://iframe.mediadelivery.net",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy-Report-Only", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            // microphone resta consentito a se stessi: serve ai messaggi
            // vocali della chat (components/chat/VoiceRecorder.tsx).
            value: "camera=(), geolocation=(), microphone=(self), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  // Nessun `typescript: { ignoreBuildErrors: true }`: era stato aggiunto
  // quando i tipi Supabase facevano collassare ogni query a `never` (886
  // errori). La causa è stata rimossa — mancava `Relationships` sulla view
  // `booking_requests_public`, e senza quella l'intero schema non soddisfaceva
  // il vincolo di postgrest-js. Ora il typecheck è a zero e gli errori di tipo
  // devono bloccare il deploy, non scivolare in produzione.
  // Se il build fallisce sui tipi: `npm run typecheck` per vedere cosa,
  // e si corregge. Non reintrodurre il flag.
  // La chiave `eslint` non esiste più in NextConfig da Next.js 16: `next lint`
  // e l'opzione di config sono stati rimossi (ESLint non gira più durante
  // `next build`, va invocato a parte con `npm run lint`). La documentazione
  // ufficiale di Next 16 lo conferma esplicitamente: "the `eslint` option in
  // your Next config file is no longer needed and can be safely removed."
  // Rimuoverla non disattiva nulla che fosse ancora attivo: il build non
  // esegue più il lint in nessun caso, con o senza questa chiave.
};

export default nextConfig;
