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
  toRole: "user" | "admin";
  name: string;
  email?: string;
  phone?: string;
  slotAt: string;
  needs: string;
};

export default function ConsultationRequestEmail({
  toRole,
  name,
  email,
  phone,
  slotAt,
  needs,
}: Props) {
  const isAdmin = toRole === "admin";
  return (
    <Html>
      <Head />
      <Preview>{isAdmin ? `Nuova richiesta consulenza: ${name}` : "Richiesta consulenza ricevuta"}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>
            {isAdmin ? "Nuova richiesta consulenza" : "Richiesta consulenza ricevuta"}
          </Heading>
          <Text style={p}>
            {isAdmin
              ? "Un utente ha richiesto una chiamata gratuita con un consulente N'arte."
              : "Abbiamo ricevuto la tua richiesta. Un consulente N'arte ti contatterà a breve per confermare l'appuntamento."}
          </Text>
          <Hr style={hr} />
          <Section>
            <Row label="Nome" value={name} />
            {isAdmin && email && <Row label="Email" value={email} />}
            {isAdmin && phone && <Row label="Telefono" value={phone} />}
            <Row label="Slot richiesto" value={slotAt} />
          </Section>
          <Hr style={hr} />
          <Heading as="h2" style={h2}>
            Necessità
          </Heading>
          <Text style={p}>{needs}</Text>
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
