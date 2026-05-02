import { HeroEventGuide } from "@/components/marketing/HeroEventGuide";
import { AboutBlock } from "@/components/marketing/AboutBlock";
import { LocationPicker } from "@/components/marketing/LocationPicker";
import { CategoryRail } from "@/components/marketing/CategoryRail";
import { EventGrid } from "@/components/marketing/EventGrid";
import { createClient } from "@/lib/supabase/server";
import type { EventCardProps } from "@/components/marketing/EventCard";

async function getEventsByCategory(category: string, limit = 4): Promise<EventCardProps[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("events")
      .select("slug, title, city, date, price, cover_image")
      .eq("category", category as never)
      .order("date", { ascending: true })
      .limit(limit);
    return (data ?? []).map((e) => ({
      slug: e.slug,
      title: e.title,
      city: e.city,
      date: e.date,
      price: e.price,
      coverImage: e.cover_image,
    }));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [music, festivals, art] = await Promise.all([
    getEventsByCategory("music"),
    getEventsByCategory("festivals"),
    getEventsByCategory("art"),
  ]);

  return (
    <>
      <HeroEventGuide />
      <AboutBlock />
      <LocationPicker />
      <CategoryRail />
      <EventGrid title="Music" events={music} seeAllHref="/eventi?cat=music" />
      <EventGrid title="Festivals" events={festivals} seeAllHref="/eventi?cat=festivals" />
      <EventGrid title="Art" events={art} seeAllHref="/eventi?cat=art" />
    </>
  );
}
