import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { EventForm } from "@/components/forms/EventForm";
import { DeleteEventButton } from "@/components/forms/DeleteEventButton";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", id).single();
  if (!event) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="display-xl text-4xl">Modifica evento</h1>
        <DeleteEventButton id={event.id} />
      </div>
      <EventForm
        defaultValues={{
          title: event.title,
          category: event.category,
          date: new Date(event.date).toISOString().slice(0, 16),
          endAt: event.end_at ? new Date(event.end_at).toISOString().slice(0, 16) : "",
          city: event.city,
          venue: event.venue ?? "",
          price: event.price?.toString() ?? "",
          coverImage: event.cover_image ?? "",
          ticketUrl: event.ticket_url ?? "",
          description: event.description ?? "",
          featured: event.featured,
          gallery: event.gallery ?? [],
          videos: (event.videos ?? []).join("\n"),
        }}
        eventId={event.id}
      />
    </div>
  );
}
