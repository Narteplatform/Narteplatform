import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type SearchHit = {
  type: "artist" | "event";
  slug: string;
  title: string;
  subtitle: string | null;
  image: string | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const qRaw = url.searchParams.get("q") ?? "";
  const q = qRaw.trim();
  if (q.length < 2) return NextResponse.json({ hits: [] });

  const escaped = q.replace(/[%,()]/g, "");
  const like = `%${escaped}%`;

  const supabase = createAdminClient();

  const [{ data: artists }, { data: events }] = await Promise.all([
    // `tier desc` prima del limit: con solo 5 risultati la priorità di piano
    // deve decidere CHI entra nei 5, non solo come sono ordinati.
    supabase
      .from("artists")
      .select("slug, stage_name, city, cover_image, genre, status")
      .eq("status", "approved")
      .or(`stage_name.ilike.${like},city.ilike.${like}`)
      .order("tier", { ascending: false })
      .limit(5),
    supabase
      .from("events")
      .select("slug, title, city, date, cover_image")
      .or(`title.ilike.${like},city.ilike.${like}`)
      .order("date", { ascending: true })
      .limit(5),
  ]);

  const hits: SearchHit[] = [
    ...(artists ?? []).map((a) => ({
      type: "artist" as const,
      slug: a.slug,
      title: a.stage_name,
      subtitle: [a.city, (a.genre ?? []).slice(0, 2).join(" / ")].filter(Boolean).join(" · "),
      image: a.cover_image,
    })),
    ...(events ?? []).map((e) => ({
      type: "event" as const,
      slug: e.slug,
      title: e.title,
      subtitle: [
        e.city,
        new Date(e.date).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
      ]
        .filter(Boolean)
        .join(" · "),
      image: e.cover_image,
    })),
  ];

  return NextResponse.json({ hits });
}
