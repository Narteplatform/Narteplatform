import { requireRole } from "@/lib/auth/guards";
import { OrganizerAppShell } from "@/components/dashboard/AppShellData";
import { ChatDockProvider } from "@/components/chat/ChatDockProvider";
import { ChatDock } from "@/components/chat/ChatDock";
import { UnreadToastProvider } from "@/components/chat/UnreadToastProvider";

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["organizer", "superadmin"]);
  return (
    <ChatDockProvider>
      <OrganizerAppShell
        user={{
          id: user.id,
          email: user.email ?? "",
          name: user.profile?.full_name ?? null,
          avatarUrl: user.profile?.avatar_url ?? null,
        }}
      >
        {children}
      </OrganizerAppShell>
      <ChatDock />
      <UnreadToastProvider currentUserId={user.id} />
    </ChatDockProvider>
  );
}
