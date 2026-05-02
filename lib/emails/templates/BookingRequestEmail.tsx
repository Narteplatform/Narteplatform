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
  artistName: string;
  requesterName?: string;
  eventDate: string;
  eventLocation: string;
  budget?: number | null;
  message: string;
  contactEmail: string;
  contactPhone?: string | null;
  isAdminCopy?: boolean;
};

export default function BookingRequestEmail({
  artistName,
  requesterName,
  eventDate,
  eventLocation,
  budget,
  message,
  contactEmail,
  contactPhone,
  isAdminCopy,
}: Props) {
  const heading = isAdminCopy
    ? `Nuova richiesta per ${artistName}`
    : `Hai una nuova richiesta di booking, ${artistName}`;

  return (
    <Html>
      <Head />
      <Preview>Nuova richiesta di booking via N&apos;arte</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>{heading}</Heading>
          <Text style={p}>
            {isAdminCopy
              ? `È arrivata una nuova richiesta sulla piattaforma.`
              : `Un utente di N'arte vorrebbe ingaggiarti per un evento. Ecco i dettagli:`}
          </Text>
          <Hr style={hr} />
          <Section>
            <Row label="Data evento" value={eventDate} />
            <Row label="Luogo" value={eventLocation} />
            {budget != null && <Row label="Budget" value={`€${budget.toFixed(2)}`} />}
            {requesterName && <Row label="Richiedente" value={requesterName} />}
            <Row label="Email contatto" value={contactEmail} />
            {contactPhone && <Row label="Telefono" value={contactPhone} />}
          </Section>
          <Hr style={hr} />
          <Heading as="h2" style={h2}>
            Messaggio
          </Heading>
          <Text style={p}>{message}</Text>
          <Hr style={hr} />
          <Text style={small}>
            Risposta diretta a questa email per contattare il richiedente.
          </Text>
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

const body = { backgroundColor: "#ffffff", fontFamily: "Inter, system-ui, sans-serif" };
const container = { padding: "32px", maxWidth: "560px", margin: "0 auto" };
const h1 = {
  fontSize: "28px",
  fontWeight: 900,
  textTransform: "uppercase" as const,
  margin: "0 0 16px",
  color: "#0b0b0b",
};
const h2 = { fontSize: "16px", fontWeight: 700, margin: "16px 0 8px", color: "#0b0b0b" };
const p = { fontSize: "14px", lineHeight: "22px", color: "#0b0b0b", margin: "8px 0" };
const small = { fontSize: "12px", color: "#6b6b6b", margin: "8px 0" };
const hr = { borderColor: "#e5e5e5", margin: "20px 0" };
