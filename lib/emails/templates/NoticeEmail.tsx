import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/**
 * Email informativa generica: titolo, paragrafi, una scheda di dati, un
 * pulsante facoltativo.
 *
 * È il percorso di riserva (Resend) delle email di trasparenza — decisioni di
 * moderazione, segnalazioni, promemoria di rinnovo, recesso, segnalazione del
 * profilo. Hanno tutte la stessa forma e cambiano solo nel contenuto: un
 * componente per ciascuna sarebbe stato sette copie dello stesso JSX. La
 * versione curata di ognuna vive nei template Brevo (lib/brevo/templates/
 * compliance.ts); questa serve a non perdere il messaggio se Brevo non è attivo.
 *
 * I testi arrivano già pronti e sono testo semplice: React li esegue l'escaping.
 */
export type NoticeRow = { label: string; value: string };

export default function NoticeEmail({
  preview,
  heading,
  paragraphs,
  rows = [],
  button,
  footnote,
}: {
  preview: string;
  heading: string;
  paragraphs: string[];
  rows?: NoticeRow[];
  button?: { label: string; href: string };
  footnote?: string;
}) {
  const righe = rows.filter((r) => r.value.trim() !== "");
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>{heading}</Heading>
          {paragraphs.map((t, i) => (
            <Text key={i} style={p}>
              {t}
            </Text>
          ))}
          {righe.length > 0 && (
            <Section style={scheda}>
              {righe.map((r) => (
                <Text key={r.label} style={riga}>
                  <strong>{r.label}:</strong> {r.value}
                </Text>
              ))}
            </Section>
          )}
          {button && (
            <Button style={bottone} href={button.href}>
              {button.label}
            </Button>
          )}
          {footnote && (
            <>
              <Hr style={hr} />
              <Text style={piccolo}>{footnote}</Text>
            </>
          )}
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
const scheda = {
  backgroundColor: "#F7F4F2",
  borderRadius: "12px",
  padding: "12px 16px",
  margin: "16px 0",
};
const riga = { fontSize: "14px", lineHeight: "21px", color: "#0D1B2A", margin: "4px 0", whiteSpace: "pre-wrap" as const };
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
  margin: "12px 0",
};
