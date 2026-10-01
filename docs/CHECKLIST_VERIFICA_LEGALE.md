# Checklist di verifica — allineamento legale (01/10/2026)

Prove manuali dei flussi introdotti con il fascicolo legale v0.95–0.97.
Le sezioni 13–19 riguardano la seconda lista del cliente e richiedono le
migration 0069 e 0070.
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
- [ ] **Doppia conferma.** L'artista accetta un'Offerta dell'organizzatore: la richiesta passa ad **«Accettata»** (non «Confermata»); in chat compare «La data sarà confermata solo quando l'organizzatore la confermerà»; l'organizzatore riceve l'email «… ha accettato: conferma la data».
- [ ] L'organizzatore, da «Richieste», vede «Conferma data» sulla richiesta accettata: dopo l'avviso «L'accordo è solo fra voi…» passa a **«Confermata»** e l'artista riceve l'email. In «Richieste» c'è una sola riga.
- [ ] Se è l'organizzatore ad accettare un'Offerta dell'artista, la richiesta va direttamente a «Confermata».
- [ ] Una richiesta «Accettata» si può ancora annullare dall'organizzatore.
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

## 13. Visitatori non registrati (da browser anonimo)
- [ ] Home: la vetrina mostra card senza nome né foto, con «Registrati gratis per scoprire chi sono».
- [ ] `/artisti`: card anonime (genere, formazione, piano); nel sorgente della pagina (Visualizza sorgente) **non** compaiono nomi d'arte, città, slug né URL di copertine.
- [ ] Un link diretto `/artisti/<slug>` mostra «Accedi per vedere questo artista»; titolo della scheda generico; nessuna anteprima social con nome o foto.
- [ ] La ricerca in alto non restituisce artisti; `/sitemap.xml` non elenca profili.
- [ ] Da loggato tutto torna visibile come prima.

## 14. Registro delle azioni del team
- [ ] Ogni azione delle sezioni precedenti (approvazioni, rifiuti, omaggi, accesso chat, sospensioni) compare in `/admin/registro` con chi, cosa, su chi, quando e perché.
- [ ] Filtri per operatore, tipo e data; «Esporta CSV» scarica le righe filtrate.
- [ ] Le motivazioni hanno la forma «Regola: … — Fatti: …» e l'email all'interessato riporta entrambe.

## 15. Strumenti del team su singoli contenuti
- [ ] Da `/admin/artisti/<id>` rimuovi **una sola** foto della galleria dell'artista di prova con motivazione: le altre foto restano, l'artista riceve l'email.
- [ ] Rimuovi un componente della band con motivazione: gli altri componenti restano.
- [ ] Da una chat aperta con accesso motivato, rimuovi un messaggio: diventa «Messaggio rimosso dal team», il mittente riceve l'email.
- [ ] Da `/admin/utenti/<id>` dell'organizzatore di prova, nascondi una struttura: sparisce dal profilo pubblico dell'artista e dalle scelte; «Mostra» la ripristina.
- [ ] «Chiudi account» con motivazione: accesso bloccato, profili nascosti, richiesta di cancellazione già confermata in `/admin/impostazioni/cancellazioni` (completabile dopo 30 giorni).
- [ ] `/admin/abbonamenti` → «Piani omaggio attivi» elenca artista, piano, scadenza, motivo, chi e quando.
- [ ] Approvando un media o riattivando un profilo l'artista riceve l'email.

## 16. Diritti sui contenuti
- [ ] Primo caricamento di una foto, traccia o video: si apre la dichiarazione sui diritti; senza conferma il caricamento non parte.
- [ ] Dopo la conferma, i caricamenti successivi non la richiedono più (fino alla prossima versione dei documenti).
- [ ] In `/account/i-miei-dati` compare il consenso «diritti_contenuti» con la versione.
- [ ] In `user_consents` (sola lettura) le nuove righe hanno ruolo, user agent e IP in hash, mai l'IP in chiaro.

## 17. Segnalazioni con allegati
- [ ] Su `/segnalazioni` allega fino a 3 file (jpg, png, webp, pdf, max 5 MB); un quarto file o un `.exe` rinominato vengono rifiutati.
- [ ] Da `/admin/segnalazioni` gli allegati si aprono con link a scadenza; «Prendi in carico» mostra il tuo nome come responsabile.
- [ ] Un reclamo deciso dalla stessa persona della decisione contestata mostra l'avviso.

## 18. Recesso e rinnovi
- [ ] `/recesso` (anche da non loggato) mostra istruzioni e modulo tipo stampabile.
- [ ] Un recesso online dall'area abbonamento crea una riga in `subscription_withdrawals` (sola lettura) con canale «online» ed esito del rimborso.
- [ ] Il promemoria del rinnovo annuale parte dal cron giornaliero 30 giorni prima, una sola volta per periodo (controlla `email_log`, template `renewal_reminder`).
- [ ] Cancellazione account con abbonamento attivo: nessun rinnovo, periodo pagato fruibile, nessun rimborso; in `/admin/registro` c'è «cancellazione_confermata».

## 19. Newsletter e conservazione
- [ ] Registrazione con newsletter spuntata: il contatto compare nella lista Brevo «N'arte – Newsletter».
- [ ] Togliendo il consenso da `/account/i-miei-dati` il contatto esce dalla lista.
- [ ] Disiscrizione dal link di un'email Brevo: in `/account/i-miei-dati` il marketing risulta revocato (richiede il webhook registrato).
- [ ] Una recensione di un organizzatore che ha chiesto la cancellazione mostra «Organizzatore — account chiuso».
- [ ] Il log del cron `/api/cron/retention` (Vercel → Logs) riporta i conteggi delle nuove regole (chat 36 mesi, registro 5 anni, candidature 12 mesi) **senza cancellare nulla** finché `RETENTION_ENFORCE` è spento.
