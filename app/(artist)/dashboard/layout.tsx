import { requireRole } from "@/lib/auth/guards";
import { ArtistAppShell } from "@/components/dashboard/AppShellData";
import { ChatDockProvider } from "@/components/chat/ChatDockProvider";
import { ChatDock } from "@/components/chat/ChatDock";
import { UnreadToastProvider } from "@/components/chat/UnreadToastProvider";

export default async function ArtistDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["artist", "superadmin"]);
  return (
    <ChatDockProvider>
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
      <ChatDock />
      <UnreadToastProvider currentUserId={user.id} />
    </ChatDockProvider>
  );
}
