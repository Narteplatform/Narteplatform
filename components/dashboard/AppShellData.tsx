import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  Mail,
  MessageCircle,
  CreditCard,
  Phone,
  Settings,
  Shapes,
  Star,
  Tags,
  User,
  UserCog,
  Users,
} from "lucide-react";
import {
  getActiveConversationsCountSuperadmin,
  getUnreadCountForUser,
} from "@/lib/chat/queries";
import type { ReactNode } from "react";
import { AppShell, type AppShellStorage, type NavSection } from "@/components/layout/AppShell";
import { NarteLogo } from "@/components/layout/NarteLogo";
import { createAdminClient } from "@/lib/supabase/server";
import { getArtistContext, type OwnedArtist } from "@/lib/artist/current";
import { getAccountEntitlements } from "@/lib/billing/entitlements";
import { entitlementsFor, isUnlimited } from "@/lib/billing/plans";
import type { ArtistTier } from "@/lib/supabase/types";
import { ArtistProfileSwitcher } from "@/components/dashboard/ArtistProfileSwitcher";
import { getAllowedAdminPages, isRootSuperadminEmail } from "@/lib/admin/permissions";
import {
  computeProfileCompletion,
  PROFILE_COMPLETION_COLUMNS,
  type ProfileCompletionSource,
} from "@/lib/artist/profile-completion";
import type { AdminPageKey } from "@/lib/validators/schemas";

/**
 * Logo + area di appartenenza, senza separatore: il suffisso è dimensionato per
 * leggersi come parte del marchio ("N'ARTE ARTISTA"), non come una briciola di
 * navigazione.
 *
 * `items-baseline` e non `items-center`: nel PNG del logo la base della scritta
 * "arte" cade al 96% dell'altezza, quindi centrando il suffisso questo finiva
 * ~6px più in alto e sembrava scritto su un'altra riga. Con l'allineamento alla
 * linea di base il testo si appoggia dove si appoggia il marchio, e resta
 * corretto anche cambiando corpo del font o larghezza del logo.
 */
function ShellBrand({ suffix }: { suffix?: string }) {
  return (
    <span className="flex items-baseline gap-2">
      <NarteLogo variant="light" width={92} className="h-7 w-auto" />
      {suffix ? (
        <span className="font-display text-lg uppercase leading-none tracking-tight">
          {suffix}
        </span>
      ) : null}
    </span>
  );
}

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

function safe<T>(p: PromiseLike<T>): Promise<T | null> {
  return Promise.resolve(p).then(
    (v) => v,
    (err) => {
      console.error("[AppShellData] supabase query failed:", err);
      return null;
    }
  );
}

/**
 * Voci della barra fissa in basso su mobile: le operazioni quotidiane
 * dell'admin. Tutto il resto resta nel cassetto, raggiungibile dal burger.
 */
const BOTTOM_NAV_KEYS: AdminPageKey[] = ["overview", "eventi", "artisti", "leads", "chat"];

/** Etichette accorciate: nella barra ci stanno ~9 caratteri per voce. */
const BOTTOM_NAV_LABELS: Partial<Record<AdminPageKey, string>> = {
  overview: "Home",
};

