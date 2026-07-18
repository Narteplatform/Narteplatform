import { requireRole } from "@/lib/auth/guards";
import { AdminAppShell } from "@/components/dashboard/AppShellData";
import type { Role } from "@/lib/supabase/types";

// requireRole(["superadmin", "consultant"]) garantisce già, a runtime, che il
// ruolo sia uno di questi due (altrimenti reindirizza altrove): questo guard
// serve solo a restringere il tipo `Role` (5 valori) per AdminAppShell, senza
// alterare quale ruolo viene effettivamente passato.
function toAdminShellRole(role: Role | undefined): "superadmin" | "consultant" {
  return role === "consultant" ? "consultant" : "superadmin";
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["superadmin", "consultant"]);
  return (
    <AdminAppShell
      user={{
        id: user.id,
        email: user.email ?? "",
        name: user.profile?.full_name ?? null,
        avatarUrl: user.profile?.avatar_url ?? null,
        role: toAdminShellRole(user.profile?.role),
      }}
    >
      {children}
    </AdminAppShell>
  );
}
