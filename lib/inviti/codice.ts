import "server-only";
import { randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { slugify } from "@/lib/utils";
import { verificaProprietarioNonSospeso } from "@/lib/admin/sospensione";
import { normalizzaCodice } from "@/lib/inviti/regole";

const AREA = "inviti";

/** Tabella assente: migration 0078 non applicata. */
export function tabellaInvitiAssente(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

/** Niente caratteri che si confondono a voce o a occhio (0/o, 1/l/i). */
const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789";

function suffisso(n = 4): string {
  let s = "";
  for (let i = 0; i < n; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}

/** `marco-rossi-7k3p`: riconoscibile da chi lo riceve, non indovinabile. */
export function generaCodice(nomeDArte: string): string {
  const base = slugify(nomeDArte).slice(0, 30).replace(/-+$/g, "") || "artista";
  return `${base}-${suffisso()}`;
}

export type EsitoCodice =
  | { ok: true; code: string }
  | { ok: false; error: string; migrazioneMancante?: boolean };

/**
 * Codice dell'account, creato al primo accesso alla pagina «Invita un artista».
 * Nome base: il primo profilo approvato dell'account (il più vecchio).
 */
export async function ottieniOCreaCodice(userId: string): Promise<EsitoCodice> {
  const admin = createAdminClient();

  const { data: esistente, error: errLettura } = await admin
    .from("invite_codes")
    .select("code, disabled_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (errLettura) {
    if (tabellaInvitiAssente(errLettura)) {
      return { ok: false, error: "Funzione non ancora disponibile.", migrazioneMancante: true };
    }
    logger.error(AREA, "lettura codice:", errLettura.message);
    return { ok: false, error: "Non riusciamo a leggere il tuo link. Riprova fra poco." };
  }
  if (esistente) {
    if (esistente.disabled_at) return { ok: false, error: "Il tuo link d'invito è stato disattivato. Scrivici se pensi sia un errore." };
    return { ok: true, code: esistente.code };
  }

  const { data: profili, error: errProfili } = await admin
    .from("artists")
    .select("stage_name")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(1);
  if (errProfili) {
    logger.error(AREA, "lettura profilo per il codice:", errProfili.message);
    return { ok: false, error: "Non riusciamo a creare il tuo link. Riprova fra poco." };
  }
  const nome = (profili ?? [])[0]?.stage_name;
  if (!nome) return { ok: false, error: "Il link d'invito si attiva quando il tuo profilo è approvato." };

  for (let tentativo = 0; tentativo < 5; tentativo++) {
    const code = generaCodice(nome);
    const { error } = await admin.from("invite_codes").insert({ user_id: userId, code });
    if (!error) return { ok: true, code };
    if (error.code !== "23505") {
      logger.error(AREA, "creazione codice:", error.message);
      return { ok: false, error: "Non riusciamo a creare il tuo link. Riprova fra poco." };
    }
    // 23505: o il codice esiste già (si ritenta con un altro suffisso), o una
    // richiesta parallela ha già creato il codice di questo account.
    const { data: creato, error: errRilettura } = await admin
      .from("invite_codes")
      .select("code")
      .eq("user_id", userId)
      .maybeSingle();
    if (errRilettura) {
      logger.error(AREA, "rilettura codice:", errRilettura.message);
      return { ok: false, error: "Non riusciamo a creare il tuo link. Riprova fra poco." };
    }
    if (creato) return { ok: true, code: creato.code };
  }
  return { ok: false, error: "Non riusciamo a creare il tuo link. Riprova fra poco." };
}

/**
 * Solo il nome d'arte: chi non è registrato non riceve foto, città né altri
 * dati degli artisti (informativa, «Chi non è registrato»). Il nome lo mostra
 * l'artista stesso condividendo il proprio link, che già lo contiene.
 */
export type ArtistaCheInvita = {
  userId: string;
  code: string;
  stageName: string;
};

/**
 * Chi c'è dietro un codice. Null se il codice non esiste, è disattivato, o
 * l'account non ha un profilo pubblico o è sospeso: in tutti questi casi il
 * link porta alla candidatura normale, senza invito.
 */
export async function risolviCodice(raw: unknown): Promise<ArtistaCheInvita | null> {
  const code = normalizzaCodice(raw);
  if (!code) return null;
  try {
    const admin = createAdminClient();
    const { data: riga, error } = await admin
      .from("invite_codes")
      .select("user_id, code, disabled_at")
      .eq("code", code)
      .maybeSingle();
    if (error) {
      if (!tabellaInvitiAssente(error)) logger.error(AREA, "risoluzione codice:", error.message);
      return null;
    }
    if (!riga || riga.disabled_at) return null;

    const { data: profili, error: errProfili } = await admin
      .from("artists")
      .select("stage_name")
      .eq("user_id", riga.user_id)
      .eq("is_public", true)
      .order("created_at", { ascending: true })
      .limit(1);
    if (errProfili) {
      logger.error(AREA, "profilo di chi invita:", errProfili.message);
      return null;
    }
    const p = (profili ?? [])[0];
    if (!p) return null;

    const stato = await verificaProprietarioNonSospeso(riga.user_id);
    if (!stato.ok) return null;

    return { userId: riga.user_id, code: riga.code, stageName: p.stage_name };
  } catch (e) {
    logger.error(AREA, "risolviCodice:", e instanceof Error ? e.message : String(e));
    return null;
  }
}
