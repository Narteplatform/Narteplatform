# N'arte — Documento definitivo della piattaforma

> Documento riepilogativo per l'approvazione dello scope di sviluppo.
> Versione: 1.0 — Data: 25 maggio 2026

---

## 1. Cos'è N'arte

N'arte è una piattaforma online italiana che mette in contatto **artisti emergenti**, **organizzatori di eventi musicali** e **pubblico**. Permette di scoprire eventi, esplorare profili di artisti, gestire richieste di booking dal vivo e prenotare consulenze professionali. La piattaforma è gestita internamente dal team N'arte (superadmin), che cura la qualità di eventi, artisti e collaborazioni.

L'obiettivo è offrire un unico punto di incontro fra chi cerca musica dal vivo (locali, festival, brand, privati) e chi la suona (artisti italiani emergenti), riducendo le frizioni del booking tradizionale.

---

## 2. Tipologie di utente

La piattaforma prevede **cinque profili**, ognuno con un'area dedicata.

| Ruolo | Chi è | Cosa fa |
|---|---|---|
| **Visitatore** | Chi entra sul sito senza registrarsi | Naviga eventi, artisti, può candidarsi come artista o usare il modulo contatti |
| **Utente registrato** | Chi si iscrive come fan/cliente | Richiede booking artisti, prenota consulenze, gestisce il proprio profilo |
| **Artista** | Musicista approvato dal team N'arte | Profilo pubblico con bio, foto, audio e video, gestisce calendario disponibilità, riceve richieste di booking, chatta con gli organizzatori, accede a consulenze professionali |
| **Organizzatore** | Locale, festival, brand o agenzia | Crea le proprie strutture (venue), invia richieste di booking agli artisti, negozia in chat, gestisce calendario eventi |
| **Superadmin** | Team N'arte | Controllo totale: gestisce eventi, approva artisti, modera richieste, gestisce slot di consulenza, lead, generi musicali, chat |

---

## 3. Funzioni del sito

### 3.1 Area pubblica (senza login)

- Homepage con eventi in evidenza, categorie e collaborazioni
- Catalogo eventi filtrabile per città e categoria
- Pagina di dettaglio evento (immagini, descrizione, prezzo, link al ticket)
- Catalogo artisti N'arte con filtri
- Profilo pubblico dell'artista (bio, generi, audio, foto, video, social, calendario disponibilità, pulsante "richiedi booking")
- Pagina "Chi siamo" e "Collaborazioni" (showcase storico)
- Modulo di **candidatura artista** (form completo + creazione account)
- Modulo **contatti**
- FAQ
- Login / Registrazione

### 3.2 Area artista

- Dashboard di benvenuto con riepilogo
- **Profilo artista**: bio, generi musicali, città, foto di copertina, gallery, video, **traccia audio**, link social, fascia di prezzo
- **Profilo account**: dati personali, avatar
- **Calendario disponibilità**: marca le date come disponibili o occupate
- **Slot orari**: gestisce fasce orarie standard e personalizzate per data
- **Richieste ricevute (lead)**: accetta, rifiuta o negozia
- **Chat in-app** per ogni richiesta, con scambio di offerte (accetta / rifiuta)
- **Consulenza professionale**: prenota uno slot orario con un consulente del team N'arte

### 3.3 Area organizzatore

