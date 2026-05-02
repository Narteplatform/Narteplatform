import { ManualArtistForm } from "@/components/forms/ManualArtistForm";

export default function NewArtistPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="display-xl text-4xl">Nuovo artista</h1>
      <p className="text-sm text-muted-foreground">
        Crea direttamente un artista approvato. Se inserisci una email, verrà inviato un magic link
        per collegare l&apos;account artista.
      </p>
      <ManualArtistForm />
    </div>
  );
}
