import { LayoutDashboard, CalendarDays, Users, Inbox, MessageSquare, UserCog } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { DashboardShell, type SidebarItem } from "@/components/layout/DashboardShell";

const items: SidebarItem[] = [
  { href: "/admin", label: "Overview", icon: <LayoutDashboard className="size-4" />, exact: true },
  { href: "/admin/eventi", label: "Eventi", icon: <CalendarDays className="size-4" /> },
  { href: "/admin/artisti", label: "Artisti", icon: <Users className="size-4" /> },
  { href: "/admin/leads", label: "Lead", icon: <Inbox className="size-4" /> },
  { href: "/admin/messaggi", label: "Messaggi", icon: <MessageSquare className="size-4" /> },
  { href: "/admin/profilo", label: "Profilo", icon: <UserCog className="size-4" /> },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("superadmin");
  return (
    <DashboardShell
      brand="N'ARTE / ADMIN"
      brandHref="/admin"
      items={items}
      email={user.email ?? null}
    >
      {children}
    </DashboardShell>
  );
}
