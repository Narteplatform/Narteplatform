import { requireRole } from "@/lib/auth/guards";
import { AdminAppShell } from "@/components/dashboard/AppShellData";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("superadmin");
  return (
    <AdminAppShell
      user={{
        id: user.id,
        email: user.email ?? "",
        name: user.profile?.full_name ?? null,
        avatarUrl: user.profile?.avatar_url ?? null,
      }}
    >
      {children}
    </AdminAppShell>
  );
}
