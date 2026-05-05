import {
  CalendarDays,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Tags,
  UserCog,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { AppShell, type AppShellRecent, type AppShellStorage, type NavSection } from "@/components/layout/AppShell";
import { createAdminClient } from "@/lib/supabase/server";

const ADMIN_EVENT_QUOTA = 25;

type AppShellUser = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
};

function todayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function plus30daysIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

function safe<T>(p: PromiseLike<T>): Promise<T | null> {
  return Promise.resolve(p).then(
    (v) => v,
    (err) => {
      console.error("[AppShellData] supabase query failed:", err);
      return null;
    }
  );
}

async function loadAdminShell(): Promise<{
  navSections: NavSection[];
  storage: AppShellStorage;
  recentActivity: AppShellRecent[];
}> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[AppShellData] createAdminClient failed:", err);
    return {
      navSections: defaultAdminNav(),
      storage: defaultAdminStorage(0),
      recentActivity: [],
    };
  }
  const today = todayIso();

  const [
    upcomingEvents,
    pastEvents,
    eventsTotal,
    pendingApplications,
    approvedArtists,
    newLeads,
    contactedLeads,
    closedLeads,
    contactMessages,
    recentArtists,
  ] = await Promise.all([
    safe(admin.from("events").select("id", { count: "exact", head: true }).gte("date", today)),
    safe(admin.from("events").select("id", { count: "exact", head: true }).lt("date", today)),
    safe(admin.from("events").select("id", { count: "exact", head: true })),
    safe(admin.from("artist_applications").select("id", { count: "exact", head: true }).eq("status", "pending")),
    safe(admin.from("artists").select("id", { count: "exact", head: true }).eq("status", "approved")),
    safe(admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "new")),
    safe(admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "contacted")),
    safe(admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "closed")),
    safe(admin.from("contact_messages").select("id", { count: "exact", head: true })),
    safe(
      admin
        .from("artists")
        .select("stage_name, cover_image, status, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(4)
    ),
  ]);

  const c = (n: { count: number | null } | null) => n?.count ?? 0;
  const newLeadsCount = c(newLeads);
  const messagesCount = c(contactMessages);

  const navSections: NavSection[] = [
    {
      href: "/admin",
      label: "Overview",
      icon: <LayoutDashboard className="size-4" />,
      exact: true,
    },
    {
      href: "/admin/eventi",
      label: "Eventi",
      icon: <CalendarDays className="size-4" />,
      children: [
        { href: "/admin/eventi?filter=upcoming", label: "Prossimi", count: c(upcomingEvents) },
        { href: "/admin/eventi?filter=past", label: "Passati", count: c(pastEvents) },
      ],
    },
    {
      href: "/admin/artisti",
      label: "Artisti",
      icon: <Users className="size-4" />,
      badge: c(pendingApplications) > 0 ? { label: String(c(pendingApplications)), variant: "accent" } : undefined,
      children: [
        { href: "/admin/artisti?filter=pending", label: "In attesa", count: c(pendingApplications) },
        { href: "/admin/artisti?filter=approved", label: "Roster", count: c(approvedArtists) },
      ],
    },
    {
      href: "/admin/generi",
      label: "Generi",
      icon: <Tags className="size-4" />,
    },
    {
      href: "/admin/leads",
      label: "Lead",
      icon: <Inbox className="size-4" />,
      badge: newLeadsCount > 0 ? { label: String(newLeadsCount), variant: "accent" } : undefined,
      children: [
        { href: "/admin/leads?status=new", label: "Nuovi", count: newLeadsCount },
        { href: "/admin/leads?status=contacted", label: "Contattati", count: c(contactedLeads) },
        { href: "/admin/leads?status=closed", label: "Chiusi", count: c(closedLeads) },
      ],
    },
    {
      href: "/admin/messaggi",
      label: "Messaggi",
      icon: <MessageSquare className="size-4" />,
      badge: messagesCount > 0 ? { label: String(messagesCount) } : undefined,
    },
    {
      href: "/admin/profilo",
      label: "Profilo",
      icon: <UserCog className="size-4" />,
    },
  ];

  const usedEvents = c(eventsTotal);
  const storage: AppShellStorage = {
    label: "Eventi pubblicati",
    used: usedEvents,
    total: ADMIN_EVENT_QUOTA,
    hint: `${usedEvents} di ${ADMIN_EVENT_QUOTA} eventi attivi`,
    ctaLabel: "Crea evento",
    ctaHref: "/admin/eventi/new",
  };

  const recentActivity: AppShellRecent[] = (recentArtists?.data ?? []).map((a) => ({
    src: a.cover_image ?? null,
    name: a.stage_name,
  }));

  return { navSections, storage, recentActivity };
}

