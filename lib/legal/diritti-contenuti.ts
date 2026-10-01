/**
 * Dichiarazione dei diritti sui contenuti: parti condivise fra server e client.
 *
 * Nessun import `server-only`: il codice d'errore e il testo della casella li
 * usano sia le Server Action sia i componenti della dashboard.
 */

/**
 * Codice restituito dal server quando l'artista prova ad AGGIUNGERE media senza
 * aver dichiarato di avere i diritti per la versione corrente. Il client lo
 * riconosce per uguaglianza esatta e apre la modale; non è un testo da mostrare.
 */
export const DIRITTI_NON_DICHIARATI = "DIRITTI_NON_DICHIARATI";

/** Testo H1 della casella: deve restare identico a quello registrato in sede legale. */
export const TESTO_DICHIARAZIONE_DIRITTI =
  "Pubblico solo contenuti di cui ho i diritti: brani miei o autorizzati, registrazioni di cui ho i diritti, foto e video di cui ho il permesso dell'autore e delle persone riconoscibili.";
