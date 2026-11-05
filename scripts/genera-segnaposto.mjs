// Genera le immagini SEGNAPOSTO del sito (testate delle pagine e copertine del
// blog): composizioni astratte nei colori di N'arte, senza foto di terzi.
// Vanno sostituite con foto vere caricate da noi (/admin/contenuti per le
// testate, editor del blog per le copertine).
//
//   node scripts/genera-segnaposto.mjs
//
// Deterministico: lo stesso nome produce sempre la stessa immagine.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const PALETTE = [
  ["#0d1b2a", "#e8542a", "#1a6bad"],
  ["#0d1b2a", "#1a6bad", "#e8542a"],
  ["#0b0b0b", "#e8542a", "#f4784f"],
  ["#0d1b2a", "#2980c8", "#8fc4ea"],
  ["#0b0b0b", "#c0411c", "#1a6bad"],
];

function rng(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

function svg(nome, w, h) {
  const r = rng(nome);
  const [bg, a, b] = PALETTE[Math.floor(r() * PALETTE.length)];
  const cx = w * (0.55 + r() * 0.35);
  const cy = h * (0.35 + r() * 0.4);
  // Onde concentriche, come un suono che si propaga dal palco.
  const onde = Array.from({ length: 9 }, (_, i) => {
    const rad = 60 + i * (w / 14);
    const col = i % 3 === 0 ? a : b;
    const op = (0.55 - i * 0.05).toFixed(2);
    return `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${col}" stroke-opacity="${op}" stroke-width="${2 + (i % 3) * 2}"/>`;
  }).join("");
  // Barre di un equalizzatore lungo la base.
  const n = 48;
  const barre = Array.from({ length: n }, (_, i) => {
    const bh = h * (0.05 + r() * 0.28);
    const x = (w / n) * i;
    return `<rect x="${x + 2}" y="${h - bh}" width="${w / n - 4}" height="${bh}" fill="${i % 5 === 0 ? a : b}" fill-opacity="0.35"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="g" cx="${(cx / w).toFixed(2)}" cy="${(cy / h).toFixed(2)}" r="0.9">
      <stop offset="0" stop-color="${a}" stop-opacity="0.55"/>
      <stop offset="0.45" stop-color="${b}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${bg}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="${bg}"/>
  <rect width="100%" height="100%" fill="url(#g)"/>
  ${onde}
  ${barre}
</svg>`;
}

async function scrivi(nome, file, w, h) {
  await sharp(Buffer.from(svg(nome, w, h))).jpeg({ quality: 82, mozjpeg: true }).toFile(file);
  console.log("✔", file);
}

const TESTATE = ["artisti", "eventi", "format", "blog", "help", "chi-siamo", "collaborazioni", "contatti", "prezzi", "candidatura-artista"];
const BLOG = process.argv.slice(2);

mkdirSync("public/hero", { recursive: true });
mkdirSync("public/blog/copertine", { recursive: true });
for (const k of TESTATE) await scrivi(`hero-${k}`, `public/hero/${k}.jpg`, 2000, 1000);
for (const slug of BLOG) await scrivi(`blog-${slug}`, `public/blog/copertine/${slug}.jpg`, 1600, 1000);
