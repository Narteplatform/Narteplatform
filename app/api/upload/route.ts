import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKETS = {
  artist: "artist-images",
  event: "event-covers",
  event_home: "event-covers",
  avatar: "artist-images",
  venue: "venue-images",
  audio: "artist-audio",
  "artist-video": "artist-videos",
} as const;

type Kind = keyof typeof BUCKETS;

const AUDIO_MIME = /^audio\//;
const VIDEO_MIME = /^video\/(mp4|webm|quicktime)$/;
const AUDIO_MAX = 25 * 1024 * 1024; // 25MB
const VIDEO_MAX = 50 * 1024 * 1024; // 50MB
const IMAGE_MAX = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  // Auth check: solo utenti loggati possono caricare
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData non valido" }, { status: 400 });
  }

  const file = form.get("file");
  const kindRaw = (form.get("kind") ?? "artist").toString();
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file" }, { status: 400 });
  }
  if (!(kindRaw in BUCKETS)) {
    return NextResponse.json({ error: "Kind non valido" }, { status: 400 });
  }
  const kind = kindRaw as Kind;
  const bucket = BUCKETS[kind];

  if (kind === "audio") {
    if (file.size > AUDIO_MAX) {
      return NextResponse.json({ error: "Audio troppo grande (max 25MB)" }, { status: 413 });
    }
    if (!AUDIO_MIME.test(file.type)) {
      return NextResponse.json({ error: "Formato audio non supportato" }, { status: 415 });
    }
  } else if (kind === "artist-video") {
    if (file.size > VIDEO_MAX) {
      return NextResponse.json({ error: "Video troppo grande (max 50MB)" }, { status: 413 });
    }
    if (!VIDEO_MIME.test(file.type)) {
      return NextResponse.json(
        { error: "Formato video non supportato (solo mp4/webm/mov)" },
        { status: 415 }
      );
    }
  } else {
    if (file.size > IMAGE_MAX) {
      return NextResponse.json({ error: "Immagine troppo grande (max 5MB)" }, { status: 413 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Formato non supportato" }, { status: 415 });
    }
  }

  const defaultExt =
    kind === "audio" ? "mp3" : kind === "artist-video" ? "mp4" : "jpg";
  const ext =
    (file.type.split("/")[1] || defaultExt).replace(/[^a-z0-9]/gi, "").slice(0, 5) || defaultExt;
  const safeKind = kind.replace(/[^a-z0-9_-]/gi, "_");
  const path = `${user.id}/${Date.now()}-${safeKind}.${ext}`;

  const admin = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const { error: upErr } = await admin.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({
    url: pub.publicUrl,
    path,
    bucket,
    name: file.name,
    size: file.size,
    contentType: file.type,
  });
}
