import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type Props = {
  kind: "accepted" | "confirmed" | "declined" | "cancelled_by_admin";
  artistName: string;
  organizerName: string;
  venueName: string | null;
  eventDate: string;
  notesArtist: string | null;
  cancellationReason?: string | null;
};

const COPY: Record<Props["kind"], { heading: string; body: string; preview: string }> = {
  accepted: {
    heading: "L'artista ha aperto la trattativa",
    body: "L'artista è interessato e ha aperto la trattativa. Concorda gli ultimi dettagli e conferma la data dal tuo pannello organizzatore per bloccare definitivamente l'agenda.",
    preview: "L'artista ha aperto la trattativa",
  },
  confirmed: {
    heading: "Data confermata",
    body: "La data è ufficialmente bloccata in agenda. La prenotazione apparirà nel calendario pubblico dell'artista.",
    preview: "Data confermata",
  },
  declined: {
    heading: "L'artista non è disponibile",
    body: "L'artista ha declinato la richiesta. Puoi inviare una nuova proposta o cercare un'altra disponibilità.",
    preview: "Richiesta declinata",
  },
  cancelled_by_admin: {
    heading: "Data annullata dall'amministratore",
    body: "La data confermata è stata annullata dall'amministrazione di N'arte. La disponibilità dell'artista è stata liberata. Trovi qui sotto la motivazione.",
    preview: "Data annullata da N'arte",
  },
};

export default function BookingStatusEmail({
  kind,
  artistName,
  organizerName,
  venueName,
  eventDate,
  notesArtist,
  cancellationReason,
}: Props) {
  const c = COPY[kind];
  return (
    <Html>
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>{c.heading}</Heading>
          <Text style={p}>{c.body}</Text>
          <Hr style={hr} />
          <Section>
            <Row label="Artista" value={artistName} />
            <Row label="Organizzatore" value={organizerName} />
            {venueName && <Row label="Struttura" value={venueName} />}
            <Row label="Data" value={eventDate} />
          </Section>
          {notesArtist && (
            <>
              <Hr style={hr} />
              <Heading as="h2" style={h2}>
                Note dall'artista
              </Heading>
              <Text style={p}>{notesArtist}</Text>
            </>
          )}
          {cancellationReason && (
            <>
              <Hr style={hr} />
              <Heading as="h2" style={h2}>
                Motivazione
              </Heading>
              <Text style={p}>{cancellationReason}</Text>
            </>
          )}
        </Container>
      </Body>
    </Html>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text style={p}>
      <strong>{label}:</strong> {value}
    </Text>
  );
}

const body = { backgroundColor: "#ffffff", fontFamily: "DM Sans, system-ui, sans-serif" };
const container = { padding: "32px", maxWidth: "560px", margin: "0 auto" };
const h1 = {
  fontSize: "26px",
  fontWeight: 700,
  fontFamily: "Fraunces, Georgia, serif",
  letterSpacing: "-0.02em",
  margin: "0 0 16px",
  color: "#0D1B2A",
};
const h2 = { fontSize: "16px", fontWeight: 700, margin: "16px 0 8px", color: "#0D1B2A" };
const p = { fontSize: "14px", lineHeight: "22px", color: "#0D1B2A", margin: "8px 0" };
const hr = { borderColor: "#D6CFCA", margin: "20px 0" };
