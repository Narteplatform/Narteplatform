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

export default function ArtistApprovedEmail({
  applicantName,
  stageName,
  actionUrl,
}: {
  applicantName: string;
  stageName: string;
  actionUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>La tua candidatura su N&apos;arte è stata approvata!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>
            Candidatura approvata — benvenuto/a su N&apos;arte!
          </Heading>
          <Text style={p}>
            Ciao {applicantName},
          </Text>
          <Text style={p}>
            Siamo felici di comunicarti che la candidatura di <strong>{stageName}</strong> è stata
            approvata. Il tuo profilo artista è ora attivo sulla piattaforma.
          </Text>
          <Text style={p}>
            Per accedere alla tua dashboard, impostare la password e completare il profilo,
            clicca sul pulsante qui sotto:
          </Text>
          <Button style={btn} href={actionUrl}>
            Imposta la password e accedi
          </Button>
          <Text style={small}>
            Il link è valido per 24 ore. Se non hai richiesto questa email, ignorala.
          </Text>
          <Hr style={hr} />
          <Text style={small}>N&apos;arte — Find your vibe.</Text>
        </Container>
      </Body>
    </Html>
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
const p = { fontSize: "14px", lineHeight: "22px", color: "#0D1B2A", margin: "8px 0" };
const btn = {
  display: "inline-block",
  backgroundColor: "#FF5722",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
  borderRadius: "999px",
  padding: "12px 28px",
  margin: "16px 0",
};
const small = { fontSize: "12px", color: "#7D746C", margin: "8px 0" };
const hr = { borderColor: "#D6CFCA", margin: "20px 0" };
