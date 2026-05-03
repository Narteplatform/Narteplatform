import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EventForm } from "@/components/forms/EventForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export default function NewEventPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/admin/eventi"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Tutti gli eventi
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Nuovo evento</CardTitle>
          <CardDescription>
            Compila tutti i campi per pubblicare il prossimo evento sul sito.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventForm />
        </CardContent>
      </Card>
    </div>
  );
}