async function loadAdminShell(opts?: { allowed?: Set<AdminPageKey>; isRoot?: boolean }): Promise<{
  navSections: NavSection[];
  bottomNav: NavSection[];
}> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[AppShellData] createAdminClient failed:", err);
    const fallback = defaultAdminNav();
    return { navSections: fallback, bottomNav: fallback.slice(0, 5) };
  }
  const today = todayIso();

  const [
    upcomingEvents,
    pastEvents,
    pendingApplications,
    approvedArtists,
    newLeads,
    contactedLeads,
    closedLeads,
  ] = await Promise.all([
    safe(admin.from("events").select("id", { count: "exact", head: true }).gte("date", today)),
    safe(admin.from("events").select("id", { count: "exact", head: true }).lt("date", today)),
    safe(admin.from("artist_applications").select("id", { count: "exact", head: true }).eq("status", "pending")),
    safe(admin.from("artists").select("id", { count: "exact", head: true }).eq("status", "approved")),
    safe(admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "new").in("source", ["format", "contatti"])),
    safe(admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "contacted")),
    safe(admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "closed")),
  ]);

  const c = (n: { count: number | null } | null) => n?.count ?? 0;
  const newLeadsCount = c(newLeads);
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
    format: {
      href: "/admin/format",
      label: "Format",
      icon: <Shapes className="size-4" />,
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
    richieste: {
      href: "/admin/richieste",
      label: "Richieste",
      icon: <ClipboardList className="size-4" />,
    },
    chat: {
      href: "/admin/chat",
      label: "Chat",
      icon: <MessageCircle className="size-4" />,
      badge: activeChats > 0 ? { label: String(activeChats), variant: "accent" } : undefined,
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
    "format",
    "artisti",
    "generi",
    "leads",
    "richieste",
    "chat",
    "consulenza",
    "blog",
    "email",
    "feedback",
    "impostazioni",
    "profilo",
  ];
  const isVisible = (k: AdminPageKey) => {
    if (opts?.allowed && !opts.allowed.has(k)) return false;
    return sectionsByKey[k] !== null;
  };

  const navSections: NavSection[] = ORDER.filter(isVisible).map(
    (k) => sectionsByKey[k]!
  ) as NavSection[];

  // Stesso filtro dei permessi della sidebar: un superadmin non-root senza
  // accesso a Chat non deve trovarsela in barra. `children` rimossi: nella
  // barra la voce è un solo tocco, non un accordion.
  const bottomNav: NavSection[] = BOTTOM_NAV_KEYS.filter(isVisible).map((k) => {
    const section = sectionsByKey[k]!;
    return {
      ...section,
      label: BOTTOM_NAV_LABELS[k] ?? section.label,
      children: undefined,
    };
  });

  return { navSections, bottomNav };
}

/** Contesto del selettore di profilo reso nella topbar. */
type ArtistProfilesContext = {
  owned: OwnedArtist[];
  activeId: string | null;
  canCreateMore: boolean;
};

async function loadArtistShell(userId: string): Promise<{
  navSections: NavSection[];
  storage: AppShellStorage | undefined;
  profiles: ArtistProfilesContext;
  planTier: ArtistTier | null;
  /** Cover del profilo attivo: avatar di ripiego se l'account non ne ha uno. */
  artistCover: string | null;
}> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[AppShellData] createAdminClient failed:", err);
    return {
      navSections: defaultArtistNav(),
      storage: undefined,
      profiles: { owned: [], activeId: null, canCreateMore: false },
      planTier: null,
      artistCover: null,
    };
  }

  // Profili dell'account e profilo ATTIVO, in una sola risoluzione: servono sia
  // ai dati della shell sia al selettore in topbar.
  // Con più profili, un .eq("user_id", …).maybeSingle() qui non sceglierebbe:
  // andrebbe in errore (PGRST116) e la shell dell'intera dashboard resterebbe
  // senza dati.
  const ctx = await safe(getArtistContext(userId));
  const owned = ctx?.owned ?? [];
  const activeArtist = ctx?.active ?? null;

  const accountEnt = await safe(getAccountEntitlements(userId));
  const maxProfiles = accountEnt?.artistProfilesMax ?? 1;
  const profiles: ArtistProfilesContext = {
    owned,
    activeId: activeArtist?.id ?? null,
    canCreateMore: isUnlimited(maxProfiles) || owned.length < maxProfiles,
  };

  const artistRes = activeArtist
    ? await safe(
        admin
          .from("artists")
          .select(`id, stage_name, ${PROFILE_COMPLETION_COLUMNS}`)
          .eq("id", activeArtist.id)
          .maybeSingle()
      )
    : null;
  const artist = artistRes?.data ?? null;

  let newLeads = 0;
  let contactedLeads = 0;
  let closedLeads = 0;

  if (artist) {
    const [leadsNew, leadsContacted, leadsClosed] = await Promise.all([
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
    ]);
    newLeads = leadsNew?.count ?? 0;
    contactedLeads = leadsContacted?.count ?? 0;
    closedLeads = leadsClosed?.count ?? 0;
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
      label: "Dashboard",
      icon: <LayoutDashboard className="size-4" />,
      exact: true,
    },
    {
      href: "/dashboard/profilo-artista",
      label: "Profilo artista",
      icon: <User className="size-4" />,
    },
    {
      href: "/dashboard/profili",
      label: "I tuoi profili",
      icon: <Users className="size-4" />,
    },
    {
      href: "/dashboard/calendario",
      label: "Calendario",
      icon: <CalendarDays className="size-4" />,
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
      label: "Feedback",
      icon: <Star className="size-4" />,
    },
    {
      href: "/dashboard/abbonamento",
      label: "Abbonamento",
      icon: <CreditCard className="size-4" />,
    },
  ];

  // Le statistiche sono un'esclusiva del piano Max. La voce compare solo a chi
  // ce l'ha: chi non ce l'ha e arriva sull'URL trova comunque una pagina che
  // spiega cosa si sta perdendo, non un 404 (vedi la pagina stessa).
  // `accountEnt` è già stato risolto sopra: nessuna query in più.
  if (activeArtist && entitlementsFor(activeArtist.tier ?? "free").stats !== "none") {
    navSections.splice(navSections.length - 1, 0, {
      href: "/dashboard/statistiche",
      label: "Statistiche",
      icon: <BarChart3 className="size-4" />,
    });
  }

  let storage: AppShellStorage | undefined;
  if (artist) {
    const completion = computeProfileCompletion(
      artist as unknown as ProfileCompletionSource
    );
    storage = {
      label: "Profilo completo",
      used: completion.filled,
      total: completion.total,
      hint: completion.hint,
      ctaLabel: "Completa profilo",
      ctaHref: "/dashboard/profilo-artista",
      variant: completion.isComplete ? "default" : "accent",
    };
  }

  return {
    navSections,
    storage,
    profiles,
    planTier: activeArtist?.tier ?? null,
    artistCover: (artist as { cover_image?: string | null } | null)?.cover_image ?? null,
  };
}

