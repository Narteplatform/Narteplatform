# Checklist di verifica — allineamento legale (30/09/2026)

Prove manuali dei flussi introdotti con il fascicolo legale v0.95–0.96.
Il codice è stato verificato solo staticamente (typecheck, lint, build): queste
prove vanno fatte **a mano, con account di prova**, prima di considerare i
flussi chiusi.

**Come fare le prove senza toccare dati reali**
- Usa due account creati apposta: un artista di prova e un organizzatore di
  prova, con email tipo `tuonome+artista@…` e `tuonome+org@…`.
- Per l'abbonamento usa l'ambiente locale (`npm run dev`) con le chiavi **test**
  di Stripe e `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
- Finite le prove, cancella gli account di prova da `/account/i-miei-dati` e
  completa la cancellazione da `/admin/impostazioni/cancellazioni`.

Segna ✅ o ❌ e annota cosa non torna.

## 1. Registrazione e accettazioni
- [ ] Registrazione come utente: le caselle dicono «accetto i termini d'uso» e «ho preso visione dell'informativa»; c'è la dichiarazione dei 18 anni; il marketing è facoltativo e non spuntato.
- [ ] Dopo la registrazione, in `/account/i-miei-dati` compaiono i consensi con la versione.
- [ ] Nel pannello iubenda (Consent Database) compare la prova con modulo «Registrazione».
- [ ] Un utente che non ha accettato i nuovi termini può comunque aprire `/account/i-miei-dati` e `/account/cancellazione`.

## 2. Richiesta di booking
- [ ] Da non loggato, sul profilo di un artista il calendario invita ad accedere o registrarsi e **non** mostra campi email/password.
- [ ] Da utente semplice, la prima richiesta mostra la casella D1 (condizioni per gli organizzatori, SIAE, agibilità…); senza spunta non parte.
- [ ] Dopo l'invio l'utente è organizzatore; in iubenda c'è la prova «Prima richiesta di booking».

## 3. Trattativa e date
- [ ] L'artista accetta la richiesta: si apre la chat.
- [ ] L'artista **Free** vede il blocco della chat; Pro/Max scrivono.
- [ ] Un'Offerta accettata chiede la conferma «L'accordo è solo fra voi…» e poi **conferma la richiesta esistente** (non ne crea una seconda): in «Richieste» dell'organizzatore c'è una sola riga confermata.
- [ ] «Conferma data» dell'organizzatore mostra lo stesso avviso.
- [ ] Una data già confermata **non** si può annullare dall'organizzatore né rifiutare dall'artista.
- [ ] Il riquadro «Compenso concordato – promemoria»: proposta, conferma dell'altra parte, e dopo la conferma il pulsante «Ritira» non c'è più.

## 4. Recensioni
- [ ] Dopo la data (passata) l'organizzatore scrive una recensione: la casella I1 è obbligatoria.
- [ ] L'artista Free la legge in dashboard; sul profilo pubblico compare solo se l'artista è Pro/Max.
- [ ] L'artista risponde: la risposta appare sotto la recensione.
- [ ] Da `/admin/recensioni` nascondi la recensione con una motivazione: autore e artista ricevono l'email «Una decisione che ti riguarda» con il link di reclamo.
- [ ] Il catalogo `/artisti` non mostra voti per gli artisti Free.

## 5. Segnalazioni e reclami (DSA)
- [ ] Da un profilo, «Segnala questo profilo» apre `/segnalazioni` precompilato.
- [ ] Invio: arriva la ricevuta con riferimento `S-…`; il team riceve l'avviso.
- [ ] Da `/admin/segnalazioni`: presa in carico, decisione motivata; il segnalante riceve l'esito.
- [ ] Il link «Contesta» dell'email apre il modulo di reclamo (`R-…`).

## 6. Moderazione motivata
- [ ] Rifiuto di una candidatura: motivazione obbligatoria, il candidato riceve l'email.
- [ ] Rifiuto di una foto/video in `/admin/moderazione`: nota obbligatoria, email all'artista; il file rifiutato su Bunny viene rimosso (controlla nel pannello Bunny).
- [ ] Profilo nascosto dal team: motivazione obbligatoria ed email.

## 7. Chat e accesso del team
- [ ] `/admin/chat` mostra solo metadati, nessun testo.
- [ ] Aprire una conversazione richiede categoria e motivazione; si apre per 2 ore con il banner.
- [ ] `/admin/chat/registro` (solo root) elenca l'accesso.

## 8. Sospensione dell'account
- [ ] Da `/admin/utenti` sospendi l'account di prova con motivazione: arriva l'email; l'utente, se era loggato, viene disconnesso e al login vede «Il tuo account è sospeso…».
- [ ] Il profilo artista sparisce dal catalogo.
- [ ] «Riattiva»: accesso e profilo tornano come prima.

## 9. Abbonamento (in locale, Stripe test)
- [ ] Scegliendo un piano compare il riepilogo con «senza IVA, regime forfettario», la scelta privato/P.IVA e le caselle G1 + G2 (privato) o G3 (P.IVA); il pulsante dice «Abbonati con obbligo di pagamento».
- [ ] Il checkout Stripe chiede nome e indirizzo (e P.IVA se professionista).
- [ ] Dopo il pagamento arriva l'email di conferma con condizioni, rinnovo e diritto di recesso.
- [ ] Da privato, entro 14 giorni compare «Recedi dal contratto qui»: il recesso cessa l'abbonamento, rimborsa la quota non fruita e invia la conferma.
- [ ] Pagamento fallito (carta di test `4000 0000 0000 0341`): arriva l'email.
- [ ] `/admin/abbonamenti` mostra gli incassi e scarica il CSV.

## 10. Piano Max: segnalazione del profilo
- [ ] Da `/admin/proposte` segnala l'artista di prova a un indirizzo tuo: arriva l'email con «N'arte non partecipa alla trattativa».
- [ ] Il link «Disattivatele qui» chiede conferma e poi blocca nuove segnalazioni a quell'indirizzo.
- [ ] Nella dashboard dell'artista Max compare «Segnalazioni del tuo profilo».

## 11. Profili, consulenze, dati
- [ ] «Chiudi questo profilo» (solo con più profili): il profilo esce dal catalogo.
- [ ] Nell'editor, aggiungendo un componente della band serve la casella del consenso.
- [ ] Consulenza: «Le tue consulenze» elenca l'appuntamento; «Disdici» funziona oltre 24 ore prima.
- [ ] `/account/i-miei-dati` → scarica i dati: il file contiene messaggi, richieste, strutture, consulenze.
- [ ] Cancellazione account: il link dell'email apre una pagina con il pulsante (aprirlo non cancella nulla); dopo il pulsante l'account è disattivato e l'abbonamento non si rinnova.

## 12. Trasparenza
- [ ] Il catalogo mostra «Ordine: prima gli artisti con piano Max, poi Pro…» con «Come funziona».
- [ ] Il badge dice «Artista Pro» e, al passaggio del puntatore, spiega che è un abbonamento.
- [ ] La pagina contatti e le email riportano **info@narteofficial.it**.
