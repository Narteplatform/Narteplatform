import { requireRole } from "@/lib/auth/guards";
import { AccountSettingsForm } from "@/components/forms/AccountSettingsForm";

export const metadata = { title: "Profilo — N'arte Artist" };

export default async function ArtistProfiloPage() {
  const user = await requireRole(["artist", "superadmin"]);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-xl text-4xl">Profilo account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aggiorna i dati del tuo account utente. Per modificare la pagina pubblica
          dell&apos;artista vai su <strong>Profilo artista</strong>.
        </p>
      </div>
      <AccountSettingsForm
        email={user.email ?? ""}
        defaults={{
          fullName: user.profile?.full_name ?? "",
          avatarUrl: user.profile?.avatar_url ?? "",
        }}
      />
    </div>
  );
}