function defaultAdminNav(): NavSection[] {
  return [
    { href: "/admin", label: "Overview", icon: <LayoutDashboard className="size-4" />, exact: true },
    { href: "/admin/eventi", label: "Eventi", icon: <CalendarDays className="size-4" /> },
    { href: "/admin/format", label: "Format", icon: <Shapes className="size-4" /> },
    { href: "/admin/artisti", label: "Artisti", icon: <Users className="size-4" /> },
    { href: "/admin/generi", label: "Generi", icon: <Tags className="size-4" /> },
    { href: "/admin/leads", label: "Lead", icon: <Inbox className="size-4" /> },
    { href: "/admin/profilo", label: "Profilo", icon: <UserCog className="size-4" /> },
  ];
}

function defaultArtistNav(): NavSection[] {
  return [
    { href: "/dashboard/overview", label: "Dashboard", icon: <LayoutDashboard className="size-4" />, exact: true },
    { href: "/dashboard/profilo-artista", label: "Profilo artista", icon: <User className="size-4" /> },
    { href: "/dashboard/calendario", label: "Calendario", icon: <CalendarDays className="size-4" /> },
    { href: "/dashboard/leads", label: "Richieste", icon: <Inbox className="size-4" /> },
  ];
}

async function loadConsultantShell(userId: string): Promise<{
  navSections: NavSection[];
  storage: AppShellStorage | undefined;
}> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[AppShellData] createAdminClient failed:", err);
    return { navSections: defaultConsultantNav(), storage: undefined };
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
      label: "Calendario",
      icon: <CalendarDays className="size-4" />,
      badge: futureSlots > 0 ? { label: String(futureSlots) } : undefined,
    },
    {
      href: "/admin/profilo",
      label: "Profilo",
      icon: <UserCog className="size-4" />,
    },
  ];

  return { navSections, storage: undefined };
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
  let bottomNav: NavSection[] | undefined;
  let storage: AppShellStorage | undefined = undefined;
  try {
    if (isConsultant) {
      ({ navSections, storage } = await loadConsultantShell(user.id));
      // Il consulente ha 3 sole voci: una barra in basso sarebbe un doppione
      // del cassetto.
      bottomNav = undefined;
    } else {
      const isRoot = isRootSuperadminEmail(user.email);
      const allowed = await getAllowedAdminPages(user.id, user.email);
      ({ navSections, bottomNav } = await loadAdminShell({ allowed, isRoot }));
    }
  } catch (err) {
    console.error("[AppShellData] loadAdminShell crashed:", err);
    navSections = isConsultant ? defaultConsultantNav() : defaultAdminNav();
    bottomNav = isConsultant ? undefined : navSections.slice(0, 5);
    storage = undefined;
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
      bottomNav={bottomNav}
      storage={storage}
    >
      {children}
    </AppShell>
  );
}

