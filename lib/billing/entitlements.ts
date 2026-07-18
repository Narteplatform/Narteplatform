import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveActiveArtist } from "@/lib/artist/current";
import type { ArtistTier } from "@/lib/supabase/types";
import {
  ENTITLEMENTS,
  entitlementsFor,
  isUnlimited,
  type Entitlements,
} from "@/lib/billing/plans";

/**
 * Lettura degli entitlement e enforcement dei limiti di piano, lato server.
 *
 * I numeri NON vivono qui: stanno in lib/billing/plans.ts. Questo modulo li
 * applica e basta.
 *
 * Perché l'enforcement sta nelle Server Action e non in RLS: ogni scrittura su
 * `artists` passa già da service role (che bypassa RLS per definizione), quindi
 * il confine reale è la Server Action, non la policy. Duplicare la matrice in
 * SQL creerebbe due fonti di verità destinate a divergere al primo cambio di
 * listino. Le due eccezioni — tetto video e quota candidature — sono
 * documentate in plans.ts e hanno un trigger dedicato.
 */

type ArtistTierRow = { tier: ArtistTier | null };

export async function getArtistTier(artistId: string): Promise<ArtistTier> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("artists")
    .select("tier")
    .eq("id", artistId)
    .maybeSingle();
  return (data as ArtistTierRow | null)?.tier ?? "free";
}

export async function getEntitlements(artistId: string): Promise<Entitlements> {
  return entitlementsFor(await getArtistTier(artistId));
}

/**
 * Entitlement dell'ACCOUNT, non di un singolo profilo.
 *
 * L'abbonamento appartiene all'account (0042): serve per le decisioni che non
 * riguardano un artista specifico — in primis quanti profili si possono creare.
 *
 * Da 0044 gli omaggi del superadmin (`artists.tier_override`) contano quanto un
 * abbonamento pagato: `account_tier()` prende il maggiore fra i due. Prima li
 * ignorava, e il risultato era un artista con badge MAX, scritta "N'arte Free"
 * nell'abbonamento e un solo slot profilo — un piano che non sbloccava nulla.
 *
 * Ne segue che `getEntitlements(artistId)` e questa funzione ora coincidono per
 * i profili collegati a un account: il tier è dell'account, non della scheda.
 */
export async function getAccountEntitlements(userId: string): Promise<Entitlements> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("account_tier", { p_user_id: userId });
  if (error) return entitlementsFor("free");
  return entitlementsFor((data as ArtistTier | null) ?? "free");
}

/**
 * Entitlement del profilo ATTIVO dell'utente. `null` se l'account non ha
 * profili artista.
 *
 * Un account può avere più profili: `.maybeSingle()` qui non sceglierebbe, andrebbe
 * in errore (PGRST116). La scelta di quale profilo sia quello attivo spetta a
 * lib/artist/current.ts, che valida il cookie contro la proprietà.
 */
export async function getEntitlementsForUser(
  userId: string
): Promise<{ artistId: string; entitlements: Entitlements } | null> {
  const active = await resolveActiveArtist(userId);
  if (!active) return null;
  return { artistId: active.id, entitlements: entitlementsFor(active.tier ?? "free") };
}

export type LimitCheck = { ok: true } | { ok: false; error: string };

type CollectionKind = "gallery" | "audio" | "video";

const COLLECTION_LABELS: Record<CollectionKind, { singular: string; plural: string }> = {
  gallery: { singular: "foto", plural: "foto" },
  audio: { singular: "traccia audio", plural: "tracce audio" },
  video: { singular: "video", plural: "video" },
};

function limitOf(ent: Entitlements, kind: CollectionKind): number {
  if (kind === "gallery") return ent.galleryMax;
  if (kind === "audio") return ent.audioMax;
  return ent.videoMax;
}

/**
 * Enforcement sul DELTA, non sull'assoluto.
 *
 * La regola è: sforare il limite è vietato solo se stai AUMENTANDO. Un artista
 * Pro con 20 foto che torna a Free deve poter continuare a salvare il profilo e
 * a rimuovere foto — bloccarlo perché è sopra soglia lo intrappolerebbe in uno
 * stato da cui non può uscire senza assistenza.
 *
 * Il contenuto in eccesso non viene mai cancellato: sparisce dal profilo
 * pubblico (soft cap in lettura) e resta visibile nell'editor, marcato. È anche
 * la scelta commercialmente giusta — l'artista vede cosa ha perso ogni volta
 * che apre l'editor — ed evita una cancellazione irreversibile su downgrade.
 */
