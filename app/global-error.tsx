"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Nel browser: il dettaglio lato server è già nei log di Vercel, registrato
    // da instrumentation.ts con lo stesso `digest` mostrato qui sotto.
    logger.error("global-error", { digest: error?.digest, nome: error?.name, messaggio: error?.message });
  }, [error]);

  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          fontFamily: '"Open Sans", system-ui, sans-serif',
          background: "#0b0b0b",
          color: "#fff",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 560, textAlign: "center" }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#FF5722",
              margin: 0,
            }}
          >
            errore
          </p>
          <h1
            style={{
              fontFamily: '"Space Grotesk", "Open Sans", sans-serif',
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: "12px 0 16px",
            }}
          >
            Qualcosa è andato storto
          </h1>
          <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.6 }}>
            Il server ha restituito un errore. Puoi riprovare oppure tornare alla home.
          </p>
          {error?.digest && (
            <p
              style={{
                marginTop: 12,
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#888",
              }}
            >
              digest: {error.digest}
            </p>
          )}
          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "10px 20px",
                borderRadius: 999,
                border: "1px solid #333",
                background: "transparent",
                color: "#fff",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Riprova
            </button>
            <a
              href="/"
              style={{
                padding: "10px 20px",
                borderRadius: 999,
                background: "#FF5722",
                color: "#fff",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Torna alla home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
