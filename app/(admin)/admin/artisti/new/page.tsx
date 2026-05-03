import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ManualArtistForm } from "@/components/forms/ManualArtistForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export default function NewArtistPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/admin/artisti"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Tutti gli artisti
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Nuovo artista</CardTitle>
          <CardDescription>
            Crea direttamente un artista approvato. Se inserisci una email, verrà inviato un magic link
            per collegare l&apos;account artista.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ManualArtistForm />
        </CardContent>
      </Card>
    </div>
  );
}
