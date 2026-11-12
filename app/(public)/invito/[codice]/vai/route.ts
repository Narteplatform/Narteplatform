import { NextResponse, after, type NextRequest } from "next/server";
import { risolviCodice } from "@/lib/inviti/codice";
import { invitiVisibili } from "@/lib/inviti/modalita";
import { registraAperturaInvito } from "@/lib/inviti/visite";
import { COOKIE_INVITO, COOKIE_INVITO_GIORNI } from "@/lib/inviti/regole";

export const runtime = "nodejs"; // l'hash delle aperture usa node:crypto
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
    // Clic su «Invia la candidatura», per /admin/inviti (0079). Dopo la
    // risposta: il redirect non aspetta il database.
    const headers = new Headers(req.headers);
    after(() => registraAperturaInvito({ codice: chi.code, kind: "clic", headers }));
  }
  return risposta;
}
