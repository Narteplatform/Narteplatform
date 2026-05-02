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

export default function ApplicationReceivedEmail({
  applicantName,
  stageName,
  isAdminCopy,
}: {
  applicantName: string;
  stageName: string;
  isAdminCopy?: boolean;
}) {
  return (
    <Html>
      <Head />
      <Preview>{isAdminCopy ? "Nuova candidatura artista" : "Candidatura ricevuta"}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>
            {isAdminCopy ? "Nuova candidatura" : "Grazie, abbiamo ricevuto la tua candidatura"}
          </Heading>
          <Text style={p}>
            {isAdminCopy
              ? `${applicantName} (${stageName}) si è candidato/a come artista. Vai in /admin/artisti per approvare o rifiutare.`
              : `Ciao ${applicantName}, abbiamo ricevuto la tua candidatura come ${stageName}. Ti contatteremo a breve dopo la revisione.`}
          </Text>
          <Hr style={hr} />
          <Text style={small}>N&apos;arte — Find your vibe.</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#ffffff", fontFamily: "Inter, system-ui, sans-serif" };
const container = { padding: "32px", maxWidth: "560px", margin: "0 auto" };
const h1 = {
  fontSize: "26px",
  fontWeight: 900,
  textTransform: "uppercase" as const,
  margin: "0 0 16px",
  color: "#0b0b0b",
};
const p = { fontSize: "14px", lineHeight: "22px", color: "#0b0b0b", margin: "8px 0" };
const small = { fontSize: "12px", color: "#6b6b6b", margin: "8px 0" };
const hr = { borderColor: "#e5e5e5", margin: "20px 0" };
