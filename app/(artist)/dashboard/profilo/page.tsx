import { requireRole } from "@/lib/auth/guards";
import { AccountSettingsForm } from "@/components/forms/AccountSettingsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "Profilo — N'arte Artist" };

export default async function ArtistProfiloPage() {
  const user = await requireRole(["artist", "superadmin"]);
  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Profilo account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggiorna i dati del tuo account utente. Per modificare la pagina pubblica
          dell&apos;artista vai su <strong>Profilo artista</strong>.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar
            src={user.profile?.avatar_url ?? null}
            name={user.profile?.full_name ?? user.email}
            size="xl"
          />
          <div className="min-w-0">
            <p className="font-display text-xl tracking-tight truncate">
              {user.profile?.full_name || user.email}
            </p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <div className="mt-2">
              <Badge variant="muted">Artista</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Impostazioni account</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountSettingsForm
            email={user.email ?? ""}
            defaults={{
              fullName: user.profile?.full_name ?? "",
              avatarUrl: user.profile?.avatar_url ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
