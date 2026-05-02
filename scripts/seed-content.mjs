// Popola il DB N'arte con contenuti reali del cliente:
// - 5 eventi storici (da narteofficial.it)
// - 8 artisti italiani placeholder approvati
// - 3 collaborazioni (Edenlandia, Brusco, Comune di Capri)
//
// Idempotente: usa upsert su slug per eventi/artisti, e check on name per collab.
//
// Uso:
//   node --env-file=.env.local scripts/seed-content.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  console.error("❌ Variabili .env.local mancanti (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const events = [
  {
    title: "Memorial Pino Daniele",
    slug: "memorial-pino-daniele-2026",
    category: "music",
    date: "2026-03-19T21:00:00+01:00",
    city: "Napoli",
    venue: "Teatro Augusteo",
    price: 25,
    cover_image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=70",
    description:
      "Una serata speciale dedicata alla memoria di Pino Daniele, con artisti emergenti e ospiti della scena napoletana.",
    featured: true,
  },
  {
    title: "Capodanno 2025 in Piazza del Plebiscito",
    slug: "capodanno-2025-plebiscito",
    category: "festivals",
    date: "2024-12-31T22:00:00+01:00",
    city: "Napoli",
    venue: "Piazza del Plebiscito",
    price: 0,
    cover_image:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1600&q=70",
    description:
      "Concertone di fine anno gratuito nel cuore di Napoli con la migliore selezione di artisti N'arte.",
    featured: true,
  },
  {
    title: "Sunday N'arte al Brusco",
    slug: "sunday-narte-al-brusco",
    category: "music",
    date: "2025-11-09T19:00:00+01:00",
    city: "Napoli",
    venue: "Brusco Restaurant",
    price: 15,
    cover_image:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=70",
    description:
      "Appuntamento settimanale con musica dal vivo e brunch. Ogni domenica un nuovo artista N'arte sul palco.",
    featured: false,
  },
  {
    title: "Oktoberland Edenlandia",
    slug: "oktoberland-edenlandia-2025",
    category: "festivals",
    date: "2025-10-09T18:00:00+02:00",
    city: "Napoli",
    venue: "Edenlandia",
    price: 10,
    cover_image:
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1600&q=70",
    description:
      "Tre giorni di musica, birra e divertimento al parco divertimenti di Napoli. Line-up curata da N'arte.",
    featured: false,
  },
  {
    title: "Capri Music Awards",
    slug: "capri-music-awards-2025",
    category: "music",
    date: "2025-07-16T21:30:00+02:00",
    city: "Capri",
    venue: "Piazzetta di Capri",
    price: 0,
    cover_image:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1600&q=70",
    description:
      "Premio annuale alla scena musicale italiana emergente. Tre serate di concerti e premiazioni a Capri.",
    featured: true,
  },
];

