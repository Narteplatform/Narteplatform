import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { artistInterestSchema } from "@/app/(user)/artisti/[slug]/_schema";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isProd = process.env.NODE_ENV === "production";

function newRid(): string {
  try {
    return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

export async function POST(req: Request) {
  const rid = newRid();
  try {
    let body: unknown = null;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[booking-api]", rid, "step=parse-body-fail", e);
      return NextResponse.json(
        { ok: false, rid, error: "Body non valido" },
        { status: 400 }
      );
    }

    logger.debug("booking-api", rid, "step=start");

    const parsed = artistInterestSchema.safeParse(body);
    if (!parsed.success) {
      console.error("[booking-api]", rid, "step=zod-fail", parsed.error.flatten());
      return NextResponse.json(
        { ok: false, rid, error: "Dati non validi" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error("[booking-api]", rid, "step=env-missing");
      return NextResponse.json(
        { ok: false, rid, error: "Configurazione server mancante" },
        { status: 500 }
      );
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch (e) {
      console.error("[booking-api]", rid, "step=admin-client-fail", e);
      return NextResponse.json(
        { ok: false, rid, error: "Configurazione server mancante" },
        { status: 500 }
      );
    }

    const { data: artist, error: artistErr } = await admin
      .from("artists")
      .select("id, stage_name, status, is_public")
      .eq("id", data.artistId)
      .maybeSingle();

    if (artistErr) {
      console.error("[booking-api]", rid, "step=artist-lookup-fail", artistErr);
      return NextResponse.json(
        { ok: false, rid, error: isProd ? "Artista non disponibile" : artistErr.message },
        { status: 400 }
      );
    }
    if (!artist || !artist.is_public) {
      console.warn("[booking-api]", rid, "step=artist-not-approved", {
        found: !!artist,
        status: artist?.status,
      });
      return NextResponse.json(
        { ok: false, rid, error: "Artista non disponibile" },
        { status: 400 }
      );
    }

    const slotLine = data.timeSlot ? `\nSlot orario: ${data.timeSlot}` : "";
    const composedMessage = `Richiesta dalla pagina artista per il ${data.date}.${slotLine}\nNome: ${data.name}\n\n${data.message}`;
    const eventLocation = data.location ?? "Da definire";

    type LeadInsertRow = {
      artist_id: string;
      event_date: string;
      event_location: string;
      message: string;
      contact_email: string;
      contact_phone: string | null;
      event_time?: string | null;
    };
    const basePayload: LeadInsertRow = {
      artist_id: artist.id,
      event_date: data.date,
      event_location: eventLocation,
      message: composedMessage,
      contact_email: data.email,
      contact_phone: data.phone ?? null,
    };
    const fullPayload: LeadInsertRow = {
      ...basePayload,
      event_time: data.timeSlot ?? null,
    };

    let lead: { id: string } | null = null;
    let lastError: { message: string; code?: string } | null = null;

    const first = await admin
      .from("leads")
      .insert(fullPayload)
      .select("id")
      .single();

    if (first.error) {
      console.error("[booking-api]", rid, "step=lead-insert-fail", first.error);
      lastError = { message: first.error.message, code: first.error.code };
      if (first.error.code === "42703" || /event_time/i.test(first.error.message)) {
        logger.debug("booking-api", rid, "step=lead-insert-retry-without-event_time");
        const retry = await admin
          .from("leads")
          .insert(basePayload)
          .select("id")
          .single();
        if (retry.error) {
          console.error("[booking-api]", rid, "step=lead-insert-retry-fail", retry.error);
          lastError = { message: retry.error.message, code: retry.error.code };
        } else {
          lead = retry.data;
          lastError = null;
        }
      }
    } else {
      lead = first.data;
    }

    if (!lead) {
      return NextResponse.json(
        {
          ok: false,
          rid,
          error: isProd ? "Errore salvataggio" : lastError?.message ?? "Errore salvataggio",
        },
        { status: 500 }
      );
    }

    logger.debug("booking-api", rid, "step=lead-inserted", { leadId: lead.id });

    // Email disabilitate per ora — verranno reintegrate in seguito.

    return NextResponse.json({ ok: true, rid, leadId: lead.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore inatteso";
    console.error("[booking-api]", rid, "step=unhandled", e);
    return NextResponse.json(
      { ok: false, rid, error: isProd ? "Errore inatteso" : msg },
      { status: 500 }
    );
  }
}