- Dashboard con richieste pendenti, prossimi eventi e messaggi
- **Profilo organizzatore**: nome, bio, brand o persona, contatti, social
- **Gestione strutture (venue)**: crea/modifica club, pub, festival, sale con foto, capacità, indirizzo
- **Invio richieste di booking** agli artisti (data, fascia oraria, budget, messaggio)
- **Chat di negoziazione** con offerte tracciate (accettate / rifiutate / superate)
- **Calendario**: vede le date confermate (bloccate sul calendario dell'artista)

### 3.4 Area utente registrato

- Catalogo artisti completo
- Profilo pubblico artista
- Richiesta di booking dal profilo artista
- Prenotazione consulenze (slot disponibili)

### 3.5 Area superadmin (team N'arte)

- Dashboard di controllo
- **Eventi**: CRUD completo (creazione, modifica, eliminazione, evidenza)
- **Artisti**: approvazione candidature, gestione profili, creazione manuale, dettaglio booking
- **Lead**: tutte le richieste di booking, con stato (nuovo → contattato → chiuso), tag, eliminazione
- **Consulenze**: creazione slot singoli o batch, gestione consulenti, lista consulenze confermate
- **Generi e strumenti**: gestione tag artisti
- **Messaggi contatti**: tutte le richieste dal modulo contatti
- **Chat su booking**: visibilità su tutte le conversazioni
- **Profilo admin**: dati e avatar

---

## 4. Flussi principali

### 4.1 Candidatura artista

1. Il candidato compila il form pubblico (`/candidatura-artista`) con dati, generi, bio, social e password.
2. Il sistema crea automaticamente un account e una candidatura.
3. Email di ricezione al candidato + notifica al team N'arte.
4. Il superadmin valuta in `/admin/artisti` e approva o rifiuta.
5. Se approvato: l'utente diventa **artista**, viene creato il profilo, riceve email di benvenuto e accede alla sua area `/dashboard`.

### 4.2 Richiesta di booking (organizzatore → artista)

1. L'organizzatore crea una richiesta dal proprio pannello (data, orario, budget, venue).
2. L'artista riceve un'email di notifica.
3. Si apre una **chat** dedicata fra organizzatore e artista.
4. L'organizzatore invia una o più **offerte** (data + budget); l'artista accetta o rifiuta.
5. Quando un'offerta è accettata, la richiesta passa a **"confermata"**.
6. La data viene **automaticamente bloccata** sul calendario dell'artista.
7. Email di conferma a entrambe le parti.

### 4.3 Booking semplice da profilo artista (utente / visitatore)

1. L'utente apre il profilo dell'artista e clicca "Richiedi booking".
2. Compila data, città, budget, messaggio, contatto.
3. Il sistema crea un **lead** che il team N'arte gestisce dal pannello `/admin/leads`.
4. Email di notifica al team N'arte + email di ricezione all'utente.

### 4.4 Consulenza artista

1. Il superadmin crea slot orari (singoli o in batch) e assegna i consulenti.
2. L'artista vede gli slot disponibili in `/dashboard/consulenza`.
3. Prenota uno slot: la prenotazione è **automaticamente confermata**.
4. Email di conferma all'artista + notifica al consulente / team.

### 4.5 Abbonamento artista (Stripe)

1. L'artista entra in `/dashboard` e sceglie il piano (Free / Pro / Max).
2. Viene reindirizzato a **Stripe Checkout** per pagamento sicuro.
3. Stripe notifica al sistema l'avvenuto pagamento (webhook).
4. Le funzioni del piano si **sbloccano automaticamente** sul profilo dell'artista.
5. L'artista può cambiare piano o disdire in qualsiasi momento dalla dashboard.

### 4.6 Recensione post-evento

1. Quando una data di booking è passata, l'organizzatore riceve un'email per recensire l'artista.
2. Lascia un voto (1–5 stelle) e un commento.
3. La recensione viene pubblicata sul profilo pubblico dell'artista.
4. L'artista può rispondere alla recensione (opzionale).

---

## 5. Piani di abbonamento (Stripe — solo artisti)

La piattaforma è gratuita per **visitatori, utenti e organizzatori**.
Per gli artisti sono previsti tre piani.

> ⚠️ **La fonte unica è `lib/billing/plans.ts`**, non questa tabella. Qui c'è un
> riassunto per la lettura, ma al primo dubbio vince il codice: la matrice
> `ENTITLEMENTS` e `PLAN_FEATURES` alimentano `/prezzi`, le card e l'enforcement.

| Funzione | Free | Pro | Max |
|---|:---:|:---:|:---:|
| Profilo pubblico | ✔ | ✔ | ✔ |
| Foto in gallery | 3 | fino a 10 | fino a 30 |
| Video | 1 | fino a 3 | fino a 3 |
| Tracce audio | — | 1 | 1 |
| Richieste di booking | illimitate | illimitate | illimitate |
| Chat con gli organizzatori | — | ✔ | ✔ |
| Recensioni | — | ✔ | ✔ |
| Badge "Verificato N'arte" | — | ✔ | ✔ |
| Etichetta "TOP Artist" | — | — | ✔ |
| Profili artista creabili | 1 | 2 | 5 |
| Posizione nei risultati | standard | priorità | top in evidenza |
| Eventi N'arte | — | — | ti candidiamo a 2 al mese |
| Statistiche del profilo | — | — | ultimo anno |
| Consulenza professionale | — | 1 slot al mese | illimitata |
| Proposta alle strutture | — | — | ✔ |
| Shooting fotografico | — | — | incluso nell'annuale |
| Supporto | community | email | prioritario |

I booking non sono mai limitati, su nessun piano: il paywall scatta un passo
dopo, sulla **chat**. L'artista Free riceve la richiesta e la mail, ma per
negoziare passa a Pro. La motivazione estesa è nel commento in testa a
`lib/billing/plans.ts`.

**Prezzi** (in `PLAN_PRICES_CENTS`): Pro 9,99 €/mese o 49,99 €/anno,
Max 49,99 €/mese o 499,99 €/anno. L'importo realmente addebitato è quello del
Price su Stripe: se i due divergono vince Stripe.

---

## 6. Integrazioni

| Integrazione | A cosa serve |
|---|---|
| **Supabase** | Database, accesso utenti, archiviazione file (audio, foto, allegati chat) |
| **Resend** | Email transazionali immediate (notifiche tecniche di sistema) |
| **Brevo** | Email automation e marketing (vedi sotto) |
| **Stripe** | Pagamenti abbonamenti artisti, gestione fatture e ricevute |
| **Vercel** | Hosting e pubblicazione automatica del sito |

### 6.1 Email automatiche (Brevo + Resend)

Tutte le email sono in italiano, brandizzate N'arte.

- Benvenuto a ogni nuova iscrizione utente
- Notifica all'artista quando riceve una nuova **offerta di booking**
- Notifica a entrambe le parti quando una **data viene confermata**
- Serie **onboarding artista** (3–5 email post-approvazione: completa il profilo, carica audio, prima candidatura)
- **Newsletter mensile** eventi
- **Recupero lead inattivi** (organizzatori con richieste ferme > 7 giorni, artisti senza login da 30 giorni)
- **Promo eventi geo-targeted** (utenti della città X quando nasce un evento in zona)
- Reminder consulenza in arrivo
- Richiesta recensione post-evento all'organizzatore
- (Lista estendibile in futuro)

---

## 7. Funzioni aggiuntive proposte

### Approvate
- ✅ **Recensioni post-evento** (organizzatore → artista, voto pubblico sul profilo).

### Proposte ulteriori da valutare
Suggerimenti tecnici sensati per la logica della piattaforma, non vincolanti, da approvare insieme:

- **Sistema referral artisti**: codice invito che regala 1 mese Pro gratis ad artisti che ne invitano altri.
- **Notifiche push browser**: avvisi in tempo reale per nuove offerte, messaggi, conferme.
- **Esportazione fatture PDF** Stripe direttamente dalla dashboard artista.
- **Press kit scaricabile**: zip automatico con bio, foto in alta risoluzione e audio per ogni artista (utile per giornalisti / promoter).
- **Google Calendar sync** per gli artisti (sincronizzazione bidirezionale delle date).
- **Pannello statistiche superadmin**: numero candidature, booking confermati, fatturato Stripe, tassi di conversione.

---

## 8. Roadmap di chiusura sviluppo

### Già pronto e funzionante
- Sito pubblico completo (homepage, eventi, artisti, chi siamo, collaborazioni, contatti, FAQ).
- Sistema autenticazione e ruoli.
- Candidatura artisti + approvazione admin.
- Profilo pubblico artisti (bio, foto, audio, video, social, calendario).
- Calendario disponibilità + slot orari.
- Sistema completo di **booking organizzatore ↔ artista** con chat e offerte tracciate.
- Gestione lead diretti da profilo artista.
- Modulo consulenze (slot, consulenti, prenotazione artista).
- Pannello superadmin completo (eventi, artisti, lead, consulenza, generi, chat, messaggi).
- Email transazionali base (Resend).

### Da sviluppare per chiudere lo scope
1. **Stripe**: piani Free / Pro / Max, checkout, webhook, gestione abbonamenti dalla dashboard artista, applicazione automatica dei limiti per piano.
2. **Brevo**: integrazione API, template email, automation (drip onboarding, newsletter, recupero lead, promo geo-targeted, reminder).
3. **Recensioni post-evento**: tabella `reviews`, email di richiesta automatica, pubblicazione su profilo artista, risposta artista.
4. **(Opzionali)** funzioni aggiuntive del punto 7 che il cliente vorrà approvare.

---

## 9. Approvazione cliente

Con la firma sotto, il cliente approva lo scope completo descritto in questo documento.
Tutto ciò che non è elencato qui viene considerato **fuori scope** e verrà eventualmente quotato a parte.

```
Cliente: ____________________________________

Data: _______________________________________

Firma: ______________________________________
```

> Per i dettagli tecnici (stack, modello dati, sicurezza, hosting) vedi [`APPENDICE_TECNICA.md`](./APPENDICE_TECNICA.md).
