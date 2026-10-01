// Quali migration sono state applicate davvero?
//
// Esegui con:  npm run db:check-migrations
//
// ────────────────────────────────────────────────────────────────────────────
// ⛔ SOLA LETTURA. Non scrive nulla, da nessuna parte: nessun INSERT, nessun
// UPDATE, nessuna chiamata alle funzioni (chiamare `record_consent` per
// "vedere se esiste" scriverebbe un consenso falso). L'esistenza delle funzioni
// si deduce dallo schema OpenAPI che PostgREST pubblica, che è un GET.
// ────────────────────────────────────────────────────────────────────────────
//
// COME FA A SAPERLO. Non esiste una tabella con l'elenco delle migration
// applicate — vengono incollate a mano nel SQL editor, quindi non lasciano
// traccia. L'unico modo è cercare gli OGGETTI che ciascuna crea: una tabella,
// una colonna, una funzione, un bucket privato. Se l'oggetto c'è, quella
// migration è passata.
//
// COSA NON PUÒ VEDERE. Indici univoci, vincoli validati e appartenenza alle
// pubblicazioni realtime non sono esposti da PostgREST: le migration che fanno
// solo quello (0050_validate, 0053, 0054) restano non verificabili da qui e
// sono elencate a parte.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !service) {
  const mancanti = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !anon && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !service && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);
  console.error(`❌ Variabili mancanti in .env.local: ${mancanti.join(", ")}`);
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anonClient = createClient(url, anon, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(`🔎 Progetto: ${url}\n`);

// ─────────────────────────────────────────── lo schema pubblicato da PostgREST
// Un solo GET restituisce tabelle, colonne e funzioni esposte. Molto più
// economico di una sonda per oggetto, e non tocca alcun dato.
let rpcDisponibili = null;
try {
  const r = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: service, Authorization: `Bearer ${service}` },
  });
  if (r.ok) {
    const spec = await r.json();
    rpcDisponibili = new Set(
      Object.keys(spec.paths ?? {})
        .filter((p) => p.startsWith("/rpc/"))
        .map((p) => p.slice(5))
    );
  }
} catch {
  // Si prosegue: le funzioni risulteranno "non verificabile".
}

// NOTA SU `limit(0)` E NON `head: true`.
// Con `head: true` PostgREST risponde senza corpo, e supabase-js non ha da
// nessuna parte il codice dell'errore: arriva un oggetto con messaggio vuoto e
// ogni sonda risulta "dubbia". `limit(0)` invece legge ZERO righe — quindi
// nessun dato viene letto, che è il punto — ma il corpo c'è, e con lui il
// codice: 42703 per una colonna assente, PGRST205 per una tabella assente.

/** La tabella esiste ed è raggiungibile? */
async function tabella(nome) {
  const { error } = await admin.from(nome).select("*").limit(0);
  if (!error) return { esito: "si" };
  // 42P01 = relazione inesistente. PGRST205 = non presente nella cache dello schema.
  if (error.code === "42P01" || error.code === "PGRST205") return { esito: "no" };
  return { esito: "dubbio", nota: `${error.code}: ${error.message}` };
}

/** La colonna esiste? */
async function colonna(nomeTabella, nomeColonna) {
  const { error } = await admin.from(nomeTabella).select(nomeColonna).limit(0);
  if (!error) return { esito: "si" };
  if (error.code === "42703" || error.code === "PGRST204") return { esito: "no" };
  if (error.code === "42P01" || error.code === "PGRST205")
    return { esito: "no", nota: "manca la tabella stessa" };
  return { esito: "dubbio", nota: `${error.code}: ${error.message}` };
}

/** La funzione è esposta? Dedotto dallo schema: NON viene chiamata. */
function funzione(nome) {
  if (!rpcDisponibili) return { esito: "dubbio", nota: "schema non leggibile" };
  return { esito: rpcDisponibili.has(nome) ? "si" : "no" };
}

