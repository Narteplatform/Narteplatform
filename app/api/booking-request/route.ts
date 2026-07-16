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

function fail(rid: string, step: string, error: string, status = 400) {
  console.error("[booking-request]", rid, "step=" + step, "error:", error);
  return NextResponse.json(
    { ok: false, rid, step, error: `${error} [${rid}]` },
    { status }
  );
}

export async function POST(req: Request) {
  const rid = newRid();
  try {
    console.log("[booking-request]", rid, "step=start");

    // --- Parse body
    let body: unknown = null;
    try {
      body = await req.json();
    } catch (e) {
      return fail(rid, "parse-body", "Body non valido");
    }

    const parsed = bookingRequestPublicSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return fail(rid, "zod", issues || "Dati non validi");
    }
    const data = parsed.data;

    // --- Env check
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return fail(rid, "env", "Config server mancante (SERVICE_ROLE_KEY)", 500);
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return fail(rid, "admin-client", msg, 500);
    }

    // --- Load artist
    const { data: artist, error: artistErr } = await admin
      .from("artists")
      .select("id, stage_name, status, user_id")
      .eq("id", data.artistId)
      .maybeSingle();
    if (artistErr) return fail(rid, "artist-lookup", artistErr.message, 500);
    if (!artist) return fail(rid, "artist-missing", "Artista non trovato");
    if (artist.status !== "approved")
      return fail(rid, "artist-not-approved", "Artista non disponibile");

    // --- Current user (if any)
    const supabaseSrv = await createClient();
    const {
      data: { user: currentUser },
    } = await supabaseSrv.auth.getUser();

    let userId: string | null = currentUser?.id ?? null;
    let createdSession = false;

    if (!currentUser) {
      // --- Signup branch
      if (!data.email || !data.password || !data.displayName) {
        return fail(rid, "signup-fields", "Compila email, password e nome");
      }

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
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
        // Email già registrata: prova a fare signin
        if (/already (registered|been registered|exists)/i.test(msg)) {
          return fail(
            rid,
            "signup-conflict",
            "Email già registrata. Effettua il login e riprova.",
            409
          );
        }
        return fail(rid, "signup", msg);
      }
      userId = created.user.id;
      console.log("[booking-request]", rid, "step=signup-ok", userId);

      // --- Auto-signin via SSR cookies
      try {
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
                try {
                  for (const it of items) {
                    cookieStore.set(it.name, it.value, it.options);
                  }
                } catch (e) {
                  console.warn("[booking-request]", rid, "cookie-set-fail", e);
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
      } catch (e) {
        console.warn("[booking-request]", rid, "auto-signin-exception", e);
      }
    } else {
      // --- Logged-in branch
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .maybeSingle();
      const role = profile?.role;
      if (role === "artist") {
        return fail(rid, "role-artist", "Il profilo artista non può inviare richieste", 403);
      }
      if (role === "user") {
        const { error: promErr } = await admin.rpc("promote_user_to_organizer", {
          uid: currentUser.id,
        });
        if (promErr) {
          console.error("[booking-request]", rid, "promote-fail", promErr);
        }
      }
    }

    if (!userId) return fail(rid, "no-user", "Sessione non valida", 401);

    // --- Ensure organizer row
    let { data: organizer, error: orgLookupErr } = await admin
      .from("organizers")
      .select("id, display_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (orgLookupErr) console.warn("[booking-request]", rid, "org-lookup-warn", orgLookupErr);

    if (!organizer) {
      const display =
        data.displayName ||
        currentUser?.user_metadata?.full_name ||
        currentUser?.email?.split("@")[0] ||
        "Organizzatore";
      const { data: createdOrg, error: createOrgErr } = await admin
        .from("organizers")
        .insert({ user_id: userId, display_name: display, phone: data.phone ?? null })
        .select("id, display_name")
        .single();
      if (createOrgErr || !createdOrg) {
        return fail(
          rid,
          "create-organizer",
          createOrgErr?.message ?? "Impossibile creare profilo organizzatore",
          500
        );
      }
      organizer = createdOrg;
    } else if (data.phone) {
      await admin.from("organizers").update({ phone: data.phone }).eq("id", organizer.id);
    }

    // --- Resolve venue
    let venueId: string | null = data.venueId ?? null;
    if (!venueId && data.venueName) {
      const baseSlug = slugify(data.venueName) || "struttura";
      let finalSlug = baseSlug;
      for (let i = 0; i < 5; i++) {
        const { data: hit } = await admin
          .from("venues")
          .select("id")
          .eq("slug", finalSlug)
          .maybeSingle();
        if (!hit) break;
        finalSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      }
      const { data: createdVenue, error: venueErr } = await admin
        .from("venues")
        .insert({
          organizer_id: organizer.id,
          name: data.venueName,
          city: data.venueCity ?? null,
          slug: finalSlug,
        })
        .select("id")
        .single();
      if (venueErr) console.warn("[booking-request]", rid, "venue-create-warn", venueErr);
      venueId = createdVenue?.id ?? null;
    }

    // --- Insert booking request
    const composedMessage = `${data.message}${
      data.venueName && !data.venueId
        ? `\n\nStruttura: ${data.venueName}${data.venueCity ? `, ${data.venueCity}` : ""}`
        : ""
    }`;
    const { data: bookingReq, error: reqErr } = await admin
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

    if (reqErr || !bookingReq) {
      return fail(rid, "insert-request", reqErr?.message ?? "Errore salvataggio", 500);
    }

    console.log("[booking-request]", rid, "step=request-inserted", bookingReq.id);

    // --- Emails (best-effort)
    try {
      let artistEmail: string | null = null;
      if (artist.user_id) {
        const { data: u } = await admin.auth.admin.getUserById(artist.user_id);
        artistEmail = u?.user?.email ?? null;
      }
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
      const requesterEmail = data.email ?? currentUser?.email ?? "";
      await Promise.allSettled([
        artistEmail
          ? sendEmail({
              to: artistEmail,
              subject: `Nuova richiesta booking — ${data.date}`,
              replyTo: requesterEmail || undefined,
              template: "BookingRequestArtist",
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
              template: "BookingRequestAdmin",
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
    } catch (e) {
      console.warn("[booking-request]", rid, "emails-failed", e);
    }

    return NextResponse.json({
      ok: true,
      rid,
      requestId: bookingReq.id,
      sessionCreated: createdSession,
    });
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}${e.stack ? `\n${e.stack}` : ""}` : String(e);
    console.error("[booking-request]", rid, "step=unhandled", msg);
    return NextResponse.json(
      {
        ok: false,
        rid,
        step: "unhandled",
        error: `${e instanceof Error ? e.message : "Errore inatteso"} [${rid}]`,
      },
      { status: 500 }
    );
  }
}
