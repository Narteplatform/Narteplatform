import { NextResponse, type NextRequest } from "next/server";
import { risolviCodice } from "@/lib/inviti/codice";
import { invitiVisibili } from "@/lib/inviti/modalita";
import { COOKIE_INVITO, COOKIE_INVITO_GIORNI } from "@/lib/inviti/regole";

export const dynamic = "force-dynamic";

/**
 * Dall'atterraggio alla candidatura: ricorda il codice per 30 giorni.
 *
 * Il cookie è tecnico (serve a riconoscere chi ha invitato quando la
 * candidatura viene inviata), httpOnly e senza dati personali: solo il codice.
 * Un codice non valido porta comunque alla candidatura, senza cookie.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ codice: string }> }) {
  const destinazione = new URL("/candidatura-artista#candidatura", req.url);
  const risposta = NextResponse.redirect(destinazione, { status: 303 });
  if (!invitiVisibili()) return risposta;

  const { codice } = await params;
  const chi = await risolviCodice(codice);
  if (chi) {
    risposta.cookies.set(COOKIE_INVITO, chi.code, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_INVITO_GIORNI * 24 * 60 * 60,
    });
  }
  return risposta;
}
