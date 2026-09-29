import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";

/**
 * La conferma della richiesta di cancellazione dell'account.
 *
 * PERCHÉ UN PASSAGGIO IN PIÙ. La richiesta parte dall'area riservata, quindi chi
 * la invia è già autenticato: la conferma non serve a stabilire l'identità.
 * Serve contro il caso più banale e più probabile — una sessione lasciata
 * aperta su un computer condiviso, o un click sbagliato — e contro il
 * ripensamento: fra il gesto e la conseguenza c'è un passaggio che richiede di
 * aprire la propria posta. Su un'azione irreversibile, quel passaggio vale.
 */
export default function AccountDeletionConfirmEmail({
  nome,
  url,
  scadenzaOre,
}: {
  nome: string;
  url: string;
  scadenzaOre: number;
}) {
  return (
    <Html>
      <Head />
      <Preview>Conferma la cancellazione del tuo account N&apos;arte</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Vuoi davvero cancellare il tuo account?</Heading>

          <Text style={p}>Ciao {nome},</Text>
          <Text style={p}>
            abbiamo ricevuto una richiesta di cancellazione del tuo account
            N&apos;arte. <strong>Non abbiamo ancora fatto nulla</strong>: si
            procede solo se confermi.
          </Text>

          <Button style={bottone} href={url}>
            Confermo, cancella il mio account
          </Button>

          <Text style={piccolo}>
            Il collegamento vale {scadenzaOre} ore. Se non sei stato tu, ignora
            questo messaggio: senza la conferma non succede niente, e il tuo
            account resta com&apos;è.
          </Text>

          <Hr style={hr} />

          <Text style={p}>
            <strong>Cosa succede quando confermi.</strong> Il tuo accesso viene
            chiuso subito e il profilo pubblico, se ne hai uno, sparisce dal sito.
            La rimozione definitiva dei dati e dei file avviene entro 30 giorni.
          </Text>
          <Text style={p}>
            <strong>Cosa resta.</strong> I documenti contabili degli abbonamenti,
            che siamo tenuti a conservare per legge. E i messaggi che hai inviato
            in chat restano visibili a chi li ha ricevuti: una conversazione ha
            due lati, e non possiamo cancellare la copia altrui.
          </Text>
          <Text style={p}>
            Hai cambiato idea dopo aver confermato? Scrivici entro 30 giorni:
            finché la rimozione non è stata eseguita si può tornare indietro.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#ffffff", fontFamily: "DM Sans, system-ui, sans-serif" };
const container = { padding: "32px", maxWidth: "560px", margin: "0 auto" };
const h1 = {
  fontSize: "24px",
  fontWeight: 700,
  fontFamily: "Fraunces, Georgia, serif",
  letterSpacing: "-0.02em",
  margin: "0 0 16px",
  color: "#0D1B2A",
};
const p = { fontSize: "14px", lineHeight: "22px", color: "#0D1B2A", margin: "8px 0" };
const piccolo = { fontSize: "12px", lineHeight: "18px", color: "#6B6B6B", margin: "12px 0" };
const hr = { borderColor: "#D6CFCA", margin: "20px 0" };
const bottone = {
  backgroundColor: "#0D1B2A",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  padding: "12px 20px",
  borderRadius: "999px",
  textDecoration: "none",
  display: "inline-block",
  margin: "16px 0",
};
