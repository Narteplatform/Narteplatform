import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { AccountSettingsForm } from "@/components/forms/AccountSettingsForm";
import { ConsultantForm } from "@/components/admin/ConsultantForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "Profilo — N'arte Admin" };
export const dynamic = "force-dynamic";

type ConsultantProfile = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean;
};

export default async function AdminProfiloPage() {
  // #15 — Pagina condivisa: superadmin e consultant.
  const user = await requireRole(["superadmin", "consultant"]);
  const isConsultant = user.profile?.role === "consultant";

  // Profilo consulente: modifica la propria riga in `consultants`.
  if (isConsultant) {
    const admin = createAdminClient();
    const { data: cRaw } = await admin
      .from("consultants")
      .select("id, name, role, email, phone, bio, avatar_url, is_active")
      .eq("user_id", user.id)
      .maybeSingle();
    const consultant = cRaw as unknown as ConsultantProfile | null;

    return (
      <div className="max-w-3xl space-y-6">
        <header>
          <h1 className="font-display text-2xl tracking-tight">Profilo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aggiorna i dati del tuo profilo di consulente N&apos;arte.
          </p>
        </header>

        {!consultant ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Il tuo account non è collegato ad alcun profilo consulente. Contatta il superadmin.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar src={consultant.avatar_url} name={consultant.name} size="xl" />
                <div className="min-w-0">
                  <p className="font-display text-xl tracking-tight truncate">
                    {consultant.name}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {consultant.role ?? "Consulente"}
                    {consultant.email && <span> · {consultant.email}</span>}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="dark">Consulente</Badge>
                    <Badge variant={consultant.is_active ? "success" : "muted"} dot>
                      {consultant.is_active ? "Attivo" : "Disattivo"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Il mio profilo</CardTitle>
              </CardHeader>
              <CardContent>
                <ConsultantForm
                  initial={{
                    id: consultant.id,
                    name: consultant.name,
                    role: consultant.role,
                    email: consultant.email,
                    phone: consultant.phone,
                    bio: consultant.bio,
                    avatarUrl: consultant.avatar_url,
                  }}
                />
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
                    fullName: user.profile?.full_name ?? consultant.name,
                    avatarUrl: user.profile?.avatar_url ?? "",
                  }}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  // Profilo superadmin (invariato).
  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Profilo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggiorna i dati del tuo account amministratore.
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
              <Badge variant="dark">Superadmin</Badge>
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