export function checkCollectionLimit(
  ent: Entitlements,
  kind: CollectionKind,
  currentCount: number,
  nextCount: number
): LimitCheck {
  const limit = limitOf(ent, kind);
  if (isUnlimited(limit)) return { ok: true };
  if (nextCount <= limit) return { ok: true };
  if (nextCount <= currentCount) return { ok: true }; // sta riducendo o restando fermo

  const labels = COLLECTION_LABELS[kind];
  if (limit === 0) {
    return {
      ok: false,
      error: `I ${labels.plural} sono inclusi nei piani Pro e Max. Passa a Pro per caricarli.`,
    };
  }
  return {
    ok: false,
    error: `Il piano ${ent.tier.toUpperCase()} include ${limit} ${
      limit === 1 ? labels.singular : labels.plural
    }. Passa a Pro per averne un numero illimitato.`,
  };
}

/**
 * Inizio del mese solare in fuso Europe/Rome, come stringa ISO.
 *
 * Deve restare identico a `public.current_month_start_rome()` in SQL: se i due
 * divergono, a cavallo della mezzanotte del 1° il pre-check della Server Action
 * e il trigger conterebbero mesi diversi, e l'utente vedrebbe un errore che
 * contraddice il contatore mostrato a schermo.
 */
export function currentMonthStartRome(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}-01T00:00:00`;
}

/**
 * Tipi di quota a rinnovo mensile.
 *
 * Al momento esiste solo la consulenza. Esisteva anche `"event_application"`,
 * ma la funzionalità "candidature agli eventi" non è mai stata realizzata:
 * niente tabella, niente migrazione, nessuna UI e nessun chiamante. Il ramo
 * relativo interrogava una tabella inesistente ed è stato rimosso.
 */
export type MonthlyQuotaKind = "consultation";

/**
 * Chi consuma la quota.
 *
 * Le `consultations` sono legate a `user_id`, non a `artist_id`: la tabella
 * non ha quella colonna (vedi 0015_consulenza.sql), perché prenota anche chi
 * artista non è. `artistId` resta nel tipo perché i chiamanti lo hanno già a
 * disposizione e servirà alle quote future legate all'artista.
 */
export type QuotaSubject = { artistId: string; userId: string };

/** Consumo del mese corrente per le quote a rinnovo mensile. */
export async function getMonthlyUsage(
  subject: QuotaSubject,
  kind: MonthlyQuotaKind
): Promise<number> {
  const admin = createAdminClient();
  const since = currentMonthStartRome();

  if (kind === "consultation") {
    // Le consulenze annullate non consumano quota: annullare libera davvero
    // lo slot per un altro artista.
    const { count } = await admin
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", subject.userId)
      .neq("status", "cancelled")
      .gte("created_at", since);
    return count ?? 0;
  }

  // Nessun'altra quota mensile è definita: irraggiungibile con l'unico
  // valore ammesso da `MonthlyQuotaKind`, resta come rete per quando se ne
  // aggiungerà una seconda.
  return 0;
}

export async function checkMonthlyQuota(
  subject: QuotaSubject,
  ent: Entitlements,
  kind: MonthlyQuotaKind
): Promise<LimitCheck> {
  const limit = ent.consultationsPerMonth;

  if (isUnlimited(limit)) return { ok: true };

  if (limit === 0) {
    return {
      ok: false,
      error: "La consulenza professionale è inclusa nei piani Pro e Max.",
    };
  }

  const used = await getMonthlyUsage(subject, kind);
  if (used < limit) return { ok: true };

  return {
    ok: false,
    error: `Il piano ${ent.tier.toUpperCase()} include ${limit} consulenza al mese e l'hai già usata. La quota si rinnova il 1° del mese; con Max è illimitata.`,
  };
}

/**
 * Regola di visibilità del badge, in un posto solo.
 *
 * Il piano Max dà diritto a RICHIEDERE la verifica, non a ottenerla: un badge
 * "Verificato" che si compra non verifica nulla, e verso gli organizzatori
 * sarebbe una dichiarazione fuorviante. La concessione resta del superadmin.
 * Se il cliente decidesse per l'auto-assegnazione, questa è l'unica riga da
 * cambiare: `return ent.verifiedBadgeEligible`.
 */
export function canShowVerifiedBadge(tier: ArtistTier, isVerified: boolean): boolean {
  return ENTITLEMENTS[tier]?.verifiedBadgeEligible === true && isVerified;
}
