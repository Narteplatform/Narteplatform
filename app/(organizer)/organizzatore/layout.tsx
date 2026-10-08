import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { leggiStatoOrganizzatore, PERCORSO_IN_ATTESA } from "@/lib/organizers/approvazione";
import { OrganizerAppShell } from "@/components/dashboard/AppShellData";
import { ChatDockProvider } from "@/components/chat/ChatDockProvider";
import { ChatDock } from "@/components/chat/ChatDock";
import { UnreadToastProvider } from "@/components/chat/UnreadToastProvider";

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["organizer", "superadmin"]);
  // Approvazione del team (migration 0071). Il superadmin non è mai bloccato;
  // prima della migration lo stato risulta «approved» e non cambia nulla.
  // La pagina di attesa sta fuori da questo layout, quindi nessun ciclo.
  if (user.profile?.role === "organizer") {
    const stato = await leggiStatoOrganizzatore(user.id);
    if (stato !== "approved") redirect(PERCORSO_IN_ATTESA);
  }
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
