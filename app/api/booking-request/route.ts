import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { bookingRequestPublicSchema } from "@/app/(user)/artisti/[slug]/_schema";
import { sendEmail } from "@/lib/emails/send";
import BookingRequestEmail from "@/lib/emails/templates/BookingRequestEmail";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isProd = process.env.NODE_ENV === "production";

function newRid() {
  try {
    return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function POST(req: Request) {
  const rid = newRid();
  try {
    const body = await req.json().catch(() => null);
    const parsed = bookingRequestPublicSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, rid, error: "Dati non validi", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const admin = createAdminClient();

    // 1. Carica artista
    const { data: artist } = await admin
      .from("artists")
      .select("id, stage_name, status, user_id")
      .eq("id", data.artistId)
      .maybeSingle();
    if (!artist || artist.status !== "approved") {
      return NextResponse.json(
        { ok: false, rid, error: "Artista non disponibile" },
        { status: 400 }
      );
    }

    // 2. Identifica utente attuale
    const supabaseSrv = await createClient();
    const {
      data: { user: currentUser },
    } = await supabaseSrv.auth.getUser();

    let userId: string | null = currentUser?.id ?? null;
    let createdSession = false;

    if (!currentUser) {
      // Signup branch: richiede email, password, displayName
      if (!data.email || !data.password || !data.displayName) {
        return NextResponse.json(
          { ok: false, rid, error: "Compila email, password e nome per registrarti" },
          { status: 400 }
        );
      }
      // Auto-confirm signup come organizzatore
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email: data.email,
          password: data.password,
          email_confirm: true,
          user_metadata: {
            role: "organizer",
            display_name: data.displayName,
            full_name: data.displayName,
          },
        });
      if (createErr || !created.user) {
        const msg = createErr?.message ?? "Impossibile creare account";
        return NextResponse.json({ ok: false, rid, error: msg }, { status: 400 });
      }
      userId = created.user.id;

      // 3. Auto-login: crea sessione con email/password via server-side cookies
      const cookieStore = await cookies();
      const ssr = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(items) {
              for (const it of items) {
                cookieStore.set(it.name, it.value, it.options);
              }
            },
          },
        }
      );
      const { error: signinErr } = await ssr.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (signinErr) {
        console.error("[booking-request]", rid, "auto-signin-fail", signinErr);
      } else {
        createdSession = true;
      }
    } else {
      // Utente loggato: controlla ruolo
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .maybeSingle();
      const role = profile?.role;
      if (role === "artist" || role === "superadmin") {
        // superadmin può procedere (auto-bootstrap organizer)
        if (role === "artist") {
          return NextResponse.json(
            { ok: false, rid, error: "Il profilo artista non può inviare richieste" },
            { status: 403 }
          );
        }
      }
      // user → promuovi a organizer
      if (role === "user") {
        const { error: promErr } = await admin.rpc("promote_user_to_organizer", {
          uid: currentUser.id,
        });
        if (promErr) {
          console.error("[booking-request]", rid, "promote-fail", promErr);
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { ok: false, rid, error: "Sessione non valida" },
        { status: 401 }
      );
    }

    // 4. Trova/crea organizer
    let { data: organizer } = await admin
      .from("organizers")
      .select("id, display_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (!organizer) {
      const display =
        data.displayName ||
        currentUser?.user_metadata?.full_name ||
        currentUser?.email?.split("@")[0] ||
        "Organizzatore";
      const { data: created, error: createOrgErr } = await admin
        .from("organizers")
        .insert({ user_id: userId, display_name: display, phone: data.phone ?? null })
        .select("id, display_name")
        .single();
      if (createOrgErr || !created) {
        return NextResponse.json(
          { ok: false, rid, error: "Impossibile creare profilo organizzatore" },
          { status: 500 }
        );
      }
      organizer = created;
    } else if (data.phone) {
      await admin.from("organizers").update({ phone: data.phone }).eq("id", organizer.id);
    }

    // 5. Trova/crea venue
    let venueId: string | null = data.venueId ?? null;
    if (!venueId && data.venueName) {
      const slug = slugify(data.venueName) || "struttura";
      let finalSlug = slug;
      for (let i = 0; i < 5; i++) {
        const { data: hit } = await admin
          .from("venues")
          .select("id")
          .eq("slug", finalSlug)
          .maybeSingle();
        if (!hit) break;
        finalSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      }
      const { data: createdVenue } = await admin
        .from("venues")
        .insert({
          organizer_id: organizer.id,
          name: data.venueName,
          city: data.venueCity ?? null,
          slug: finalSlug,
        })
        .select("id")
        .single();
      venueId = createdVenue?.id ?? null;
    }

    // 6. Inserisci booking request
    const composedMessage = `${data.message}${
      data.venueName && !data.venueId ? `\n\nStruttura: ${data.venueName}${data.venueCity ? `, ${data.venueCity}` : ""}` : ""
    }`;
    const { data: req, error: reqErr } = await admin
      .from("booking_requests")
      .insert({
        organizer_id: organizer.id,
        artist_id: artist.id,
        venue_id: venueId,
        event_date: data.date,
        time_slot: data.timeSlot ?? null,
        budget_offer: data.budgetOffer ?? null,
        message: composedMessage,
        status: "pending",
      })
      .select("id")
      .single();

    if (reqErr || !req) {
      return NextResponse.json(
        { ok: false, rid, error: reqErr?.message ?? "Errore salvataggio" },
        { status: 500 }
      );
    }

    // 7. Email best-effort all'artista + admin
    let artistEmail: string | null = null;
    if (artist.user_id) {
      try {
        const { data: u } = await admin.auth.admin.getUserById(artist.user_id);
        artistEmail = u?.user?.email ?? null;
      } catch {}
    }
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    const requesterEmail = data.email ?? currentUser?.email ?? "";
    await Promise.allSettled([
      artistEmail
        ? sendEmail({
            to: artistEmail,
            subject: `Nuova richiesta booking — ${data.date}`,
            replyTo: requesterEmail || undefined,
            react: BookingRequestEmail({
              artistName: artist.stage_name,
              requesterName: organizer.display_name,
              eventDate: data.date,
              eventLocation: data.venueName ?? data.venueCity ?? "Da definire",
              budget: data.budgetOffer ?? null,
              message: composedMessage,
              contactEmail: requesterEmail,
              contactPhone: data.phone ?? null,
            }),
          })
        : Promise.resolve(),
      adminEmail
        ? sendEmail({
            to: adminEmail,
            subject: `[N'arte] Nuova richiesta per ${artist.stage_name}`,
            replyTo: requesterEmail || undefined,
            react: BookingRequestEmail({
              artistName: artist.stage_name,
              requesterName: organizer.display_name,
              eventDate: data.date,
              eventLocation: data.venueName ?? data.venueCity ?? "Da definire",
              budget: data.budgetOffer ?? null,
              message: composedMessage,
              contactEmail: requesterEmail,
              contactPhone: data.phone ?? null,
              isAdminCopy: true,
            }),
          })
        : Promise.resolve(),
    ]);

    return NextResponse.json({
      ok: true,
      rid,
      requestId: req.id,
      sessionCreated: createdSession,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore inatteso";
    console.error("[booking-request]", rid, "unhandled", e);
    return NextResponse.json(
      { ok: false, rid, error: isProd ? "Errore inatteso" : msg },
      { status: 500 }
    );
  }
}
