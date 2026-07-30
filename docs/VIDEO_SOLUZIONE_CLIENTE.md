# Dove archiviamo i contenuti degli artisti, e perché su bunny.net

> Documento di sintesi per la presentazione al cliente.
> Versione tecnica completa: [`VIDEO_ARCHITETTURA_BUNNY.md`](./VIDEO_ARCHITETTURA_BUNNY.md)

---

## Il problema, in due righe

N'arte deve permettere a **centinaia di artisti** di caricare tutto il materiale del proprio lavoro — video, foto, tracce audio — e mostrarlo sul profilo pubblico a chiunque, da qualsiasi telefono.

Oggi il sistema accetta al massimo **50 MB per video**. Un video di un concerto ne pesa 250. In pratica, la funzione più importante del profilo artista non è utilizzabile.

---

## Cosa deve reggere la piattaforma

Non solo i video. Tutto quello che un artista carica:

| Contenuto | Quanto pesa | Quanto se ne carica |
|---|---|---|
| **Video** di performance | 250 MB, fino a 500 | 1 · 3 · 5 secondo il piano |
| **Foto** del profilo e gallery | 3-6 MB ciascuna appena scattata | fino a 30 sul piano Max |
| **Traccia audio** demo | 5-15 MB | 1 sui piani a pagamento |

E deve reggerlo **mentre gli artisti passano da trenta a mille**, senza che il costo esploda e senza che il sito rallenti.

---

## La proposta di usare lo spazio Aruba

**Su un punto hanno ragione, ed è giusto riconoscerlo:** conservare questo materiale dove sta adesso è la scelta più cara che potessimo fare. L'osservazione è corretta e ci ha fatto rivedere tutta l'impostazione.

Ma lo **spazio hosting** di Aruba non può essere la risposta, per tre motivi.

### 1. Il contratto Aruba lo vieta, con parole esplicite

Nelle condizioni d'uso dei servizi Aruba, paragrafo *"Uso delle risorse del sistema"*, è scritto che lo spazio web va usato

> «esclusivamente per la pubblicazione del sito web e **non come repositorio, ossia come strumento per la mera archiviazione di file e/o filmati/video**»

Una piattaforma in cui gli artisti archiviano i propri contenuti **è esattamente ciò che quella frase vieta**. Non è un cavillo formale: significa che il giorno in cui il traffico diventa visibile, l'account può essere sospeso — con dentro il materiale di tutti gli artisti, e senza alcun impegno di recupero.

### 2. Su quello spazio si caricano file da 8 MB, non da 500

La configurazione standard dell'hosting condiviso Aruba accetta circa **8 MB per caricamento**: sei volte peggio di quello che abbiamo già oggi. E ogni operazione ha un tempo massimo di 2 minuti, mentre un video da 250 MB caricato da una connessione domestica ne richiede quasi 7. **Non arriverebbe mai in fondo.**

### 3. Quello spazio non può far funzionare N'arte

Il sito è costruito con una tecnologia che quell'hosting non è in grado di eseguire. Non sarebbe "spostare il sito su Aruba": sarebbe **aggiungere un secondo sistema separato**, da costruire da zero, con tutta la sicurezza da rifare — chi può caricare, chi può cancellare, quanti contenuti spettano a ciascun piano. Più lavoro, più cose che si rompono, nessun vantaggio.

> **Il dominio non c'entra.** `narte.it` resta registrato ad Aruba senza alcun problema. Dominio e spazio hosting sono due prodotti diversi, venduti dalla stessa azienda: qui stiamo parlando solo del secondo.

---

## La soluzione: bunny.net copre tutto

bunny.net non è un singolo servizio: è una piattaforma con più prodotti, **un solo account e una sola fattura**.

| Cosa carichiamo | Dove va | Cosa ci dà |
|---|---|---|
| **Video** | Bunny Stream | Conversione automatica, qualità adattiva, anteprime |
| **Foto** | Bunny Storage | Archiviazione + consegna veloce ovunque |
| **Audio** | Bunny Storage | Archiviazione + consegna veloce ovunque |

Un unico fornitore per tutto l'archivio degli artisti. E quattro vantaggi che nessuna alternativa offre tutti insieme.

**Accetta i file pesanti — e accetta quelli dell'iPhone.**
Nessun limite pratico di dimensione. E soprattutto: accetta i video girati con l'iPhone così come sono. Oggi un artista che carica dal telefono si vede rifiutare il file e deve convertirlo per conto suo — la maggior parte si ferma lì e il profilo resta vuoto. Con Bunny quel problema sparisce del tutto.

