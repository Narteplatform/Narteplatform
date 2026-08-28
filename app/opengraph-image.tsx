import { ImageResponse } from "next/og";

/**
 * Immagine di anteprima predefinita per i link condivisi.
 *
 * Prima non ne esisteva nessuna: il blocco `openGraph` in app/layout.tsx non
 * aveva `images`, quindi ogni link N'arte incollato su WhatsApp, Instagram o
 * Facebook appariva come un rettangolo grigio con del testo. Per una
 * piattaforma che vive di condivisioni è un'occasione buttata.
 *
 * Disegnata con i token del progetto (notte, palco, azzurro) e senza font
 * esterni: `next/og` non ha accesso ai font di next/font, e caricarne uno
 * remoto qui aggiungerebbe una dipendenza di rete a ogni generazione. Il peso
 * viene dalla scala tipografica, non dal carattere.
 */

export const runtime = "edge";
export const alt = "N'arte — musica dal vivo, artisti emergenti";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0d1b2a",
          padding: "72px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 14,
            fontWeight: 700,
            color: "#1a6bad",
          }}
        >
          N&apos;ARTE
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 82,
              fontWeight: 700,
              color: "#f7f5f2",
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            Musica dal vivo,
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 82,
              fontWeight: 700,
              color: "#1a6bad",
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            artisti veri.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            borderTop: "3px solid #1a6bad",
            paddingTop: 24,
            fontSize: 26,
            color: "#8fa4b8",
          }}
        >
          Eventi, artisti e booking in tutta Italia
        </div>
      </div>
    ),
    size
  );
}
