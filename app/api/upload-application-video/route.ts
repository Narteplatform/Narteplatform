import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "application-videos";
const VIDEO_MIME = /^video\/(mp4|webm|quicktime)$/;
const VIDEO_MAX = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData non valido" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file" }, { status: 400 });
  }

  if (!VIDEO_MIME.test(file.type)) {
    return NextResponse.json(
      { error: "Formato video non supportato (solo mp4/webm/mov)" },
      { status: 415 }
    );
  }

  if (file.size > VIDEO_MAX) {
    return NextResponse.json({ error: "Video troppo grande (max 50MB)" }, { status: 413 });
  }

  const ext =
    (file.type.split("/")[1] ?? "mp4").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "mp4";

  const safeName = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]/gi, "_")
    .slice(0, 40);

  const path = `applications/${crypto.randomUUID()}-${safeName}.${ext}`;

  const admin = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({
    url: pub.publicUrl,
    path,
    bucket: BUCKET,
    name: file.name,
    size: file.size,
    contentType: file.type,
  });
}
