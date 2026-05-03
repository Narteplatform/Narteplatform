import { createAdminClient } from "@/lib/supabase/server";
import { HeroNarteClient, type HeroArtistImage } from "./HeroNarteClient";

const FALLBACK_IMAGES: HeroArtistImage[] = [
  {
    src: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=70",
    alt: "Concerto live",
  },
  {
    src: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=70",
    alt: "Musicista",
  },
  {
    src: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=70",
    alt: "DJ set",
  },
  {
    src: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=600&q=70",
    alt: "Cantante",
  },
  {
    src: "https://images.unsplash.com/photo-1471478331149-c72f17e33c73?auto=format&fit=crop&w=600&q=70",
    alt: "Chitarrista",
  },
  {
    src: "https://images.unsplash.com/photo-1536922246289-88c42f957773?auto=format&fit=crop&w=600&q=70",
    alt: "Pubblico",
  },
  {
    src: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=70",
    alt: "Performance",
  },
  {
    src: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=600&q=70",
    alt: "Sax",
  },
];

export async function HeroNarte() {
  let images: HeroArtistImage[] = [];
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("artists")
      .select("stage_name, cover_image, gallery")
      .eq("status", "approved")
      .not("cover_image", "is", null)
      .limit(12);

    const fromCover = (data ?? [])
      .filter((a) => a.cover_image)
      .map((a) => ({ src: a.cover_image as string, alt: a.stage_name }));

    const fromGallery = (data ?? [])
      .flatMap((a) =>
        (a.gallery ?? []).slice(0, 1).map((g) => ({ src: g, alt: a.stage_name }))
      );

    images = [...fromCover, ...fromGallery].slice(0, 8);
  } catch (err) {
    console.error("[HeroNarte] artist fetch failed:", err);
  }

  if (images.length < 8) {
    images = [...images, ...FALLBACK_IMAGES].slice(0, 8);
  }

  return <HeroNarteClient images={images} />;
}
