# Perché i video degli artisti vanno su Bunny Stream

> Documento di sintesi per la presentazione al cliente.
> Versione tecnica completa: [`VIDEO_ARCHITETTURA_BUNNY.md`](./VIDEO_ARCHITETTURA_BUNNY.md)

---

## Il problema, in due righe

N'arte deve permettere a **centinaia di artisti** di caricare video del proprio lavoro — fino a mezzo giga l'uno — e mostrarli sul profilo pubblico a chiunque, da qualsiasi telefono.

Oggi il sistema accetta al massimo **50 MB per video**. Un video di un concerto ne pesa 250. In pratica, la funzione non è utilizzabile.

---

## Cosa ci serve davvero

Tre cose, e servono tutte e tre insieme:

1. **Caricare file grandi.** Un video di una performance pesa 250 MB, a volte il doppio.
2. **Conservarli senza che il costo esploda** quando gli artisti passano da trenta a mille.
3. **Farli vedere bene a tutti**, anche a chi apre il profilo dal telefono con poca linea.

Una soluzione che ne risolve due su tre non risolve il problema.

---

## La proposta di usare lo spazio Aruba

**Su un punto hanno ragione, ed è giusto riconoscerlo:** conservare i video dove stanno adesso è la scelta più cara che potessimo fare. L'osservazione è corretta e ci ha fatto rivedere tutta l'impostazione.

Ma lo **spazio hosting** di Aruba non può essere la risposta, per tre motivi.

### 1. Il contratto Aruba lo vieta, con parole esplicite

Nelle condizioni d'uso dei servizi Aruba, paragrafo *"Uso delle risorse del sistema"*, è scritto che lo spazio web va usato

> «esclusivamente per la pubblicazione del sito web e **non come repositorio, ossia come strumento per la mera archiviazione di file e/o filmati/video**»

Una piattaforma in cui gli artisti archiviano i propri video **è esattamente ciò che quella frase vieta**. Non è un cavillo formale: significa che il giorno in cui il traffico diventa visibile, l'account può essere sospeso — con dentro i video di tutti gli artisti, e senza alcun impegno di recupero.

### 2. Su quello spazio si caricano file da 8 MB, non da 500

La configurazione standard dell'hosting condiviso Aruba accetta circa **8 MB per caricamento**: sei volte peggio di quello che abbiamo già oggi. E ogni operazione ha un tempo massimo di 2 minuti, mentre un video da 250 MB caricato da una connessione domestica ne richiede quasi 7. **Non arriverebbe mai in fondo.**

### 3. Quello spazio non può far funzionare N'arte

Il sito è costruito con una tecnologia che quell'hosting non è in grado di eseguire. Non sarebbe "spostare il sito su Aruba": sarebbe **aggiungere un secondo sistema separato**, da costruire da zero, con tutta la sicurezza da rifare — chi può caricare, chi può cancellare, quanti video spettano a ciascun piano. Più lavoro, più cose che si rompono, nessun vantaggio.

> **Il dominio non c'entra.** `narte.it` resta registrato ad Aruba senza alcun problema. Dominio e spazio hosting sono due prodotti diversi, venduti dalla stessa azienda: qui stiamo parlando solo del secondo.

---

## La soluzione: Bunny Stream

Bunny Stream è un servizio nato apposta per i video. Fa quattro cose che nessuna alternativa fa tutte insieme.

**Accetta i file pesanti — e accetta quelli dell'iPhone.**
Nessun limite pratico di dimensione. E soprattutto: accetta i video girati con l'iPhone così come sono. Oggi un artista che carica dal telefono si vede rifiutare il file e deve convertirlo per conto suo — la maggior parte si ferma lì e il profilo resta senza video. Con Bunny quel problema sparisce del tutto.

**Prepara da solo la versione giusta per chi guarda.**
Ogni video caricato viene convertito automaticamente in più qualità. Chi apre il profilo da casa con la fibra vede l'alta definizione; chi lo apre dal telefono per strada riceve una versione più leggera che parte subito e non si blocca. È la differenza tra un video che si guarda fino in fondo e uno che si abbandona dopo tre secondi.

**Se cade la linea, riprende da dove era arrivato.**
Caricare 250 MB da uno smartphone richiede minuti. Oggi, se la connessione salta a metà, si ricomincia da capo. Con Bunny il caricamento riparte dal punto esatto in cui si era interrotto.

**Il video viaggia vicino a chi guarda.**
Bunny mantiene copie del video in tutto il mondo e serve sempre quella più vicina all'utente. Il video parte subito, non dopo qualche secondo di caricamento.

---

## Quanto costa

| Artisti sulla piattaforma | Bunny Stream | Sistema attuale |
|---|---:|---:|
| 300 | **~3 $/mese** | 25 $/mese |
| 1.000 | **~13 $/mese** | 68 $/mese |
| 3.000 | **~43 $/mese** | 240 $/mese |

C'è un secondo risparmio, meno visibile ma più importante: spostando i video su Bunny **non serve più attivare l'abbonamento da 25 $ al mese** del servizio che usiamo oggi — ci servirebbe solo per alzare il limite dei file. Senza i video pesanti dentro, quel servizio resta nel piano gratuito.

**In sintesi: con centinaia di artisti spendiamo pochi euro al mese**, e la cifra cresce in modo graduale e prevedibile, non a scatti.

---

## Cosa cambia concretamente per gli artisti

- Caricano video da **500 MB** invece che da 50.
- Caricano **direttamente dal telefono**, senza dover convertire nulla.
- Il video **si vede bene su qualsiasi connessione**, anche lenta.
- Il profilo mostra un'**anteprima automatica** del video, che oggi non esiste.

---

## L'unico compromesso, detto chiaramente

Dopo il caricamento il video **non è visibile nello stesso istante**: Bunny impiega da qualche decina di secondi a un paio di minuti per preparare le diverse qualità. Durante l'attesa l'artista vede l'indicazione "in elaborazione".

È il prezzo da pagare per avere tutto il resto, e riguarda **solo chi carica, mai chi guarda**: per il pubblico il video è sempre pronto e immediato.

---

## In una riga

Aruba costerebbe 6 € al mese, ma **è vietato dal suo stesso contratto** e non accetterebbe file sopra gli 8 MB. Bunny Stream costa pochi euro in più, è costruito esattamente per questo scopo, e risolve anche problemi che oggi abbiamo già.
