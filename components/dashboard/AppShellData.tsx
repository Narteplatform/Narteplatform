import {
  BarChart3,
  Building2,
  CalendarDays,
  Flag,
  MessageSquareQuote,
  Send,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Megaphone,
  MessageCircle,
  CreditCard,
  Phone,
  ScrollText,
  PencilLine,
  Settings,
  Shapes,
  ShieldCheck,
  Star,
  Tags,
  User,
  UserCog,
  UserX,
  Users,
} from "lucide-react";
import {
  getActiveConversationsCountSuperadmin,
  getUnreadCountForUser,
} from "@/lib/chat/queries";
import type { ReactNode } from "react";
import { leggiNonLette } from "@/lib/notifications";
import type { NotificheIniziali } from "@/lib/notifications/types";
import { logger } from "@/lib/logger";
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
import { getBookingsAwaitingFeedback } from "@/lib/feedback/queries";
import { contaOrganizzatoriInAttesa } from "@/lib/organizers/approvazione";
import { cookies } from "next/headers";
import { parseVisti, VISTI_COOKIE } from "@/lib/admin/visti";

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
      {/* `dark` = asset bianco reso senza filtri. La variante `light` applica
          la tinta azzurra pensata per i fondi chiari: da quando la sidebar è
          azzurra darebbe azzurro su azzurro. Il marchio compare solo qui —
          nella topbar il Breadcrumb mostra sempre la sezione corrente, mai il
          brand, perché dentro /admin, /dashboard e /organizzatore il percorso
          ha sempre almeno un segmento. */}
      <NarteLogo variant="dark" width={92} className="h-7 w-auto" />
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
  badgesAt: number;
}> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[AppShellData] createAdminClient failed:", err);
    const fallback = defaultAdminNav();
    return { navSections: fallback, bottomNav: fallback.slice(0, 5), badgesAt: Date.now() };
  }
  const today = todayIso();
  // Istante del calcolo dei badge: la sidebar lo confronta con il momento in
  // cui l'admin ha aperto una voce per sapere se il numero tiene già conto
  // della visita (vedi lib/admin/visti.ts).
  const badgesAt = Date.now();

  // Ultima apertura di ciascuna voce. I badge contano solo ciò che è arrivato
  // dopo; senza cookie (primo accesso, altro dispositivo) contano tutto.
  const visti = await safe(cookies()).then((c) => parseVisti(c?.get(VISTI_COOKIE)?.value));
  const dopo = <Q extends { gt: (col: string, v: string) => Q }>(q: Q, col: string, chiave: AdminPageKey): Q =>
    visti[chiave] ? q.gt(col, visti[chiave]) : q;

  const [
    upcomingEvents,
    pastEvents,
    pendingApplications,
    approvedArtists,
    newLeads,
    contactedLeads,
    closedLeads,
    pendingMediaSubmissions,
    pendingModerationVideos,
    pendingProfiles,
  ] = await Promise.all([
    safe(admin.from("events").select("id", { count: "exact", head: true }).gte("date", today)),
    safe(admin.from("events").select("id", { count: "exact", head: true }).lt("date", today)),
    safe(admin.from("artist_applications").select("id", { count: "exact", head: true }).eq("status", "pending")),
    safe(admin.from("artists").select("id", { count: "exact", head: true }).eq("status", "approved")),
    safe(admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "new").in("source", ["format", "contatti"])),
    safe(admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "contacted")),
    safe(admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "closed")),
    // Coda di moderazione media (0051): submission pending + video pending,
    // sommati nel badge di navigazione.
    safe(admin.from("artist_media_submissions").select("id", { count: "exact", head: true }).eq("status", "pending")),
    safe(admin.from("artist_videos").select("id", { count: "exact", head: true }).eq("moderation_state", "pending")),
    // Profili aggiuntivi (Pro/Max) creati dagli artisti: nascono `pending` e
    // non passano da artist_applications, quindi vanno contati a parte.
    safe(admin.from("artists").select("id", { count: "exact", head: true }).eq("status", "pending")),
  ]);

  // Badge «novità»: stessi filtri dei totali, limitati a dopo l'ultima apertura.
  const [
    nuoveCandidature,
    nuoviLead,
    nuoveChat,
    nuoveConsulenze,
    nuoveSubmission,
    nuoviVideo,
    nuoviProfili,
    nuoviProfiliModerazione,
  ] = await Promise.all([
    safe(dopo(admin.from("artist_applications").select("id", { count: "exact", head: true }).eq("status", "pending"), "created_at", "artisti")),
    safe(dopo(admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "new").in("source", ["format", "contatti"]), "created_at", "leads")),
    visti.chat
      ? safe(admin.from("conversations").select("id", { count: "exact", head: true }).gt("last_message_at", visti.chat))
      : safe(getActiveConversationsCountSuperadmin()).then((n) => ({ count: n ?? 0 })),
    safe(dopo(admin.from("consultations").select("id", { count: "exact", head: true }).in("status", ["requested", "confirmed"]), "created_at", "consulenza")),
    safe(dopo(admin.from("artist_media_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"), "created_at", "moderazione")),
    safe(dopo(admin.from("artist_videos").select("id", { count: "exact", head: true }).eq("moderation_state", "pending"), "created_at", "moderazione")),
    safe(dopo(admin.from("artists").select("id", { count: "exact", head: true }).eq("status", "pending"), "created_at", "artisti")),
    safe(dopo(admin.from("artists").select("id", { count: "exact", head: true }).eq("status", "pending"), "created_at", "moderazione")),
  ]);

  const c = (n: { count: number | null } | null) => n?.count ?? 0;
  const newLeadsCount = c(newLeads);
  const badgeCandidature = c(nuoveCandidature) + c(nuoviProfili);
  const badgeLead = c(nuoviLead);
  const badgeChat = c(nuoveChat);
  const badgeConsulenze = c(nuoveConsulenze);
  const badgeModerazione = c(nuoveSubmission) + c(nuoviVideo) + c(nuoviProfiliModerazione);
  const pendingConsultations = await safe(
    admin
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .in("status", ["requested", "confirmed"])
  ).then((v) => v?.count ?? 0);

  // Organizzatori in attesa di approvazione (0071). Errore o colonna assente = 0.
  const pendingOrganizers = await contaOrganizzatoriInAttesa();
  const badgeOrganizzatori = visti.utenti ? await contaOrganizzatoriInAttesa(visti.utenti) : pendingOrganizers;
  const badge = (n: number): NavSection["badge"] =>
    n > 0 ? { label: String(n), variant: "accent" } : undefined;

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
      seenKey: "artisti",
      badge: badge(badgeCandidature),
      children: [
        { href: "/admin/artisti?filter=pending", label: "In attesa", count: c(pendingApplications) + c(pendingProfiles) },
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
      seenKey: "leads",
      badge: badge(badgeLead),
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
      seenKey: "chat",
      badge: badge(badgeChat),
    },
    consulenza: {
      href: "/admin/consulenza",
      label: "Consulenza",
      icon: <Phone className="size-4" />,
      seenKey: "consulenza",
      badge: badge(badgeConsulenze),
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
    moderazione: {
      href: "/admin/moderazione",
      label: "Moderazione",
      icon: <ShieldCheck className="size-4" />,
      seenKey: "moderazione",
      badge: badge(badgeModerazione),
    },
    segnalazioni: {
      href: "/admin/segnalazioni",
      label: "Segnalazioni",
      icon: <Flag className="size-4" />,
    },
    recensioni: {
      href: "/admin/recensioni",
      label: "Recensioni",
      icon: <MessageSquareQuote className="size-4" />,
    },
    abbonamenti: {
      href: "/admin/abbonamenti",
      label: "Abbonamenti",
      icon: <CreditCard className="size-4" />,
    },
    proposte: {
      href: "/admin/proposte",
      label: "Proposte Max",
      icon: <Send className="size-4" />,
    },
    utenti: {
      href: "/admin/utenti",
      label: "Utenti",
      icon: <UserX className="size-4" />,
      seenKey: "utenti",
      badge: badge(badgeOrganizzatori),
      children:
        pendingOrganizers > 0
          ? [
              { href: "/admin/utenti", label: "Tutti" },
              {
                href: "/admin/utenti?filtro=organizzatori-in-attesa",
                label: "Organizzatori in attesa",
                count: pendingOrganizers,
              },
            ]
          : undefined,
    },
    registro: {
      href: "/admin/registro",
      label: "Registro",
      icon: <ScrollText className="size-4" />,
    },
    contenuti: {
      href: "/admin/contenuti",
      label: "Contenuti del sito",
      icon: <PencilLine className="size-4" />,
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
    "moderazione",
    "segnalazioni",
    "recensioni",
    "abbonamenti",
    "proposte",
    "utenti",
    "registro",
    "contenuti",
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

  return { navSections, bottomNav, badgesAt };
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

  // I video caricati vivono in un'altra tabella: senza questo conteggio il
  // completamento del profilo direbbe «carica almeno un video» a chi ne ha
  // già caricati tre.
  const uploadedVideosRes = activeArtist
    ? await safe(
        admin
          .from("artist_videos")
          .select("id", { count: "exact", head: true })
          .eq("artist_id", activeArtist.id)
      )
    : null;
  const uploadedVideoCount = uploadedVideosRes?.count ?? 0;

  // Le richieste arrivano al singolo profilo, ma il badge è dell'account: chi
  // ha più profili deve vedere le novità di TUTTI, non solo del profilo
  // attivo. Si contano le richieste di booking in attesa (il flusso attuale) e
  // i vecchi lead «new» (flusso precedente, ancora mostrato in pagina).
  const ownedIds = owned.map((o) => o.id);
  if (activeArtist && !ownedIds.includes(activeArtist.id)) ownedIds.push(activeArtist.id);

  let newLeads = 0;
  let negotiatingRequests = 0;
  let confirmedRequests = 0;

  if (ownedIds.length > 0) {
    const [bookingsPending, leadsNew, bookingsNegotiating, bookingsConfirmed] = await Promise.all([
      safe(
        admin
          .from("booking_requests")
          .select("id", { count: "exact", head: true })
          .in("artist_id", ownedIds)
          .eq("status", "pending")
      ),
      safe(
        admin
          .from("leads")
          .select("id", { count: "exact", head: true })
          .in("artist_id", ownedIds)
          .eq("status", "new")
      ),
      safe(
        admin
          .from("booking_requests")
          .select("id", { count: "exact", head: true })
          .in("artist_id", ownedIds)
          .in("status", ["in_trattativa", "accettata"])
      ),
      safe(
        admin
          .from("booking_requests")
          .select("id", { count: "exact", head: true })
          .in("artist_id", ownedIds)
          .eq("status", "confermata")
      ),
    ]);
    // Una query fallita conta zero: è solo un badge, non governa nessuna scrittura.
    if (bookingsPending?.error) logger.error("AppShellData", "booking pending:", bookingsPending.error.message);
    if (leadsNew?.error) logger.error("AppShellData", "leads new:", leadsNew.error.message);
    newLeads = (bookingsPending?.count ?? 0) + (leadsNew?.count ?? 0);
    negotiatingRequests = bookingsNegotiating?.count ?? 0;
    confirmedRequests = bookingsConfirmed?.count ?? 0;
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
        { href: "/dashboard/leads?status=pending", label: "Nuove", count: newLeads },
        { href: "/dashboard/leads?status=in_trattativa", label: "In trattativa", count: negotiatingRequests },
        { href: "/dashboard/leads?status=confermata", label: "Confermate", count: confirmedRequests },
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

  // Dalle aree riservate il Centro Assistenza non era raggiungibile: si usciva
  // sul sito pubblico e lo si cercava a mano.
  navSections.push(
    {
      href: "/dashboard/brand",
      label: "Kit brand",
      icon: <Megaphone className="size-4" />,
    },
    {
      href: "/help",
      label: "Aiuto",
      icon: <LifeBuoy className="size-4" />,
    }
  );

  let storage: AppShellStorage | undefined;
  if (artist) {
    const completion = computeProfileCompletion({
      ...(artist as unknown as ProfileCompletionSource),
      uploadedVideoCount,
    });
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
    artistCover:
      activeArtist?.cover_image ?? (artist as { cover_image?: string | null } | null)?.cover_image ?? null,
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
    { href: "/admin/moderazione", label: "Moderazione", icon: <ShieldCheck className="size-4" /> },
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
  let badgesAt: number | undefined;
  try {
    if (isConsultant) {
      ({ navSections, storage } = await loadConsultantShell(user.id));
      // Il consulente ha 3 sole voci: una barra in basso sarebbe un doppione
      // del cassetto.
      bottomNav = undefined;
    } else {
      const isRoot = isRootSuperadminEmail(user.email);
      const allowed = await getAllowedAdminPages(user.id, user.email);
      ({ navSections, bottomNav, badgesAt } = await loadAdminShell({ allowed, isRoot }));
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
      badgesAt={badgesAt}
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
  let daConfermareCount = 0;
  let confermataCount = 0;

  if (organizer) {
    const [venues, pending, trattativa, daConfermare, confermata] = await Promise.all([
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
      // Separate da «In trattativa»: ogni voce del menu conta esattamente ciò
      // che mostra la scheda a cui porta. Prima le accettate finivano nel
      // contatore di «In trattativa» ma non nella sua lista, che restava vuota.
      safe(
        admin
          .from("booking_requests")
          .select("id", { count: "exact", head: true })
          .eq("organizer_id", organizer.id)
          .eq("status", "accettata")
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
    daConfermareCount = daConfermare?.count ?? 0;
    confermataCount = confermata?.count ?? 0;
  }

  const unreadChatOrg = await safe(getUnreadCountForUser(userId, "organizer")).then((v) => v ?? 0);

  // Quante date passate aspettano ancora una recensione. È il numero che fa
  // scattare il pallino nel menu: senza, la pagina esiste ma nessuno ci entra.
  const feedbackDaLasciare = organizer
    ? await safe(getBookingsAwaitingFeedback(organizer.id)).then(
        (r) => r?.pending.length ?? 0
      )
    : 0;

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
      badge: pendingCount + trattativaCount + daConfermareCount > 0
        ? { label: String(pendingCount + trattativaCount + daConfermareCount), variant: "accent" }
        : undefined,
      children: [
        { href: "/organizzatore/richieste?status=pending", label: "In attesa", count: pendingCount },
        { href: "/organizzatore/richieste?status=in_trattativa", label: "In trattativa", count: trattativaCount },
        { href: "/organizzatore/richieste?status=accettata", label: "Da confermare", count: daConfermareCount },
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
      href: "/organizzatore/feedback",
      label: "Recensioni",
      icon: <Star className="size-4" />,
      badge: feedbackDaLasciare > 0
        ? { label: String(feedbackDaLasciare), variant: "accent" }
        : undefined,
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
    {
      href: "/organizzatore/brand",
      label: "Kit brand",
      icon: <Megaphone className="size-4" />,
    },
    {
      href: "/help",
      label: "Aiuto",
      icon: <LifeBuoy className="size-4" />,
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
    { href: "/organizzatore/feedback", label: "Recensioni", icon: <Star className="size-4" /> },
  ];
}

/** Notifiche della campanella; tabella mancante o errore = campanella vuota. */
async function caricaNotifiche(userId: string): Promise<NotificheIniziali> {
  const { items, count } = await leggiNonLette(userId);
  return { items, count };
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
  const notifications = await caricaNotifiche(user.id);
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
      notifications={notifications}
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
  const notifications = await caricaNotifiche(user.id);
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
        // Foto del profilo artista ATTIVO (artists.cover_image, aggiornata
        // dall'approvazione in Moderazioni). profiles.avatar_url è unico per
        // account e resta solo come ripiego.
        avatarUrl: artistCover ?? user.avatarUrl ?? null,
      }}
      planTier={planTier ?? undefined}
      navSections={navSections}
      storage={storage}
      notifications={notifications}
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
