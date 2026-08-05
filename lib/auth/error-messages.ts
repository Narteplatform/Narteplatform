/**
 * Traduce in italiano gli errori di Supabase Auth.
 *
 * Il sito è solo in italiano ma le risposte di Supabase arrivano in inglese, e
 * "Invalid login credentials" davanti a un modulo italiano sembra un errore
 * dell'applicazione più che una password sbagliata.
 *
 * ⚠️ Il confronto è per sottostringa sul messaggio, non su un codice: Supabase
 * non espone codici stabili per tutti questi casi. Se un giorno cambiano il
 * testo, la voce smette di corrispondere e si ricade sul messaggio originale —
 * che è il comportamento voluto: meglio una frase in inglese che una
 * traduzione sbagliata di un errore diverso.
 */
const MAP: { match: string; message: string }[] = [
  {
    match: "invalid login credentials",
    message: "Email o password non corretti.",
  },
  {
    match: "email not confirmed",
    message:
      "Devi confermare l'indirizzo email prima di accedere: controlla la posta, anche nello spam.",
  },
  {
    match: "user already registered",
    message: "Esiste già un account con questa email. Prova ad accedere.",
  },
  {
    match: "already been registered",
    message: "Esiste già un account con questa email. Prova ad accedere.",
  },
  {
    match: "password should be at least",
    message: "La password deve avere almeno 8 caratteri.",
  },
  {
    match: "unable to validate email address",
    message: "L'indirizzo email non sembra valido.",
  },
  {
    match: "for security purposes",
    message: "Troppi tentativi ravvicinati. Riprova fra qualche minuto.",
  },
  {
    match: "rate limit",
    message: "Troppi tentativi. Riprova fra qualche minuto.",
  },
  {
    match: "failed to fetch",
    message: "Connessione non riuscita. Controlla la rete e riprova.",
  },
];

export function authErrorMessage(raw: string): string {
  const needle = raw.toLowerCase();
  return MAP.find((e) => needle.includes(e.match))?.message ?? raw;
}
