import { Sparkles, CalendarDays, UserCog, Inbox } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { DashboardShell, type SidebarItem } from "@/components/layout/DashboardShell";

const items: SidebarItem[] = [
  { href: "/dashboard", label: "Profilo artista", icon: <Sparkles className="size-4" />, exact: true },
  { href: "/dashboard/calendario", label: "Calendario", icon: <CalendarDays className="size-4" /> },
  { href: "/dashboard/leads", label: "Richieste", icon: <Inbox className="size-4" /> },
  { href: "/dashboard/profilo", label: "Profilo account", icon: <UserCog className="size-4" /> },
];

export default async function ArtistDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["artist", "superadmin"]);
  return (
    <DashboardShell
      brand="N'ARTE / ARTIST"
      brandHref="/dashboard"
      items={items}
      email={user.email ?? null}
    >
      {children}
    </DashboardShell>
  );
}
