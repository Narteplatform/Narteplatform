import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";

export default function ContactMessageEmail({
  name,
  email,
  subject,
  message,
}: {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Nuovo messaggio dal form contatti</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Nuovo messaggio</Heading>
          <Text style={p}>
            <strong>Da:</strong> {name} ({email})
          </Text>
          {subject && (
            <Text style={p}>
              <strong>Oggetto:</strong> {subject}
            </Text>
          )}
          <Hr style={hr} />
          <Text style={p}>{message}</Text>
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
const hr = { borderColor: "#D6CFCA", margin: "20px 0" };
