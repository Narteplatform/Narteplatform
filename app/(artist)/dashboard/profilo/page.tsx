import Link from "next/link";
import { Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { AccountSettingsForm } from "@/components/forms/AccountSettingsForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Profilo account — N'arte Artist" };
export const dynamic = "force-dynamic";

export default async function ArtistProfiloPage() {
  const user = await requireRole(["artist", "superadmin"]);
  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug, stage_name, cover_image")
    .eq("user_id", user.id)
    .maybeSingle();

  const displayName = artist?.stage_name || user.profile?.full_name || user.email || "Artista";

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight sm:text-3xl">Profilo account artista</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestisci i dati del tuo account artista: nome, avatar, email di accesso e password. Per
          modificare la tua pagina pubblica vai su <strong>Profilo artista</strong>.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar src={artist?.cover_image ?? user.profile?.avatar_url ?? null} name={displayName} size="xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl tracking-tight">{displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="accent">Artista</Badge>
              {artist?.slug ? (
                <span className="text-xs text-muted-foreground">/artisti/{artist.slug}</span>
              ) : (
                <span className="text-xs text-muted-foreground">Profilo artista non collegato</span>
              )}
            </div>
          </div>
          {artist ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/profilo-artista">
                <Sparkles className="size-4" />
                Modifica profilo artista
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Impostazioni account</CardTitle>
          <CardDescription>Aggiorna nome visualizzato, avatar e password.</CardDescription>
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
