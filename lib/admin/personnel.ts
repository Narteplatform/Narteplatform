import type { Json } from "@/lib/supabase/types";

/**
 * Modifica dei componenti della band (`artists.personnel`) da parte del Team.
 *
 * Ogni riga porta con sé la POSIZIONE da cui proviene nell'array salvato
 * (`origine`) e il nome che aveva (`origineNome`). Il server riparte sempre
 * dall'array letto in quel momento: una riga esistente diventa
 * `{ ...originale, name, role }`, così i campi aggiuntivi (`consenso_at`, che è
 * la prova del consenso del componente, e qualsiasi altro) non si perdono mai.
 * Una riga senza `origine` è nuova. Una riga dell'originale che nessuna riga
 * cita è stata rimossa.
 *
 * Se l'array è cambiato fra la lettura della pagina e il salvataggio (il nome
 * in quella posizione non coincide) NON si scrive nulla: meglio un errore che
 * rimuovere il componente sbagliato.
 */

export type PersonnelEditRow = {
  name: string;
  role: string;
  origine: number | null;
  origineNome: string | null;
};

export type PersonnelRowView = { name: string; role: string; origine: number };

function isObj(v: Json | undefined): v is { [k: string]: Json | undefined } {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Legge una riga dell'array salvato, anche nel vecchio formato «Nome — Ruolo». */
function leggiRiga(v: Json | undefined): { name: string; role: string } | null {
  if (isObj(v)) {
    return { name: String(v.name ?? ""), role: String(v.role ?? "") };
  }
  if (typeof v === "string") {
    const [name, ...rest] = v.split("—");
    return { name: (name ?? "").trim(), role: rest.join("—").trim() };
  }
  return null;
}

/** Le righe da mostrare nel modulo, ciascuna con la posizione originale. */
export function personaleDaJson(raw: Json | null | undefined): PersonnelRowView[] {
  if (!Array.isArray(raw)) return [];
  const out: PersonnelRowView[] = [];
  raw.forEach((item, i) => {
    const r = leggiRiga(item);
    if (r && r.name.trim() !== "") out.push({ name: r.name, role: r.role, origine: i });
  });
  return out;
}

export type EsitoPersonale =
  | { ok: true; value: Json[]; cambiato: boolean }
  | { ok: false; error: string };

export function applicaModificaPersonale(corrente: Json | null | undefined, righe: PersonnelEditRow[]): EsitoPersonale {
  if (corrente !== null && corrente !== undefined && !Array.isArray(corrente)) {
    return { ok: false, error: "Il formato dei componenti salvati non è riconosciuto: nessuna modifica fatta." };
  }
  const attuale: Json[] = (corrente ?? []) as Json[];
  const usati = new Set<number>();
  const value: Json[] = [];

  for (const r of righe) {
    const name = r.name.trim();
    const role = r.role.trim();
    if (r.origine === null) {
      value.push({ name, role });
      continue;
    }
    if (usati.has(r.origine)) {
      return { ok: false, error: "Richiesta non valida: componente indicato due volte." };
    }
    usati.add(r.origine);
    const originale = attuale[r.origine];
    const letto = leggiRiga(originale);
    if (!letto || letto.name !== r.origineNome) {
      return {
        ok: false,
        error: "I componenti sono cambiati nel frattempo: ricarica la pagina e riprova. Nessuna modifica fatta.",
      };
    }
    // Campi extra preservati; nome e ruolo aggiornati.
    value.push(isObj(originale) ? { ...originale, name, role } : { name, role });
  }

  const prima = JSON.stringify(
    attuale.map((x) => {
      const l = leggiRiga(x);
      return l ? [l.name.trim(), l.role.trim()] : null;
    }),
  );
  const dopo = JSON.stringify(value.map((x) => (isObj(x) ? [String(x.name ?? ""), String(x.role ?? "")] : null)));
  return { ok: true, value, cambiato: prima !== dopo };
}
