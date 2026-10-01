import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { LEGAL_VERSION } from "@/lib/legal/content";
import { logger } from "@/lib/logger";

/**
 * Webhook di Brevo: disiscrizioni dalla newsletter fatte FUORI dal sito (link
 * «annulla iscrizione» nelle email, eliminazione del contatto da Brevo).
 *
 * Brevo non firma i webhook marketing: l'autenticazione è un segreto condiviso
 * (`BREVO_WEBHOOK_SECRET`) che si mette nell'URL registrato su Brevo
 * (`?secret=…`) oppure in un header (`x-brevo-webhook-secret` o
 * `Authorization: Bearer …`). Il confronto è a tempo costante.
 *
 * Risposte: 503 se il segreto non è configurato (senza non si può verificare),
 * 401 se non coincide, poi SEMPRE 200 — anche se l'utente non si trova o la
 * scrittura fallisce — perché un errore farebbe riprovare Brevo all'infinito
 * senza che il ritrovare l'utente diventi più facile. L'esito va nei log,
 * senza email né altri dati personali.
 *
 * COME SI TROVA L'UTENTE. L'email sta in `auth.users`, non in `profiles`, e non
 * esiste una RPC di ricerca per email. `auth.admin.listUsers` non filtra: si
 * scorre in pagine da 1000, al massimo 20 pagine (20.000 account), fermandosi
 * alla prima corrispondenza. Oltre quella soglia l'utente non si trova e si
 * logga «non trovato»: va sostituito con una RPC dedicata (SQL, fuori da questo
 * compito) quando gli iscritti si avvicinano al limite.
 */

const EVENTI_DISISCRIZIONE = new Set([
  "unsubscribed",
  "unsubscribe",
  "contact_deleted",
]);

const PAGINE_MAX = 20;
const PER_PAGINA = 1000;

function segretoValido(request: Request): boolean {
  const atteso = process.env.BREVO_WEBHOOK_SECRET;
  if (!atteso) return false;

  const url = new URL(request.url);
  const auth = request.headers.get("authorization");
  const ricevuto =
    request.headers.get("x-brevo-webhook-secret") ??
    (auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null) ??
    url.searchParams.get("secret") ??
    "";

  // Si confrontano gli hash: stessa lunghezza sempre, nessuna fuga sul formato.
  const a = createHash("sha256").update(ricevuto).digest();
  const b = createHash("sha256").update(atteso).digest();
  return timingSafeEqual(a, b);
}

function estraiEventi(corpo: unknown): Array<{ evento: string; email: string }> {
  const lista = Array.isArray(corpo) ? corpo : [corpo];
  const out: Array<{ evento: string; email: string }> = [];
  for (const voce of lista) {
    if (!voce || typeof voce !== "object") continue;
    const o = voce as Record<string, unknown>;
    const evento = typeof o.event === "string" ? o.event : "";
    const email = typeof o.email === "string" ? o.email.trim().toLowerCase() : "";
    if (EVENTI_DISISCRIZIONE.has(evento) && email) out.push({ evento, email });
  }
  return out;
}

/**
 * Indice email → id utente, letto UNA volta per richiesta (Brevo manda gli
 * eventi anche a lotti): `null` se la lettura è fallita o incompleta.
 */
async function indiceUtenti(admin: ReturnType<typeof createAdminClient>): Promise<Map<string, string> | null> {
  const mappa = new Map<string, string>();
  for (let page = 1; page <= PAGINE_MAX; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGINA });
    if (error || !data) return null;
    for (const u of data.users) if (u.email) mappa.set(u.email.toLowerCase(), u.id);
    if (data.users.length < PER_PAGINA) return mappa;
  }
  // Più utenti di quanti se ne leggono: meglio un errore (e un nuovo tentativo
  // di Brevo) che un «non trovato» falso.
  return null;
}

async function registraRitiro(userId: string): Promise<"scritto" | "gia-ritirato" | "errore"> {
  const admin = createAdminClient();

  // Idempotenza (Brevo può consegnare più volte): se l'ultimo evento marketing
  // è già un ritiro non si aggiunge altro rumore al registro. Lettura con
  // errore controllato: se fallisce NON si scrive.
  const { data: ultimo, error: letturaErr } = await admin
    .from("user_consents")
    .select("accepted")
    .eq("user_id", userId)
    .eq("kind", "marketing")
    .order("accepted_at", { ascending: false })
    .limit(1);
  if (letturaErr) return "errore";
  if (ultimo && ultimo.length > 0 && ultimo[0].accepted === false) return "gia-ritirato";

  const { error } = await admin.from("user_consents").insert({
    user_id: userId,
    kind: "marketing",
    version: LEGAL_VERSION,
    accepted: false,
    ref: "brevo-webhook",
  });
  return error ? "errore" : "scritto";
}

export async function POST(request: Request) {
  if (!process.env.BREVO_WEBHOOK_SECRET) {
    logger.warn("brevo/webhook", "BREVO_WEBHOOK_SECRET non configurato: richiesta rifiutata");
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  if (!segretoValido(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Da qui in poi: 200, salvo errori di lettura o scrittura (500 → Brevo riprova).
  try {
    const testo = await request.text();
    let corpo: unknown = null;
    try {
      corpo = JSON.parse(testo);
    } catch {
      logger.warn("brevo/webhook", "corpo non JSON");
      return NextResponse.json({ ok: true });
    }

    const eventi = estraiEventi(corpo);
    if (eventi.length === 0) return NextResponse.json({ ok: true });

    const admin = createAdminClient();
    const esiti = { scritto: 0, giaRitirato: 0, nonTrovato: 0, errore: 0 };

    const indice = await indiceUtenti(admin);
    for (const { email } of eventi) {
      if (!indice) {
        esiti.errore++;
        continue;
      }
      const utente = indice.get(email) ?? null;
      if (utente === null) {
        esiti.nonTrovato++;
        continue;
      }
      const esito = await registraRitiro(utente);
      if (esito === "scritto") esiti.scritto++;
      else if (esito === "gia-ritirato") esiti.giaRitirato++;
      else esiti.errore++;
    }

    logger.warn(
      "brevo/webhook",
      `disiscrizioni: scritte=${esiti.scritto} già-ritirate=${esiti.giaRitirato} non-trovate=${esiti.nonTrovato} errori=${esiti.errore}`
    );
    // Un ritiro del consenso non registrato non va perso: 500 fa riprovare
    // Brevo, e la scrittura è idempotente (un ritiro già presente non si ripete).
    if (esiti.errore > 0) return NextResponse.json({ ok: false }, { status: 500 });
  } catch (e) {
    logger.warn("brevo/webhook", `elaborazione fallita: ${e instanceof Error ? e.name : "errore"}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
