import { NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/server";
import { allowByIp, LIMITI } from "@/lib/security/rate-limit";
import { hostMediaAmmesso } from "@/lib/security/media-hosts";

export const runtime = "nodejs";

/**
 * Anteprima sfocata della copertina di un artista, per la vetrina degli ospiti.
 *
 * La sfocatura avviene QUI, sul server: al browser dell'ospite arriva un
 * webp di 24x30 pixel, non la copertina. Nessun nome, slug, città o URL
 * originale esce da questa rotta; la risposta è solo l'immagine.
 *
 * Sola lettura. Ogni errore (id non valido, artista non pubblico, nessuna
 * copertina, host non ammesso, download fallito) risponde 404 senza dettagli.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BYTES = 15 * 1024 * 1024;


function nonTrovato() {
  return new NextResponse(null, {
    status: 404,
    headers: { "X-Robots-Tag": "noindex", "Cache-Control": "no-store" },
  });
}

async function scarica(url: URL): Promise<Buffer | null> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    redirect: "error",
  });
  if (!res.ok || !res.body) return null;
  const dichiarata = Number(res.headers.get("content-length") ?? "0");
  if (dichiarata > MAX_BYTES) return null;

  const reader = res.body.getReader();
  const pezzi: Uint8Array[] = [];
  let totale = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    totale += value.byteLength;
    if (totale > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    pezzi.push(value);
  }
  return Buffer.concat(pezzi);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) return nonTrovato();

    // Dopo la validazione dell'id (gratuita) e prima di database e download.
    if (!(await allowByIp(LIMITI.anteprimaArtista))) {
      return new NextResponse(null, {
        status: 429,
        headers: { "Retry-After": "600", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
      });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("artists")
      .select("cover_image")
      .eq("id", id)
      .eq("is_public", true)
      .maybeSingle();
    if (error || !data?.cover_image) return nonTrovato();

    let url: URL;
    try {
      url = new URL(data.cover_image);
    } catch {
      return nonTrovato();
    }
    // Solo gli host dei NOSTRI media (progetto Supabase e pull zone Bunny), non
    // qualunque *.supabase.co / *.b-cdn.net: questa rotta scarica dal server
    // l'URL in colonna, e un host altrui la renderebbe un proxy.
    if (url.protocol !== "https:" || !hostMediaAmmesso(url.hostname)) return nonTrovato();

    const originale = await scarica(url);
    if (!originale) return nonTrovato();

    const out = await sharp(originale)
      .rotate()
      .resize(24, 30, { fit: "cover" })
      .blur(1.5)
      .webp({ quality: 40 })
      .toBuffer();

    return new NextResponse(new Uint8Array(out), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return nonTrovato();
  }
}
