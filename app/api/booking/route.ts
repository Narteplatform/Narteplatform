import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rotta dismessa (410 Gone).
 *
 * Creava un lead pubblico senza account e senza registrare la presa visione
 * dell'informativa, e mandava una mail all'artista con testo scelto da chi
 * scriveva. Nessuna pagina la chiamava più: le richieste passano da
 * /api/booking-request, che richiede un account organizzatore.
 *
 * Risponde 410 senza leggere il body e senza scrivere nulla.
 */
function gone() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Questo modulo non è più attivo. Per contattare un artista accedi con un account organizzatore e invia la richiesta dal suo profilo su /artisti.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST() {
  return gone();
}

export async function GET() {
  return gone();
}
