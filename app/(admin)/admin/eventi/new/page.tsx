import { EventForm } from "@/components/forms/EventForm";

export default function NewEventPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="display-xl text-4xl">Nuovo evento</h1>
      <EventForm />
    </div>
  );
}