async function loadArtistShell(userId: string): Promise<{
  navSections: NavSection[];
  storage: AppShellStorage | undefined;
  recentActivity: AppShellRecent[];
}> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[AppShellData] createAdminClient failed:", err);
    return {
      navSections: defaultArtistNav(),
      storage: undefined,
      recentActivity: [],
    };
  }

  const artistRes = await safe(
    admin
      .from("artists")
      .select("id, stage_name, cover_image, bio, gallery, videos, genre")
      .eq("user_id", userId)
      .maybeSingle()
  );
  const artist = artistRes?.data ?? null;

  const today = todayIso();
  const horizon = plus30daysIso();

  let availableCount = 0;
  let busyCount = 0;
  let newLeads = 0;
  let contactedLeads = 0;
  let closedLeads = 0;
  let recentLeads: { contact_email: string; event_location: string }[] = [];

  if (artist) {
    const [available, busy, leadsNew, leadsContacted, leadsClosed, recent] = await Promise.all([
      safe(
        admin
          .from("artist_availability")
          .select("id", { count: "exact", head: true })
          .eq("artist_id", artist.id)
          .eq("status", "available")
          .gte("date", today)
          .lte("date", horizon)
      ),
      safe(
        admin
          .from("artist_availability")
          .select("id", { count: "exact", head: true })
          .eq("artist_id", artist.id)
          .eq("status", "busy")
          .gte("date", today)
      ),
      safe(
        admin
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("artist_id", artist.id)
          .eq("status", "new")
      ),
      safe(
        admin
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("artist_id", artist.id)
          .eq("status", "contacted")
      ),
      safe(
        admin
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("artist_id", artist.id)
          .eq("status", "closed")
      ),
      safe(
        admin
          .from("leads")
          .select("contact_email, event_location, created_at")
          .eq("artist_id", artist.id)
          .order("created_at", { ascending: false })
          .limit(4)
      ),
    ]);
    availableCount = available?.count ?? 0;
    busyCount = busy?.count ?? 0;
    newLeads = leadsNew?.count ?? 0;
    contactedLeads = leadsContacted?.count ?? 0;
    closedLeads = leadsClosed?.count ?? 0;
    recentLeads = recent?.data ?? [];
  }

  const navSections: NavSection[] = [
    {
      href: "/dashboard/overview",
      label: "Overview",
      icon: <LayoutDashboard className="size-4" />,
      exact: true,
    },
    {
      href: "/dashboard/profilo-artista",
      label: "Profilo artista",
      icon: <Sparkles className="size-4" />,
    },
    {
      href: "/dashboard/calendario",
      label: "Calendario",
      icon: <CalendarDays className="size-4" />,
      children: [
        { href: "/dashboard/calendario?view=available", label: "Disponibili 30gg", count: availableCount },
        { href: "/dashboard/calendario?view=busy", label: "Occupate", count: busyCount },
      ],
    },
    {
      href: "/dashboard/leads",
      label: "Richieste",
      icon: <Inbox className="size-4" />,
      badge: newLeads > 0 ? { label: String(newLeads), variant: "accent" } : undefined,
      children: [
        { href: "/dashboard/leads?status=new", label: "Nuove", count: newLeads },
        { href: "/dashboard/leads?status=contacted", label: "Contattate", count: contactedLeads },
        { href: "/dashboard/leads?status=closed", label: "Chiuse", count: closedLeads },
      ],
    },
    {
      href: "/dashboard/profilo",
      label: "Profilo account",
      icon: <UserCog className="size-4" />,
    },
  ];

  let storage: AppShellStorage | undefined;
  if (artist) {
    const checks = [
      Boolean(artist.cover_image),
      Boolean(artist.bio && artist.bio.trim().length > 30),
      (artist.gallery?.length ?? 0) >= 3,
      (artist.videos?.length ?? 0) >= 1,
      (artist.genre?.length ?? 0) >= 1,
    ];
    const filled = checks.filter(Boolean).length;
    storage = {
      label: "Profilo completo",
      used: filled,
      total: checks.length,
      hint: `Galleria ${artist.gallery?.length ?? 0} foto · Video ${artist.videos?.length ?? 0}`,
      ctaLabel: "Completa profilo",
      ctaHref: "/dashboard/profilo-artista",
      variant: filled === checks.length ? "default" : "accent",
    };
  }

  const recentActivity: AppShellRecent[] = recentLeads.map((l) => ({
    name: l.event_location ?? l.contact_email,
  }));

  return { navSections, storage, recentActivity };
}

