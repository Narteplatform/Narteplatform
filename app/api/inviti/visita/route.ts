import { after } from "next/server";
import { z } from "zod";
import { invitiVisibili } from "@/lib/inviti/modalita";
import { registraAperturaInvito } from "@/lib/inviti/visite";

export const runtime = "nodejs"; // serve node:crypto
export const dynamic = "force-dynamic";

/**
 * Beacon dell'atterraggio /invito/{codice}: conta un visitatore unico al
 * giorno per link (migration 0079). Stesso principio di /api/artists/view:
 * parte solo da un browser che ha eseguito JavaScript ed è rimasto sulla
 * pagina, quindi le anteprime di WhatsApp e i crawler non contano.
 *
 * Risponde sempre 204, anche quando scarta: a un bot non si dice perché.
 */

const bodySchema = z.object({ codice: z.string().min(4).max(48) });

const NO_CONTENT = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  if (!invitiVisibili()) return NO_CONTENT();

  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "same-site") return NO_CONTENT();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NO_CONTENT();
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return NO_CONTENT();

  const headers = new Headers(request.headers);
  after(() => registraAperturaInvito({ codice: parsed.data.codice, kind: "visita", headers }));
  return NO_CONTENT();
}