const artists = [
  {
    stage_name: "Marta Esposito",
    slug: "marta-esposito",
    city: "Napoli",
    genre: ["pop", "indie"],
    bio: "Cantautrice napoletana classe 1998. Mescola pop e indie con liriche in italiano e dialetto.",
    cover_image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=70",
    social_links: { instagram: "@martaesposito", spotify: "https://open.spotify.com/" },
  },
  {
    stage_name: "Luca Romano",
    slug: "luca-romano",
    city: "Roma",
    genre: ["cantautore"],
    bio: "Cantautore romano. Chitarra acustica e parole, eredità di De André e Dalla.",
    cover_image:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=70",
    social_links: { instagram: "@lucaromano.music" },
  },
  {
    stage_name: "Aria Mare",
    slug: "aria-mare",
    city: "Napoli",
    genre: ["jazz", "soul"],
    bio: "Voce jazz e soul partenopea. Repertorio tra standard americani e brani originali.",
    cover_image:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=70",
    social_links: { instagram: "@aria.mare" },
  },
  {
    stage_name: "DJ Solis",
    slug: "dj-solis",
    city: "Milano",
    genre: ["elettronica", "house"],
    bio: "Producer e DJ milanese. House melodica e set notturni nei migliori club italiani.",
    cover_image:
      "https://images.unsplash.com/photo-1571266028243-d220bc2b6cb1?auto=format&fit=crop&w=900&q=70",
    social_links: { instagram: "@djsolis", spotify: "https://open.spotify.com/" },
  },
  {
    stage_name: "Federico Conte",
    slug: "federico-conte",
    city: "Bologna",
    genre: ["rock", "alternative"],
    bio: "Frontman della scena rock alternative bolognese. Live energetici e testi in italiano.",
    cover_image:
      "https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?auto=format&fit=crop&w=900&q=70",
    social_links: { instagram: "@federicoconte.band" },
  },
  {
    stage_name: "Sara Greco",
    slug: "sara-greco",
    city: "Napoli",
    genre: ["r&b", "neo-soul"],
    bio: "R&B e neo-soul con un timbro caldo. Originaria del Vomero, formata tra Napoli e Londra.",
    cover_image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=70",
    social_links: { instagram: "@saragreco.soul" },
  },
  {
    stage_name: "Il Collettivo Sud",
    slug: "il-collettivo-sud",
    city: "Salerno",
    genre: ["world", "folk"],
    bio: "Sei elementi tra fiati e percussioni. World music e folk del Mediterraneo.",
    cover_image:
      "https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=900&q=70",
    social_links: { instagram: "@collettivosud" },
  },
  {
    stage_name: "Vera Iovine",
    slug: "vera-iovine",
    city: "Napoli",
    genre: ["pop urban", "trap"],
    bio: "Pop urban con influenze trap. Voce riconoscibile della nuova scena napoletana.",
    cover_image:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=70",
    social_links: { instagram: "@vera.iovine" },
  },
];

const collabs = [
  {
    name: "Edenlandia",
    link: "https://www.edenlandia.it",
    description: "Parco divertimenti storico di Napoli, partner di Oktoberland.",
    order_index: 1,
  },
  {
    name: "Brusco Restaurant",
    link: null,
    description: "Location della rassegna Sunday N'arte.",
    order_index: 2,
  },
  {
    name: "Comune di Capri",
    link: null,
    description: "Patrocinio dei Capri Music Awards.",
    order_index: 3,
  },
];

console.log("📅 Eventi…");
for (const ev of events) {
  const { error } = await admin
    .from("events")
    .upsert(
      {
        title: ev.title,
        slug: ev.slug,
        category: ev.category,
        date: ev.date,
        city: ev.city,
        venue: ev.venue,
        price: ev.price,
        cover_image: ev.cover_image,
        description: ev.description,
        featured: ev.featured,
      },
      { onConflict: "slug" }
    );
  if (error) console.error(`  ❌ ${ev.slug}: ${error.message}`);
  else console.log(`  ✅ ${ev.slug}`);
}

console.log("\n🎤 Artisti…");
for (const a of artists) {
  const { error } = await admin
    .from("artists")
    .upsert(
      {
        stage_name: a.stage_name,
        slug: a.slug,
        bio: a.bio,
        genre: a.genre,
        city: a.city,
        cover_image: a.cover_image,
        social_links: a.social_links,
        status: "approved",
      },
      { onConflict: "slug" }
    );
  if (error) console.error(`  ❌ ${a.slug}: ${error.message}`);
  else console.log(`  ✅ ${a.slug}`);
}

console.log("\n🤝 Collaborazioni…");
for (const c of collabs) {
  const { data: existing } = await admin
    .from("collaborations")
    .select("id")
    .eq("name", c.name)
    .maybeSingle();
  if (existing) {
    console.log(`  ℹ️  ${c.name} già presente`);
    continue;
  }
  const { error } = await admin.from("collaborations").insert(c);
  if (error) console.error(`  ❌ ${c.name}: ${error.message}`);
  else console.log(`  ✅ ${c.name}`);
}

console.log("\n🎉 Seed contenuti completato.");