**Prepara da solo la versione giusta per chi guarda.**
Ogni video viene convertito automaticamente in più qualità. Chi apre il profilo da casa con la fibra vede l'alta definizione; chi lo apre dal telefono per strada riceve una versione più leggera che parte subito e non si blocca. È la differenza tra un video che si guarda fino in fondo e uno che si abbandona dopo tre secondi.

**Se cade la linea, riprende da dove era arrivato.**
Caricare 250 MB da uno smartphone richiede minuti. Oggi, se la connessione salta a metà, si ricomincia da capo. Con Bunny il caricamento riparte dal punto esatto in cui si era interrotto.

**Tutto viaggia vicino a chi guarda.**
bunny.net mantiene copie dei file in tutto il mondo e serve sempre quella più vicina all'utente. Le pagine si aprono più in fretta di adesso — non solo i video, anche le foto.

---

## La compressione: alleggeriamo, la qualità resta

È il punto che di solito preoccupa di più, quindi vale la pena spiegarlo bene.

**Comprimere non significa peggiorare. Significa smettere di spedire dati che nessuno può vedere.**

Tre esempi concreti di cosa stiamo buttando via oggi:

- **Una foto scattata con l'iPhone è larga 4032 pixel.** Nel sito viene mostrata dentro un riquadro largo 900. Gli altri 3.000 pixel vengono scaricati da ogni visitatore, e poi buttati dal browser. Sono il 95% del peso del file, per zero differenza visibile.
- **Un telefono che gira un video decide la qualità istante per istante**, senza sapere cosa succederà un secondo dopo. Per non sbagliare esagera ovunque, anche quando l'inquadratura è ferma. Bunny rifà il lavoro con calma e ottiene **la stessa identica qualità visiva con un quinto dei dati**.
- **Un video in alta definizione su uno schermo da sei pollici** è indistinguibile dalla versione a definizione media. Ma pesa il doppio, e su una connessione mobile è la differenza fra un video che parte e uno che si blocca.

**L'originale non si perde mai.** Il file che l'artista carica resta archiviato così com'è. Quello che ottimizziamo è **la copia che viaggia** verso chi guarda. È la differenza fra tenere in archivio il negativo di una fotografia e spedirne la stampa nel formato richiesto: il negativo resta.

Il risultato pratico è che gli artisti caricano file **dieci volte più grandi di oggi**, e le pagine del sito si aprono **più velocemente di adesso**.

---

## Quanto costa, tutto compreso

| Artisti sulla piattaforma | bunny.net (video + foto + audio) | Sistema attuale |
|---|---:|---:|
| 300 | **~5 $/mese** | ~30 $/mese |
| 1.000 | **~15 $/mese** | ~75 $/mese |
| 3.000 | **~47 $/mese** | ~290 $/mese |

C'è un secondo risparmio, meno visibile ma importante: portando i contenuti su bunny.net **non serve più attivare l'abbonamento da 25 $ al mese** del servizio che usiamo oggi — ci servirebbe solo per alzare il limite dei file. Senza i contenuti pesanti dentro, quel servizio resta nel piano gratuito e continua a occuparsi solo del database e degli accessi.

**In sintesi: con centinaia di artisti spendiamo pochi euro al mese**, e la cifra cresce in modo graduale e prevedibile, non a scatti.

---

## Cosa cambia concretamente per gli artisti

- Caricano video da **500 MB** invece che da 50.
- Caricano **direttamente dal telefono**, senza dover convertire nulla.
- Il video **si vede bene su qualsiasi connessione**, anche lenta.
- Il profilo mostra un'**anteprima automatica** del video, che oggi non esiste.
- Le **pagine si aprono più in fretta**, perché le foto vengono servite già alleggerite.

---

## L'unico compromesso, detto chiaramente

Dopo il caricamento il video **non è visibile nello stesso istante**: Bunny impiega da qualche decina di secondi a un paio di minuti per preparare le diverse qualità. Durante l'attesa l'artista vede l'indicazione "in elaborazione".

È il prezzo da pagare per avere tutto il resto, e riguarda **solo chi carica, mai chi guarda**: per il pubblico il contenuto è sempre pronto e immediato. Le foto e l'audio, invece, sono disponibili subito.

---

## In una riga

Aruba costerebbe 6 € al mese, ma **è vietato dal suo stesso contratto** e non accetterebbe file sopra gli 8 MB. bunny.net copre **tutto l'archivio degli artisti** per pochi euro al mese, è costruito esattamente per questo scopo, e risolve anche problemi che oggi abbiamo già.
