import {
  Building2,
  CalendarDays,
  FileText,
  Inbox,
  LayoutDashboard,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Settings,
  Sparkles,
  Star,
  Tags,
  UserCog,
  Users,
} from "lucide-react";
import {
  getActiveConversationsCountSuperadmin,
  getUnreadCountForUser,
} from "@/lib/chat/queries";
import type { ReactNode } from "react";
import { AppShell, type AppShellRecent, type AppShellStorage, type NavSection } from "@/components/layout/AppShell";
import { NarteLogo } from "@/components/layout/NarteLogo";
import { createAdminClient } from "@/lib/supabase/server";
import { getAllowedAdminPages, isRootSuperadminEmail } from "@/lib/admin/permissions";
import type { AdminPageKey } from "@/lib/validators/schemas";

function ShellBrand({ suffix }: { suffix?: string }) {
  return (
    <span className="flex items-center gap-2">
      <NarteLogo variant="light" width={92} className="h-7 w-auto" />
      {suffix ? (
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          / {suffix}
        </span>
      ) : null}
    </span>
  );
}

const ADMIN_EVENT_QUOTA = 25;

type AppShellUser = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  role?: "superadmin" | "consultant";
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

async function loadAdminShell(opts?: { allowed?: Set<AdminPageKey>; isRoot?: boolean }): Promise<{
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
  const activeChats = await safe(getActiveConversationsCountSuperadmin()).then((v) => v ?? 0);
  const pendingConsultations = await safe(
    admin
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .in("status", ["requested", "confirmed"])
  ).then((v) => v?.count ?? 0);

  const sectionsByKey: Record<AdminPageKey, NavSection | null> = {
    overview: {
      href: "/admin",
      label: "Overview",
      icon: <LayoutDashboard className="size-4" />,
      exact: true,
    },
    eventi: {
      href: "/admin/eventi",
      label: "Eventi",
      icon: <CalendarDays className="size-4" />,
      children: [
        { href: "/admin/eventi?filter=upcoming", label: "Prossimi", count: c(upcomingEvents) },
        { href: "/admin/eventi?filter=past", label: "Passati", count: c(pastEvents) },
      ],
    },
    artisti: {
      href: "/admin/artisti",
      label: "Artisti",
      icon: <Users className="size-4" />,
      badge: c(pendingApplications) > 0 ? { label: String(c(pendingApplications)), variant: "accent" } : undefined,
      children: [
        { href: "/admin/artisti?filter=pending", label: "In attesa", count: c(pendingApplications) },
        { href: "/admin/artisti?filter=approved", label: "Roster", count: c(approvedArtists) },
      ],
    },
    generi: {
      href: "/admin/generi",
      label: "Generi",
      icon: <Tags className="size-4" />,
    },
    leads: {
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
    chat: {
      href: "/admin/chat",
      label: "Chat",
      icon: <MessageCircle className="size-4" />,
      badge: activeChats > 0 ? { label: String(activeChats), variant: "accent" } : undefined,
    },
    messaggi: {
      href: "/admin/messaggi",
      label: "Messaggi",
      icon: <MessageSquare className="size-4" />,
      badge: messagesCount > 0 ? { label: String(messagesCount) } : undefined,
    },
    consulenza: {
      href: "/admin/consulenza",
      label: "Consulenza",
      icon: <Phone className="size-4" />,
      badge: pendingConsultations > 0
        ? { label: String(pendingConsultations), variant: "accent" }
        : undefined,
      children: [
        { href: "/admin/consulenza", label: "Appuntamenti", count: pendingConsultations },
        { href: "/admin/consulenza/confermati", label: "Confermati" },
        { href: "/admin/consulenza/consulenti", label: "Consulenti" },
        { href: "/admin/consulenza/slots", label: "Slot legacy" },
      ],
    },
    blog: {
      href: "/admin/blog",
      label: "Blog",
      icon: <FileText className="size-4" />,
    },
    email: {
      href: "/admin/email",
      label: "Email",
      icon: <Mail className="size-4" />,
    },
    feedback: {
      href: "/admin/feedback",
      label: "Feedback",
      icon: <Star className="size-4" />,
    },
    impostazioni: opts?.isRoot
      ? {
          href: "/admin/impostazioni",
          label: "Impostazioni",
          icon: <Settings className="size-4" />,
        }
      : null,
    profilo: {
      href: "/admin/profilo",
      label: "Profilo",
      icon: <UserCog className="size-4" />,
    },
  };

  const ORDER: AdminPageKey[] = [
    "overview",
    "eventi",
    "artisti",
    "generi",
    "leads",
    "chat",
    "messaggi",
    "consulenza",
    "blog",
    "email",
    "feedback",
    "impostazioni",
    "profilo",
  ];
  const navSections: NavSection[] = ORDER.filter((k) => {
    if (opts?.allowed && !opts.allowed.has(k)) return false;
    return sectionsByKey[k] !== null;
  }).map((k) => sectionsByKey[k]!) as NavSection[];

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

  const unreadChat = await safe(getUnreadCountForUser(userId, "artist")).then((v) => v ?? 0);

  const navSections: NavSection[] = [
    {
      href: "/dashboard/consulenza",
      label: "Consulente N'arte",
      icon: <Phone className="size-4" />,
      featured: true,
    },
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
      children: [
        { href: "/dashboard/profilo-artista", label: "Dati & media" },
        { href: "/dashboard/profilo-artista/video", label: "Video" },
      ],
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
      href: "/dashboard/chat",
      label: "Chat",
      icon: <MessageCircle className="size-4" />,
      badge: unreadChat > 0 ? { label: String(unreadChat), variant: "accent" } : undefined,
    },
    {
      href: "/dashboard/feedback",
      label: "Feedback ricevuti",
      icon: <Star className="size-4" />,
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

async function loadConsultantShell(userId: string): Promise<{
  navSections: NavSection[];
  storage: AppShellStorage | undefined;
  recentActivity: AppShellRecent[];
}> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[AppShellData] createAdminClient failed:", err);
    return { navSections: defaultConsultantNav(), storage: undefined, recentActivity: [] };
  }

  const consultantRow = await safe(
    admin.from("consultants").select("id, name").eq("user_id", userId).maybeSingle()
  );
  const consultantId = (consultantRow?.data as { id: string } | null)?.id ?? null;

  let pendingCount = 0;
  let confirmedCount = 0;
  let futureSlots = 0;
  if (consultantId) {
    const nowIso = new Date().toISOString();
    const [pending, confirmed, slots] = await Promise.all([
      safe(
        admin
          .from("consultations")
          .select("id, slot_id, consultant_slots!inner(consultant_id)", { count: "exact", head: true })
          .eq("status", "requested")
          .eq("consultant_slots.consultant_id", consultantId)
      ),
      safe(
        admin
          .from("consultations")
          .select("id, slot_id, consultant_slots!inner(consultant_id)", { count: "exact", head: true })
          .eq("status", "confirmed")
          .eq("consultant_slots.consultant_id", consultantId)
      ),
      safe(
        admin
          .from("consultant_slots")
          .select("id", { count: "exact", head: true })
          .eq("consultant_id", consultantId)
          .eq("is_active", true)
          .gte("slot_at", nowIso)
      ),
    ]);
    pendingCount = pending?.count ?? 0;
    confirmedCount = confirmed?.count ?? 0;
    futureSlots = slots?.count ?? 0;
  }

  const navSections: NavSection[] = [
    {
      href: "/admin/consulenza",
      label: "Appuntamenti",
      icon: <Phone className="size-4" />,
      badge: pendingCount > 0 ? { label: String(pendingCount), variant: "accent" } : undefined,
      children: [
        { href: "/admin/consulenza?status=requested", label: "Richiesti", count: pendingCount },
        { href: "/admin/consulenza?status=confirmed", label: "Confermati", count: confirmedCount },
      ],
    },
    {
      href: consultantId ? `/admin/consulenza/consulenti/${consultantId}` : "/admin/consulenza",
      label: "I miei slot",
      icon: <CalendarDays className="size-4" />,
      badge: futureSlots > 0 ? { label: String(futureSlots) } : undefined,
    },
    {
      href: "/admin/profilo",
      label: "Profilo",
      icon: <UserCog className="size-4" />,
    },
  ];

  return { navSections, storage: undefined, recentActivity: [] };
}

function defaultConsultantNav(): NavSection[] {
  return [
    { href: "/admin/consulenza", label: "Appuntamenti", icon: <Phone className="size-4" /> },
    { href: "/admin/profilo", label: "Profilo", icon: <UserCog className="size-4" /> },
  ];
}

export async function AdminAppShell({
  user,
  children,
}: {
  user: AppShellUser;
  children: ReactNode;
}) {
  const isConsultant = user.role === "consultant";
  let navSections: NavSection[];
  let storage: AppShellStorage | undefined;
  let recentActivity: AppShellRecent[];
  try {
    if (isConsultant) {
      ({ navSections, storage, recentActivity } = await loadConsultantShell(user.id));
    } else {
      const isRoot = isRootSuperadminEmail(user.email);
      const allowed = await getAllowedAdminPages(user.id, user.email);
      ({ navSections, storage, recentActivity } = await loadAdminShell({ allowed, isRoot }));
    }
  } catch (err) {
    console.error("[AppShellData] loadAdminShell crashed:", err);
    navSections = isConsultant ? defaultConsultantNav() : defaultAdminNav();
    storage = isConsultant ? undefined : defaultAdminStorage(0);
    recentActivity = [];
  }
  return (
    <AppShell
      brand={<ShellBrand suffix={isConsultant ? "Consulente" : "Admin"} />}
      brandHref={isConsultant ? "/admin/consulenza" : "/admin"}
      user={{
        name: user.name ?? null,
        email: user.email,
        role: isConsultant ? "consultant" : "superadmin",
        avatarUrl: user.avatarUrl ?? null,
      }}
      navSections={navSections}
      storage={storage}
      recentActivity={recentActivity}
      whatsNewHref={isConsultant ? "/admin/consulenza" : "/admin"}
    >
      {children}
    </AppShell>
  );
}

async function loadOrganizerShell(userId: string): Promise<{
  navSections: NavSection[];
  storage: AppShellStorage | undefined;
  recentActivity: AppShellRecent[];
}> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[AppShellData] createAdminClient failed:", err);
    return { navSections: defaultOrganizerNav(), storage: undefined, recentActivity: [] };
  }

  const organizerRes = await safe(
    admin.from("organizers").select("id, display_name, avatar_url").eq("user_id", userId).maybeSingle()
  );
  const organizer = organizerRes?.data ?? null;

  let venuesCount = 0;
  let pendingCount = 0;
  let trattativaCount = 0;
  let confermataCount = 0;
  let recentReqs: { event_date: string; artist_id: string }[] = [];

  if (organizer) {
    const [venues, pending, trattativa, confermata, recent] = await Promise.all([
      safe(admin.from("venues").select("id", { count: "exact", head: true }).eq("organizer_id", organizer.id)),
      safe(
        admin
          .from("booking_requests")
          .select("id", { count: "exact", head: true })
          .eq("organizer_id", organizer.id)
          .eq("status", "pending")
      ),
      safe(
        admin
          .from("booking_requests")
          .select("id", { count: "exact", head: true })
          .eq("organizer_id", organizer.id)
          .eq("status", "in_trattativa")
      ),
      safe(
        admin
          .from("booking_requests")
          .select("id", { count: "exact", head: true })
          .eq("organizer_id", organizer.id)
          .eq("status", "confermata")
      ),
      safe(
        admin
          .from("booking_requests")
          .select("event_date, artist_id")
          .eq("organizer_id", organizer.id)
          .order("created_at", { ascending: false })
          .limit(4)
      ),
    ]);
    venuesCount = venues?.count ?? 0;
    pendingCount = pending?.count ?? 0;
    trattativaCount = trattativa?.count ?? 0;
    confermataCount = confermata?.count ?? 0;
    recentReqs = recent?.data ?? [];
  }

  const unreadChatOrg = await safe(getUnreadCountForUser(userId, "organizer")).then((v) => v ?? 0);

  const navSections: NavSection[] = [
    {
      href: "/organizzatore",
      label: "Overview",
      icon: <LayoutDashboard className="size-4" />,
      exact: true,
    },
    {
      href: "/organizzatore/richieste",
      label: "Richieste",
      icon: <Inbox className="size-4" />,
      badge: pendingCount + trattativaCount > 0
        ? { label: String(pendingCount + trattativaCount), variant: "accent" }
        : undefined,
      children: [
        { href: "/organizzatore/richieste?status=pending", label: "In attesa", count: pendingCount },
        { href: "/organizzatore/richieste?status=in_trattativa", label: "In trattativa", count: trattativaCount },
        { href: "/organizzatore/richieste?status=confermata", label: "Confermate", count: confermataCount },
      ],
    },
    {
      href: "/organizzatore/strutture",
      label: "Strutture",
      icon: <Building2 className="size-4" />,
      badge: venuesCount > 0 ? { label: String(venuesCount) } : undefined,
    },
    {
      href: "/organizzatore/calendario",
      label: "Calendario",
      icon: <CalendarDays className="size-4" />,
    },
    {
      href: "/organizzatore/chat",
      label: "Chat",
      icon: <MessageCircle className="size-4" />,
      badge: unreadChatOrg > 0 ? { label: String(unreadChatOrg), variant: "accent" } : undefined,
    },
    {
      href: "/organizzatore/feedback",
      label: "Feedback artisti",
      icon: <Star className="size-4" />,
    },
    {
      href: "/organizzatore/profilo",
      label: "Profilo",
      icon: <UserCog className="size-4" />,
    },
  ];

  const storage: AppShellStorage | undefined = organizer
    ? {
        label: "Profilo organizzatore",
        used: [
          Boolean(organizer.avatar_url),
          venuesCount > 0,
          confermataCount > 0,
        ].filter(Boolean).length,
        total: 3,
        hint: `${venuesCount} strutture · ${confermataCount} eventi confermati`,
        ctaLabel: venuesCount === 0 ? "Aggiungi struttura" : "Nuova richiesta",
        ctaHref: venuesCount === 0 ? "/organizzatore/strutture/nuova" : "/artisti",
        variant: "accent",
      }
    : undefined;

  const recentActivity: AppShellRecent[] = recentReqs.map((r) => ({
    name: new Date(r.event_date).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
  }));

  return { navSections, storage, recentActivity };
}

function defaultOrganizerNav(): NavSection[] {
  return [
    { href: "/organizzatore", label: "Overview", icon: <LayoutDashboard className="size-4" />, exact: true },
    { href: "/organizzatore/richieste", label: "Richieste", icon: <Inbox className="size-4" /> },
    { href: "/organizzatore/strutture", label: "Strutture", icon: <Building2 className="size-4" /> },
    { href: "/organizzatore/calendario", label: "Calendario", icon: <CalendarDays className="size-4" /> },
    { href: "/organizzatore/profilo", label: "Profilo", icon: <UserCog className="size-4" /> },
  ];
}

export async function OrganizerAppShell({
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
    ({ navSections, storage, recentActivity } = await loadOrganizerShell(user.id));
  } catch (err) {
    console.error("[AppShellData] loadOrganizerShell crashed:", err);
    navSections = defaultOrganizerNav();
    storage = undefined;
    recentActivity = [];
  }
  return (
    <AppShell
      brand={<ShellBrand suffix="Organizer" />}
      brandHref="/organizzatore"
      user={{
        name: user.name ?? null,
        email: user.email,
        role: "organizer",
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
      brand={<ShellBrand suffix="Artist" />}
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