function defaultAdminNav(): NavSection[] {
  return [
    { href: "/admin", label: "Overview", icon: <LayoutDashboard className="size-4" />, exact: true },
    { href: "/admin/eventi", label: "Eventi", icon: <CalendarDays className="size-4" /> },
    { href: "/admin/artisti", label: "Artisti", icon: <Users className="size-4" /> },
    { href: "/admin/generi", label: "Generi", icon: <Tags className="size-4" /> },
    { href: "/admin/leads", label: "Lead", icon: <Inbox className="size-4" /> },
    { href: "/admin/messaggi", label: "Messaggi", icon: <MessageSquare className="size-4" /> },
    { href: "/admin/profilo", label: "Profilo", icon: <UserCog className="size-4" /> },
  ];
}

function defaultArtistNav(): NavSection[] {
  return [
    { href: "/dashboard/overview", label: "Overview", icon: <LayoutDashboard className="size-4" />, exact: true },
    { href: "/dashboard/profilo-artista", label: "Profilo artista", icon: <Sparkles className="size-4" /> },
    { href: "/dashboard/calendario", label: "Calendario", icon: <CalendarDays className="size-4" /> },
    { href: "/dashboard/leads", label: "Richieste", icon: <Inbox className="size-4" /> },
    { href: "/dashboard/profilo", label: "Profilo account", icon: <UserCog className="size-4" /> },
  ];
}

function defaultAdminStorage(used: number): AppShellStorage {
  return {
    label: "Eventi pubblicati",
    used,
    total: ADMIN_EVENT_QUOTA,
    hint: `${used} di ${ADMIN_EVENT_QUOTA} eventi attivi`,
    ctaLabel: "Crea evento",
    ctaHref: "/admin/eventi/new",
  };
}

export async function AdminAppShell({
  user,
  children,
}: {
  user: AppShellUser;
  children: ReactNode;
}) {
  let navSections: NavSection[];
  let storage: AppShellStorage | undefined;
  let recentActivity: AppShellRecent[];
  try {
    ({ navSections, storage, recentActivity } = await loadAdminShell());
  } catch (err) {
    console.error("[AppShellData] loadAdminShell crashed:", err);
    navSections = defaultAdminNav();
    storage = defaultAdminStorage(0);
    recentActivity = [];
  }
  return (
    <AppShell
      brand="N'ARTE / ADMIN"
      brandHref="/admin"
      user={{
        name: user.name ?? null,
        email: user.email,
        role: "superadmin",
        avatarUrl: user.avatarUrl ?? null,
      }}
      navSections={navSections}
      storage={storage}
      recentActivity={recentActivity}
      whatsNewHref="/admin"
    >
      {children}
    </AppShell>
  );
}

export async function ArtistAppShell({
  user,
  children,
}: {
  user: AppShellUser;
  children: ReactNode;
}) {
  let navSections: NavSection[];
  let storage: AppShellStorage | undefined;
  let recentActivity: AppShellRecent[];
  try {
    ({ navSections, storage, recentActivity } = await loadArtistShell(user.id));
  } catch (err) {
    console.error("[AppShellData] loadArtistShell crashed:", err);
    navSections = defaultArtistNav();
    storage = undefined;
    recentActivity = [];
  }
  return (
    <AppShell
      brand="N'ARTE / ARTIST"
      brandHref="/dashboard"
      user={{
        name: user.name ?? null,
        email: user.email,
        role: "artist",
        avatarUrl: user.avatarUrl ?? null,
      }}
      navSections={navSections}
      storage={storage}
      recentActivity={recentActivity}
    >
      {children}
    </AppShell>
  );
}
