// Ricolora un PNG con trasparenza, tenendo intatto il canale alpha.
//
//   node scripts/recolor-png.mjs <input.png> <output.png> <#rrggbb>
//
// Serve per ricavare la versione scura del logo ufficiale, che esiste solo
// in bianco su trasparente: nel footer delle email il fondo è avorio e un
// logo bianco sarebbe invisibile. Sostituire i canali RGB lasciando l'alpha
// dov'è preserva l'antialiasing dei bordi — a differenza di una soglia o di
// una sostituzione di colore secco, che li farebbe seghettare.
//
// Nessuna dipendenza: PNG a colori diretti (colortype 6, 8 bit, non
// interlacciato) si decodificano con lo zlib di Node.

import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync, deflateSync, crc32 } from "node:zlib";

const [input, output, hex] = process.argv.slice(2);
if (!input || !output || !hex) {
  console.error("Uso: node scripts/recolor-png.mjs <input.png> <output.png> <#rrggbb>");
  process.exit(1);
}

const m = /^#?([0-9a-f]{6})$/i.exec(hex);
if (!m) {
  console.error(`❌ Colore non valido: "${hex}". Atteso #rrggbb.`);
  process.exit(1);
}
const target = [
  parseInt(m[1].slice(0, 2), 16),
  parseInt(m[1].slice(2, 4), 16),
  parseInt(m[1].slice(4, 6), 16),
];

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const src = readFileSync(input);
if (!src.subarray(0, 8).equals(SIG)) fail("Non è un PNG");

// --- lettura chunk ---------------------------------------------------------

let pos = 8;
let ihdr = null;
const idat = [];

while (pos < src.length) {
  const len = src.readUInt32BE(pos);
  const type = src.subarray(pos + 4, pos + 8).toString("ascii");
  const data = src.subarray(pos + 8, pos + 8 + len);
  if (type === "IHDR") ihdr = data;
  else if (type === "IDAT") idat.push(data);
  pos += 12 + len;
  if (type === "IEND") break;
}

if (!ihdr) fail("IHDR mancante");

const width = ihdr.readUInt32BE(0);
const height = ihdr.readUInt32BE(4);
const bitDepth = ihdr[8];
const colorType = ihdr[9];
const interlace = ihdr[12];

if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
  fail(`Supportati solo PNG RGBA 8 bit non interlacciati (qui: bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace})`);
}

// --- unfilter --------------------------------------------------------------

const BPP = 4;
const stride = width * BPP;
const raw = inflateSync(Buffer.concat(idat));
const px = Buffer.alloc(height * stride);

for (let y = 0; y < height; y++) {
  const filter = raw[y * (stride + 1)];
  const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
  const out = px.subarray(y * stride, (y + 1) * stride);
  const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;

  for (let i = 0; i < stride; i++) {
    const a = i >= BPP ? out[i - BPP] : 0; // pixel a sinistra
    const b = prev ? prev[i] : 0; // pixel sopra
    const c = prev && i >= BPP ? prev[i - BPP] : 0; // pixel in alto a sinistra
    let value;
    switch (filter) {
      case 0: value = line[i]; break;
      case 1: value = line[i] + a; break;
      case 2: value = line[i] + b; break;
      case 3: value = line[i] + ((a + b) >> 1); break;
      case 4: value = line[i] + paeth(a, b, c); break;
      default: fail(`Filtro PNG sconosciuto: ${filter}`);
    }
    out[i] = value & 0xff;
  }
}

// --- ricolora --------------------------------------------------------------

let touched = 0;
for (let i = 0; i < px.length; i += BPP) {
  if (px[i + 3] === 0) continue; // pixel del tutto trasparente: lasciato com'è
  px[i] = target[0];
  px[i + 1] = target[1];
  px[i + 2] = target[2];
  touched++;
}

// --- riscrittura -----------------------------------------------------------

// Filtro 0 (None) su ogni riga: il file pesa qualcosa in più di un ottimizzato,
// ma resta un PNG valido ovunque e il codice non ha da scegliere il filtro.
const refiltered = Buffer.alloc(height * (stride + 1));
for (let y = 0; y < height; y++) {
  refiltered[y * (stride + 1)] = 0;
  px.copy(refiltered, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
}

const out = Buffer.concat([
  SIG,
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(refiltered, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

writeFileSync(output, out);

console.log(`✔  ${output}`);
console.log(`   ${width}×${height}, ${touched.toLocaleString("it-IT")} pixel ricolorati in #${m[1].toLowerCase()}`);
console.log(`   ${(out.length / 1024).toFixed(1)} KB`);

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}
