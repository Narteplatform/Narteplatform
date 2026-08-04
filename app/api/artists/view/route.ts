import { after } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import {
  clientIp,
  isBotUserAgent,
  romeDateISO,
  visitorHash,
} from "@/lib/analytics/visitor";
import type { ProfileViewViewerKind } from "@/lib/supabase/types";

export const runtime = "nodejs"; // serve node:crypto
export const dynamic = "force-dynamic";

/**
 * Registra una visita al profilo pubblico di un artista.
 *
 * Perché un beacon dal client e non `after()` dentro la pagina: `after()`
 * conterebbe ogni render server, cioè anche i crawler, i prefetch di
 * <Link>, gli scraper delle anteprime social e i check di uptime. Distinguerli
 * richiederebbe di indovinare dallo user-agent, cioè di appoggiare tutta
 * l'accuratezza sulla stessa euristica che si voleva evitare. Consegneremmo a
 * un artista Max dei numeri che lui stesso, guardandoli, contesterebbe.
 *
 * Il beacon invece parte solo in un browser che ha eseguito JavaScript (i
 * crawler si escludono da soli, senza denylist), solo su navigazione reale
 * (niente prefetch) e solo dopo qualche secondo di permanenza (niente rimbalzi).
 *
 * `after()` si usa comunque, ma QUI: si risponde 204 subito e la scrittura
 * avviene dopo, così il beacon non ha mai latenza percepibile.
 *
 * Ogni rifiuto risponde 204 e non un 4xx: a un bot non si dà un segnale su cosa
 * lo ha bloccato, e al browser non serve saperlo.
 */

const bodySchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9-]+$/),
});

const NO_CONTENT = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  // Solo richieste partite dal nostro sito. Un POST diretto da fuori non ha
  // questo header o lo ha a "cross-site".
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "same-site") return NO_CONTENT();

  if (isBotUserAgent(request.headers.get("user-agent"))) return NO_CONTENT();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NO_CONTENT();
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return NO_CONTENT();
  const { slug } = parsed.data;

  const ip = clientIp(request.headers);
  if (!ip) return NO_CONTENT();

  // Fail closed: senza VISIT_HASH_SALT non si scrive niente (vedi visitor.ts).
  const hash = visitorHash(ip, slug, romeDateISO());
  if (!hash) return NO_CONTENT();

  // Il ruolo si legge dalla sessione, MAI da quello che dichiara il client:
  // altrimenti chiunque potrebbe farsi contare come organizzatore.
  const viewer = await getCurrentUser();
  const role = viewer?.profile?.role;
  const kind: ProfileViewViewerKind =
    role === "organizer" ? "organizer" : role === "artist" ? "artist" : viewer ? "user" : "anon";

  after(async () => {
    try {
      const admin = createAdminClient();
      // La RPC applica le esclusioni che il client non può garantire:
      // auto-visita, superadmin, profilo non pubblico. E deduplica sulla PK.
      await admin.rpc("record_artist_profile_view", {
        p_slug: slug,
        p_visitor_hash: hash,
        p_viewer_kind: kind,
        p_viewer_user_id: viewer?.id ?? null,
      });
    } catch (err) {
      // Una statistica persa non è un errore che meriti di risalire: la
      // risposta è già partita e la pagina dell'artista non ne dipende.
      console.error("[artists/view] record failed", err);
    }
  });

  return NO_CONTENT();
}