/** Il bucket esiste e con quale visibilità? */
async function bucketPrivato(nome) {
  const { data, error } = await admin.storage.getBucket(nome);
  if (error) return { esito: "dubbio", nota: error.message };
  return data.public
    ? { esito: "no", nota: "il bucket è ancora PUBBLICO" }
    : { esito: "si" };
}

/** La lettura anonima è chiusa? Una SELECT con la chiave pubblica, senza dati. */
async function letturaAnonimaChiusa(nome) {
  const { error, count } = await anonClient
    .from(nome)
    .select("*", { count: "exact" })
    .limit(0);
  if (error) {
    // 42501 = privilegi insufficienti: è il risultato desiderato.
    if (error.code === "42501" || error.code === "PGRST205") return { esito: "si" };
    return { esito: "dubbio", nota: error.message };
  }
  // Nessun errore: la RLS può comunque filtrare tutte le righe. `count` a 0 è
  // il segnale che le policy fanno il loro lavoro pur essendoci il privilegio.
  return count && count > 0
    ? { esito: "no", nota: `${count} righe leggibili senza login` }
    : { esito: "si", nota: "privilegio presente ma nessuna riga esposta" };
}

/**
 * Il privilegio di tabella è stato REVOCATO a `anon`?
 *
 * Più severa di `letturaAnonimaChiusa`: qui si pretende un errore di privilegi
 * (42501). Una risposta vuota non basta, perché significa che il privilegio c'è
 * ancora e a fermare la lettura è solo la RLS — un solo strato invece di due, e
 * quello che salta se qualcuno aggiunge per sbaglio una policy permissiva.
 */
async function privilegioAnonRevocato(nome) {
  const { error } = await anonClient.from(nome).select("*").limit(0);
  if (!error) {
    return {
      esito: "no",
      nota: "anon può ancora interrogare la tabella: manca il revoke",
    };
  }
  if (error.code === "42501") return { esito: "si" };
  if (error.code === "PGRST205" || error.code === "42P01")
    return { esito: "no", nota: "manca la tabella stessa" };
  return { esito: "dubbio", nota: `${error.code}: ${error.message}` };
}

