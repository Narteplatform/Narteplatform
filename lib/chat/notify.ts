import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { getSiteUrl } from "@/lib/site-url";
import { formatDateIt, formatEuro } from "@/lib/emails/format";
import type { Role } from "@/lib/supabase/types";

/**
 * Notifiche email della chat.
 *
 * Il paywall della chat si regge su questa notifica: un artista Free deve
 * sapere che qualcuno gli ha scritto, altrimenti non ha alcun motivo di
 * passare a Pro per rispondere. Il commento in `lib/chat/actions.ts` la dava
 * per esistente da mesi, ma non era mai stata scritta.
 *
 * Il contenuto del messaggio NON viene mai riportato: l'anteprima in chiaro
 * toglierebbe la ragione di aprire la chat, che è ciò che il piano vende.
 */

/** Finestra di silenzio fra due notifiche allo stesso destinatario. */
const THROTTLE_MINUTES = 30;

type Counterpart = {
  email: string;
  /** Dove mandarlo: l'area cambia a seconda del ruolo. */
  chatUrl: string;
  /** Nome del destinatario. */
  name: string;
  /** Nome di chi ha scritto, per l'oggetto delle notifiche di offerta. */
  senderName: string;
};

/**
 * Risolve chi va avvisato: se scrive l'artista tocca all'organizzatore e
 * viceversa. Ritorna `null` se manca l'email — non è un errore, semplicemente
 * non c'è nessuno da avvisare.
 */
async function resolveCounterpart(
  conversationId: string,
  senderRole: Role
): Promise<Counterpart | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("conversations")
    .select("id, artists!inner(user_id, stage_name), organizers!inner(user_id, display_name)")
    .eq("id", conversationId)
    .maybeSingle();

  // Errore o riga assente: si esce senza inventare un destinatario. Derivare
  // un invio da una lettura non verificata è esattamente il modo in cui si
  // manda un'email alla persona sbagliata.
  if (error || !data) {
    if (error) console.error("[chat/notify] conversazione non leggibile", error);
    return null;
  }

  const row = data as unknown as {
    artists: { user_id: string | null; stage_name: string } | null;
    organizers: { user_id: string; display_name: string } | null;
  };

  const toArtist = senderRole !== "artist";
  const userId = toArtist ? row.artists?.user_id : row.organizers?.user_id;
  const name = toArtist ? row.artists?.stage_name : row.organizers?.display_name;
  const senderName = toArtist ? row.organizers?.display_name : row.artists?.stage_name;
  if (!userId) return null;

  const { data: account, error: accountError } = await admin.auth.admin.getUserById(userId);
  if (accountError || !account?.user?.email) {
    if (accountError) console.error("[chat/notify] utente non leggibile", accountError);
    return null;
  }

  const base = getSiteUrl();
  return {
    email: account.user.email,
    name: name ?? "",
    senderName: senderName ?? "N'arte",
    chatUrl: toArtist ? `${base}/dashboard/chat` : `${base}/organizzatore/chat`,
  };
}

/**
 * Vero se allo stesso indirizzo è già partita una notifica di chat da poco.
 *
 * Senza, una conversazione vivace produrrebbe un'email per messaggio: la
 * casella diventa inutilizzabile e il destinatario smette di guardarla, che è
 * il contrario di ciò che serve. La finestra si legge da `email_log`, quindi
 * non serve nessuna colonna nuova.
 */
async function recentlyNotified(email: string, template: string): Promise<boolean> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - THROTTLE_MINUTES * 60_000).toISOString();

  const { data, error } = await admin
    .from("email_log")
    .select("id")
    .eq("template", template)
    .eq("status", "sent")
    .contains("to_addresses", [email])
    .gt("sent_at", since)
    .limit(1);

  // Se la lettura fallisce si preferisce mandare l'email: un doppione è un
  // fastidio, una notifica persa è un ingaggio perso.
  if (error) {
    console.error("[chat/notify] controllo throttle fallito", error);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Notifica di un nuovo messaggio, con throttle. */
export async function notifyNewChatMessage(conversationId: string, senderRole: Role): Promise<void> {
  const to = await resolveCounterpart(conversationId, senderRole);
  if (!to) return;
  if (await recentlyNotified(to.email, "chat_new_message")) return;

  await dispatchEmail({
    key: "chat_new_message",
    to: to.email,
    params: { chatUrl: to.chatUrl },
    subjectPreview: "Hai un nuovo messaggio su N'Arte",
  });
}

/**
 * Notifica di una nuova offerta economica. Nessun throttle: un'offerta è un
 * evento raro e decisivo, saltarla per una finestra di silenzio sarebbe
 * peggio del doppione che il throttle evita.
 */
export async function notifyNewChatOffer(
  conversationId: string,
  senderRole: Role,
  offer: { amount: number | null; eventDate: string | null }
): Promise<void> {
  const to = await resolveCounterpart(conversationId, senderRole);
  if (!to) return;

  await dispatchEmail({
    key: "chat_new_offer",
    to: to.email,
    params: {
      fromName: to.senderName,
      eventDate: offer.eventDate ? formatDateIt(offer.eventDate) : "",
      priceLabel: formatEuro(offer.amount),
      chatUrl: to.chatUrl,
    },
    subjectPreview: `Nuova offerta da ${to.senderName}`,
  });
}