async function loadOrganizerShell(userId: string): Promise<{
  navSections: NavSection[];
  storage: AppShellStorage | undefined;
}> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[AppShellData] createAdminClient failed:", err);
    return { navSections: defaultOrganizerNav(), storage: undefined };
  }

  const organizerRes = await safe(
    admin
      .from("organizers")
      .select("id, display_name, avatar_url, bio, phone, website, instagram")
      .eq("user_id", userId)
      .maybeSingle()
  );
  const organizer = organizerRes?.data ?? null;

  let venuesCount = 0;
  let pendingCount = 0;
  let trattativaCount = 0;
  let confermataCount = 0;

  if (organizer) {
    const [venues, pending, trattativa, confermata] = await Promise.all([
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
    ]);
    venuesCount = venues?.count ?? 0;
    pendingCount = pending?.count ?? 0;
    trattativaCount = trattativa?.count ?? 0;
    confermataCount = confermata?.count ?? 0;
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
      href: "/organizzatore/profilo",
      label: "Profilo",
      icon: <UserCog className="size-4" />,
    },
  ];

  let storage: AppShellStorage | undefined;
  if (organizer) {
    const checks = [
      Boolean(organizer.avatar_url),
      Boolean(organizer.bio && organizer.bio.trim().length > 0),
      Boolean(organizer.phone),
      Boolean(organizer.website || organizer.instagram),
      venuesCount > 0,
    ];
    const filled = checks.filter(Boolean).length;
    const complete = filled === checks.length;
    const missing: string[] = [];
    if (!organizer.avatar_url) missing.push("foto profilo");
    if (!(organizer.bio && organizer.bio.trim().length > 0)) missing.push("bio");
    if (!organizer.phone) missing.push("telefono");
    if (!(organizer.website || organizer.instagram)) missing.push("sito o Instagram");
    if (venuesCount === 0) missing.push("una struttura");
    storage = {
      label: "Profilo completo",
      used: filled,
      total: checks.length,
      hint: complete
        ? "Profilo completo al 100%"
        : `Mancano: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""}`,
      ctaLabel: venuesCount === 0 ? "Aggiungi struttura" : "Completa profilo",
      ctaHref: venuesCount === 0 ? "/organizzatore/strutture/nuova" : "/organizzatore/profilo",
      variant: complete ? "default" : "accent",
    };
  }

  return { navSections, storage };
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
  try {
    ({ navSections, storage } = await loadOrganizerShell(user.id));
  } catch (err) {
    console.error("[AppShellData] loadOrganizerShell crashed:", err);
    navSections = defaultOrganizerNav();
    storage = undefined;
  }
  return (
    <AppShell
      brand={<ShellBrand suffix="Organizzatore" />}
      brandHref="/organizzatore"
      user={{
        name: user.name ?? null,
        email: user.email,
        role: "organizer",
        avatarUrl: user.avatarUrl ?? null,
      }}
      navSections={navSections}
      storage={storage}
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
  let profiles: ArtistProfilesContext;
  let planTier: ArtistTier | null;
  let artistCover: string | null;
  try {
    ({ navSections, storage, profiles, planTier, artistCover } = await loadArtistShell(user.id));
  } catch (err) {
    console.error("[AppShellData] loadArtistShell crashed:", err);
    navSections = defaultArtistNav();
    storage = undefined;
    profiles = { owned: [], activeId: null, canCreateMore: false };
    planTier = null;
    artistCover = null;
  }
  return (
    <AppShell
      brand={<ShellBrand suffix="Artista" />}
      brandHref="/dashboard"
      user={{
        name: user.name ?? null,
        email: user.email,
        role: "artist",
        // Il salvataggio del profilo propaga già la cover su profiles.avatar_url.
        // Questo ripiego copre gli account creati PRIMA di quella sincronizzazione,
        // che altrimenti resterebbero con l'iniziale finché non risalvano il
        // profilo — e lo fa senza scrivere nulla sul DB.
        avatarUrl: user.avatarUrl ?? artistCover,
      }}
      planTier={planTier ?? undefined}
      navSections={navSections}
      storage={storage}
      topbarSlot={
        <ArtistProfileSwitcher
          owned={profiles.owned}
          activeId={profiles.activeId}
          canCreateMore={profiles.canCreateMore}
        />
      }
    >
      {children}
    </AppShell>
  );
}
