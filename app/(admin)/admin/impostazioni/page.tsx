import { createAdminClient } from "@/lib/supabase/server";
import { requireRootSuperadmin, isRootSuperadminEmail } from "@/lib/admin/permissions";
import { ADMIN_PAGE_KEYS, type AdminPageKey } from "@/lib/validators/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { InviteSuperadminForm } from "@/components/admin/InviteSuperadminForm";
import { PermissionsMatrix, type SuperadminRow } from "@/components/admin/PermissionsMatrix";
import { GenerateConsultantCredentials } from "@/components/admin/GenerateConsultantCredentials";

export const dynamic = "force-dynamic";
export const metadata = { title: "Impostazioni — N'arte Admin" };

export default async function ImpostazioniPage() {
  await requireRootSuperadmin();
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "superadmin")
    .order("created_at", { ascending: true });

  const ids = (profiles ?? []).map((p) => p.id);
  const emails = new Map<string, string>();
  if (ids.length > 0) {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    for (const u of users?.users ?? []) {
      if (u.id && u.email) emails.set(u.id, u.email);
    }
  }

  const { data: perms } = await admin
    .from("admin_page_permissions")
    .select("user_id, page_key, can_view")
    .in("user_id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const permsByUser = new Map<string, AdminPageKey[]>();
  for (const p of perms ?? []) {
    if (!p.can_view) continue;
    if (!(ADMIN_PAGE_KEYS as readonly string[]).includes(p.page_key)) continue;
    const arr = permsByUser.get(p.user_id) ?? [];
    arr.push(p.page_key as AdminPageKey);
    permsByUser.set(p.user_id, arr);
  }

  const rows: SuperadminRow[] = (profiles ?? []).map((p) => {
    const email = emails.get(p.id) ?? "—";
    return {
      id: p.id,
      email,
      full_name: p.full_name,
      is_root: isRootSuperadminEmail(email),
      allowed: permsByUser.get(p.id) ?? [],
    };
  });

  // Consulenti senza account di login: candidabili per la generazione credenziali.
  const { data: consultantsRaw } = await admin
    .from("consultants")
    .select("id, name, email, user_id")
    .is("user_id", null)
    .order("name", { ascending: true });
  const consultants = ((consultantsRaw ?? []) as {
    id: string;
    name: string;
    email: string | null;
    user_id: string | null;
  }[]).map((c) => ({ id: c.id, name: c.name, email: c.email }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Impostazioni superadmin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invita nuovi superadmin e gestisci quali pagine possono visualizzare.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invita un nuovo superadmin</CardTitle>
          <CardDescription>
            Riceverà un'email con magic link. Al primo login verrà promosso automaticamente. Dopo
            l'invito imposta i permessi pagina qui sotto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteSuperadminForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permessi pagine admin</CardTitle>
          <CardDescription>
            Spunta le pagine che ogni superadmin può vedere nella sidebar. &quot;Overview&quot; e
            &quot;Profilo&quot; sono sempre attive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PermissionsMatrix rows={rows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credenziali consulente</CardTitle>
          <CardDescription>
            Genera email e password per l'accesso di un consulente. La password viene creata
            automaticamente e mostrata una sola volta: copiala e inviala al consulente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GenerateConsultantCredentials consultants={consultants} />
        </CardContent>
      </Card>
    </div>
  );
}
