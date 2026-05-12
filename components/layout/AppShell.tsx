"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ChevronDown,
  ChevronLeft,
  HelpCircle,
  LogOut,
  MessageCircle,
  Menu,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type NavSubItem = {
  href: string;
  label: string;
  count?: number | null;
};

export type NavSection = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  badge?: { label: string; variant?: "accent" | "default" };
  children?: NavSubItem[];
};

export type AppShellUser = {
  name?: string | null;
  email: string;
  role: "superadmin" | "artist" | "user" | "organizer";
  avatarUrl?: string | null;
};

export type AppShellStorage = {
  label: string;
  used: number;
  total: number;
  hint?: string;
  ctaLabel: string;
  ctaHref: string;
  variant?: "default" | "accent";
};

export type AppShellRecent = {
  src?: string | null;
  name?: string | null;
};

export interface AppShellProps {
  brand: React.ReactNode;
  brandHref: string;
  user: AppShellUser;
  navSections: NavSection[];
  storage?: AppShellStorage;
  recentActivity?: AppShellRecent[];
  whatsNewHref?: string;
  children: React.ReactNode;
}

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isSectionActive(pathname: string, section: NavSection): boolean {
  if (isActive(pathname, section.href, section.exact)) return true;
  return Boolean(
    section.children?.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`))
  );
}

const numberFormatter = new Intl.NumberFormat("it-IT");

export function AppShell({
  brand,
  brandHref,
  user,
  navSections,
  storage,
  recentActivity,
  whatsNewHref,
  children,
}: AppShellProps) {
  const pathname = usePathname() ?? "/";
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const sidebar = (
    <SidebarContent
      brand={brand}
      brandHref={brandHref}
      user={user}
      navSections={navSections}
      pathname={pathname}
      storage={storage}
      onNavigate={() => setDrawerOpen(false)}
    />
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-72 shrink-0 border-r border-border bg-background lg:flex lg:flex-col">
        {sidebar}
      </aside>

      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 lg:hidden" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-sm flex-col bg-background shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left lg:hidden"
          >
            <Dialog.Title className="sr-only">Menu di navigazione</Dialog.Title>
            {sidebar}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Apri menu"
              className="inline-flex size-9 items-center justify-center rounded-full border border-border hover:bg-muted lg:hidden"
            >
              <Menu className="size-4" />
            </button>
            <Breadcrumb pathname={pathname} brand={brand} />
          </div>

          <div className="flex items-center gap-3">
            {recentActivity && recentActivity.length > 0 && (
              <div className="hidden items-center gap-2 md:flex">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Attività
                </span>
                <AvatarStack
                  items={recentActivity.map((r) => ({ src: r.src, name: r.name }))}
                  size="xs"
                  max={4}
                />
              </div>
            )}
            {whatsNewHref && (
              <Button asChild variant="outline" size="sm">
                <Link href={whatsNewHref}>
                  <Sparkles className="size-3.5" /> Novità
                </Link>
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-5 py-6 lg:px-10 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Breadcrumb({ pathname, brand }: { pathname: string; brand: React.ReactNode }) {
  const segments = pathname.split("/").filter(Boolean);
  const items: { label: string; href: string }[] = [];
  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    items.push({ label: prettifySegment(seg), href: acc });
  }
  if (items.length === 0) {
    return <span className="font-display text-sm">{brand}</span>;
  }
  const parent = items[items.length - 2];
  const current = items[items.length - 1];
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
      {parent ? (
        <Link
          href={parent.href}
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Torna indietro"
        >
          <ChevronLeft className="size-4" />
        </Link>
      ) : null}
      <span className="truncate font-display text-base">{current.label}</span>
    </nav>
  );
}

function prettifySegment(seg: string): string {
  const map: Record<string, string> = {
    admin: "Admin",
    dashboard: "Dashboard",
    artisti: "Artisti",
    eventi: "Eventi",
    leads: "Lead",
    generi: "Generi",
    messaggi: "Messaggi",
    profilo: "Profilo",
    calendario: "Calendario",
    new: "Nuovo",
  };
  return map[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
}

function SidebarContent({
  brand,
  brandHref,
  user,
  navSections,
  pathname,
  storage,
  onNavigate,
}: {
  brand: React.ReactNode;
  brandHref: string;
  user: AppShellUser;
  navSections: NavSection[];
  pathname: string;
  storage?: AppShellStorage;
  onNavigate: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
        <Link
          href={brandHref}
          onClick={onNavigate}
          className="font-display text-base leading-none tracking-tight"
        >
          {brand}
        </Link>
        <button
          type="button"
          aria-label="Chiudi menu"
          onClick={onNavigate}
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted lg:hidden"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-4 pt-4">
        <SearchInput placeholder="Cerca…" variant="sidebar" />
      </div>

      <nav aria-label="Sidebar principale" className="flex-1 overflow-y-auto px-3 py-4 narte-scrollbar">
        <ul className="flex flex-col gap-1">
          {navSections.map((section) => (
            <NavItem
              key={section.href}
              section={section}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>

      {storage && (
        <div className="hidden px-4 pb-3 md:block">
          <StorageBlock storage={storage} onNavigate={onNavigate} />
        </div>
      )}

      <div className="mt-auto border-t border-border">
        <div className="flex flex-col gap-1 px-3 py-3 text-sm">
          <Link
            href="mailto:boostcreativeai@gmail.com?subject=Feedback%20N%27arte"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MessageCircle className="size-4" /> Feedback
          </Link>
          <Link
            href="/contatti"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HelpCircle className="size-4" /> Help Center
          </Link>
        </div>
        <UserCard user={user} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function NavItem({
  section,
  pathname,
  onNavigate,
}: {
  section: NavSection;
  pathname: string;
  onNavigate: () => void;
}) {
  const sectionActive = isSectionActive(pathname, section);
  const hasChildren = (section.children?.length ?? 0) > 0;
  const [open, setOpen] = React.useState<boolean>(sectionActive);

  React.useEffect(() => {
    if (sectionActive) setOpen(true);
  }, [sectionActive]);

  const linkActive = isActive(pathname, section.href, section.exact);

  return (
    <li>
      <div className="relative">
        {linkActive && (
          <span aria-hidden="true" className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />
        )}
        <div className="flex items-center">
          <Link
            href={section.href}
            onClick={() => {
              if (hasChildren) setOpen(true);
              onNavigate();
            }}
            className={cn(
              "flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-sm transition",
              linkActive
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span className="flex size-5 shrink-0 items-center justify-center text-foreground/70">
              {section.icon}
            </span>
            <span className="flex-1 truncate">{section.label}</span>
            {section.badge && (
              <span
                className={cn(
                  "ml-auto inline-flex h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold uppercase tracking-wide",
                  section.badge.variant === "accent"
                    ? "bg-accent text-accent-foreground"
                    : "bg-foreground text-background"
                )}
              >
                {section.badge.label}
              </span>
            )}
          </Link>
          {hasChildren && (
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? `Comprimi ${section.label}` : `Espandi ${section.label}`}
              onClick={() => setOpen((v) => !v)}
              className="ml-1 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronDown
                className={cn("size-4 transition-transform", open && "rotate-180")}
              />
            </button>
          )}
        </div>
      </div>

      {hasChildren && open && (
        <ul className="ml-8 mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
          {section.children!.map((child) => {
            const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] transition",
                    childActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="truncate">{child.label}</span>
                  {typeof child.count === "number" && (
                    <span className="ml-2 tabular-nums text-muted-foreground">
                      {numberFormatter.format(child.count)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function StorageBlock({
  storage,
  onNavigate,
}: {
  storage: AppShellStorage;
  onNavigate: () => void;
}) {
  const pct = storage.total > 0 ? (storage.used / storage.total) * 100 : 0;
  return (
    <div className="rounded-2xl border border-border bg-muted p-4">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-foreground">{storage.label}</span>
        <span className="text-muted-foreground tabular-nums">{Math.round(pct)}%</span>
      </div>
      <div className="mt-2">
        <Progress value={storage.used} max={storage.total} variant={storage.variant} />
      </div>
      {storage.hint && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{storage.hint}</p>
      )}
      <Button asChild variant="default" size="sm" className="mt-3 w-full">
        <Link href={storage.ctaHref} onClick={onNavigate}>
          {storage.ctaLabel}
        </Link>
      </Button>
    </div>
  );
}

function UserCard({ user, onNavigate }: { user: AppShellUser; onNavigate: () => void }) {
  const roleLabel =
    user.role === "superadmin"
      ? "Superadmin"
      : user.role === "artist"
        ? "Artista"
        : user.role === "organizer"
          ? "Organizzatore"
          : "Utente";
  const profileHref =
    user.role === "artist"
      ? "/dashboard/profilo"
      : user.role === "organizer"
        ? "/organizzatore/profilo"
        : "/admin/profilo";
  return (
    <div className="border-t border-border p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-muted"
          >
            <Avatar src={user.avatarUrl} name={user.name ?? user.email} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {user.name || user.email}
              </span>
              <span className="block truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                {roleLabel}
              </span>
            </span>
            <Settings className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56">
          <div className="px-3 py-2 text-xs text-muted-foreground">{user.email}</div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={profileHref} onClick={onNavigate}>
              <Settings className="size-4" /> Profilo
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/" onClick={onNavigate}>
              <ChevronLeft className="size-4" /> Vai al sito
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <form action="/logout" method="post" className="w-full">
              <button type="submit" className="flex w-full items-center gap-2 text-left">
                <LogOut className="size-4" /> Esci
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