const MIGRATION = [
  {
    file: "0048_rate_limits.sql",
    cosa: "Limitatore di frequenza",
    controlli: [
      ["tabella rate_limits", () => tabella("rate_limits")],
      ["funzione rate_limit_hit", () => funzione("rate_limit_hit")],
      ["funzione rate_limits_prune", () => funzione("rate_limits_prune")],
    ],
  },
  {
    file: "0049_user_consents.sql",
    cosa: "Registro dei consensi",
    controlli: [
      ["tabella user_consents", () => tabella("user_consents")],
      [
        "revoke dei privilegi a anon (blocco aggiunto dopo)",
        () => privilegioAnonRevocato("user_consents"),
      ],
    ],
  },
  {
    file: "0050_bunny_video.sql",
    cosa: "Colonne Bunny Stream",
    controlli: [
      ["artist_videos.bunny_guid", () => colonna("artist_videos", "bunny_guid")],
      ["artist_videos.playback_state", () => colonna("artist_videos", "playback_state")],
      ["artist_videos.provider", () => colonna("artist_videos", "provider")],
      ["tabella media_assets", () => tabella("media_assets")],
    ],
  },
  {
    file: "0051_media_moderation.sql",
    cosa: "Coda di approvazione dei media",
    controlli: [
      [
        "tabella artist_media_submissions",
        () => tabella("artist_media_submissions"),
      ],
    ],
  },
  {
    file: "0052_media_moderation_rpc.sql",
    cosa: "Funzioni di approvazione",
    controlli: [
      [
        "funzione approve_artist_media_submission",
        () => funzione("approve_artist_media_submission"),
      ],
      [
        "funzione reject_artist_media_submission",
        () => funzione("reject_artist_media_submission"),
      ],
    ],
  },
  {
    file: "0055_conversation_blocks.sql",
    cosa: "Blocco delle conversazioni",
    controlli: [
      ["tabella conversation_blocks", () => tabella("conversation_blocks")],
    ],
  },
  {
    file: "0058_private_buckets_and_organizers.sql",
    cosa: "Bucket privati e recapiti chiusi",
    controlli: [
      ["bucket chat-attachments privato", () => bucketPrivato("chat-attachments")],
      ["bucket application-videos privato", () => bucketPrivato("application-videos")],
      ["organizers non leggibile da anonimi", () => letturaAnonimaChiusa("organizers")],
      ["venues non leggibile da anonimi", () => letturaAnonimaChiusa("venues")],
    ],
  },
  {
    file: "0059_consents_write.sql",
    cosa: "Scrittura consensi e gate di accettazione",
    controlli: [
      ["funzione record_consent", () => funzione("record_consent")],
      ["funzione accept_legal_documents", () => funzione("accept_legal_documents")],
      [
        "profiles.legal_version_accepted",
        () => colonna("profiles", "legal_version_accepted"),
      ],
      [
        "contact_messages.consent_version",
        () => colonna("contact_messages", "consent_version"),
      ],
      ["leads.consent_version", () => colonna("leads", "consent_version")],
      [
        "artist_applications.consent_version",
        () => colonna("artist_applications", "consent_version"),
      ],
      [
        "consultations.consent_version",
        () => colonna("consultations", "consent_version"),
      ],
    ],
  },
  {
    file: "0060_account_deletion.sql",
    cosa: "Richieste di cancellazione account",
    controlli: [
      [
        "tabella account_deletion_requests",
        () => tabella("account_deletion_requests"),
      ],
      [
        "colonna token_hash",
        () => colonna("account_deletion_requests", "token_hash"),
      ],
      [
        "colonna restore_state",
        () => colonna("account_deletion_requests", "restore_state"),
      ],
      [
        "revoke dei privilegi a anon",
        () => privilegioAnonRevocato("account_deletion_requests"),
      ],
    ],
  },
  {
    file: "0062_consent_kinds.sql",
    cosa: "Nuovi tipi di consenso (organizzatori, abbonamento, recesso…)",
    controlli: [
      ["colonna user_consents.ref", () => colonna("user_consents", "ref")],
    ],
  },
  {
    file: "0063_content_reports.sql",
    cosa: "Segnalazioni di contenuti e reclami (DSA)",
    controlli: [
      ["tabella content_reports", () => tabella("content_reports")],
      ["colonna reference", () => colonna("content_reports", "reference")],
      [
        "revoke dei privilegi a anon",
        () => privilegioAnonRevocato("content_reports"),
      ],
    ],
  },
  {
    file: "0064_chat_access_log.sql",
    cosa: "Registro degli accessi del Team alle chat",
    controlli: [
      ["tabella chat_access_log", () => tabella("chat_access_log")],
      ["colonna reason_text", () => colonna("chat_access_log", "reason_text")],
      [
        "revoke dei privilegi a anon",
        () => privilegioAnonRevocato("chat_access_log"),
      ],
    ],
  },
  {
    file: "0065_moderation_log.sql",
    cosa: "Registro delle decisioni di moderazione",
    controlli: [
      ["tabella moderation_actions", () => tabella("moderation_actions")],
      ["colonna notified_at", () => colonna("moderation_actions", "notified_at")],
      [
        "revoke dei privilegi a anon",
        () => privilegioAnonRevocato("moderation_actions"),
      ],
    ],
  },
  {
    file: "0066_feedback_moderation.sql",
    cosa: "Recensioni: moderazione motivata, risposta dell'artista",
    controlli: [
      ["colonna feedback.deleted_at", () => colonna("feedback", "deleted_at")],
      ["colonna feedback.artist_reply", () => colonna("feedback", "artist_reply")],
      ["colonna feedback.declared_at", () => colonna("feedback", "declared_at")],
    ],
  },
  {
    file: "0067_account_deletion_safety.sql",
    cosa: "Cancellazione account senza danni alla controparte; date private",
    controlli: [
      ["colonna user_consents.subject_hash", () => colonna("user_consents", "subject_hash")],
      [
        "vista booking_requests_public chiusa ad anon",
        () => privilegioAnonRevocato("booking_requests_public"),
      ],
    ],
  },
  {
    file: "0068_profile_referrals.sql",
    cosa: "Segnalazioni del profilo alle strutture (piano Max) e opt-out",
    controlli: [
      ["tabella profile_referrals", () => tabella("profile_referrals")],
      ["tabella referral_optouts", () => tabella("referral_optouts")],
      ["profile_referrals: anon senza privilegi", () => privilegioAnonRevocato("profile_referrals")],
      ["referral_optouts: anon senza privilegi", () => privilegioAnonRevocato("referral_optouts")],
    ],
  },
  {
    file: "0070_allineamento_finale.sql",
    cosa: "Doppia conferma, prova accettazioni, allegati segnalazioni, recessi, privacy visitatori",
    controlli: [
      ["colonna user_consents.ip_hash", () => colonna("user_consents", "ip_hash")],
      ["colonna content_reports.attachments", () => colonna("content_reports", "attachments")],
      ["colonna venues.hidden_at", () => colonna("venues", "hidden_at")],
      ["tabella subscription_withdrawals", () => tabella("subscription_withdrawals")],
      ["subscription_withdrawals: anon senza privilegi", () => privilegioAnonRevocato("subscription_withdrawals")],
      ["bucket report-attachments privato", () => bucketPrivato("report-attachments")],
      ["artist_videos: anon senza privilegi", () => privilegioAnonRevocato("artist_videos")],
      ["consultants: anon senza privilegi", () => privilegioAnonRevocato("consultants")],
    ],
  },
];

