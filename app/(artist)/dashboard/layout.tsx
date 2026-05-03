import { requireRole } from "@/lib/auth/guards";
import { ArtistAppShell } from "@/components/dashboard/AppShellData";

export default async function ArtistDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["artist", "superadmin"]);
  return (
    <ArtistAppShell
      user={{
        id: user.id,
        email: user.email ?? "",
        name: user.profile?.full_name ?? null,
        avatarUrl: user.profile?.avatar_url ?? null,
      }}
    >
      {children}
    </ArtistAppShell>
  );
}