const SIMBOLO = { si: "✅", no: "❌", dubbio: "❔" };
const riepilogo = [];

for (const m of MIGRATION) {
  const esiti = [];
  for (const [etichetta, sonda] of m.controlli) {
    const r = await sonda();
    esiti.push({ etichetta, ...r });
  }

  const tutti = esiti.every((e) => e.esito === "si");
  const nessuno = esiti.every((e) => e.esito === "no");
  const stato = tutti ? "applicata" : nessuno ? "NON applicata" : "parziale";

  const intestazione = tutti ? "✅" : nessuno ? "❌" : "⚠️ ";
  console.log(`${intestazione} ${m.file} — ${m.cosa}: ${stato}`);
  for (const e of esiti) {
    const nota = e.nota ? `  (${e.nota})` : "";
    console.log(`     ${SIMBOLO[e.esito]} ${e.etichetta}${nota}`);
  }
  console.log("");

  riepilogo.push({ file: m.file, stato });
}

console.log("─".repeat(66));
console.log("Da applicare dal SQL editor Supabase, in quest'ordine:\n");

const daFare = riepilogo.filter((r) => r.stato !== "applicata");
if (daFare.length === 0) {
  console.log("  Nessuna. Tutto quello che si può verificare da qui è a posto.");
} else {
  for (const r of daFare) console.log(`  • ${r.file}  (${r.stato})`);
}

console.log(`
─${"─".repeat(65)}
NON verificabili da qui, perché PostgREST non espone indici, vincoli e
pubblicazioni realtime. Vanno controllate a mano nel SQL editor:

  • 0050_bunny_video_validate.sql   validazione dei vincoli della 0050
  • 0053_calendar_slots_unique.sql  indice univoco sugli slot
  • 0054_calendar_realtime.sql      pubblicazione realtime del calendario
  • 0056 / 0057                     privilegi e policy di Storage
  • 0061_booking_integrity.sql      trigger sulle transizioni del booking e
                                    nuova accept_offer_v2 (stesso nome della 0013)
  • 0062 / 0064 / 0066 / 0067       vincoli, policy e chiavi esterne ricreate
  • 0069_booking_accettata.sql      nuovo valore dell'enum (verificato dalla 0070)
  • 0070 (artists per anon)         privilegi di COLONNA: query in VERIFICA_MIGRATION

Le query per queste sono in docs/VERIFICA_MIGRATION.sql.
`);
