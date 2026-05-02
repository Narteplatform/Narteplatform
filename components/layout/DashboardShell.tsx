"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SidebarItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  exact?: boolean;
};

type Props = {
  brand: string;
  brandHref?: string;
  items: SidebarItem[];
  email?: string | null;
  children: ReactNode;
};

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({ brand, brandHref = "/", items, email, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-foreground text-background lg:flex lg:flex-col">
        <SidebarContent
          brand={brand}
          brandHref={brandHref}
          items={items}
          email={email}
          pathname={pathname}
          onNavigate={() => {}}
        />
      </aside>

      {/* Sidebar mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Chiudi menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-foreground text-background">
            <SidebarContent
              brand={brand}
              brandHref={brandHref}
              items={items}
              email={email}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
          <Link href={brandHref} className="font-display text-lg">{brand}</Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Apri menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>
        </header>
        <main className="flex-1 px-6 py-8 lg:px-10 lg:py-12">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  brand,
  brandHref,
  items,
  email,
  pathname,
  onNavigate,
}: {
  brand: string;
  brandHref: string;
  items: SidebarItem[];
  email?: string | null;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-background/15 px-6">
        <Link href={brandHref} onClick={onNavigate} className="font-display text-lg leading-none">
          {brand}
        </Link>
        <button
          type="button"
          onClick={onNavigate}
          aria-label="Chiudi menu"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-background/70 hover:bg-background/10 lg:hidden"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                active
                  ? "bg-background text-foreground"
                  : "text-background/80 hover:bg-background/10 hover:text-background"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-background/15 p-4 text-xs text-background/70">
        {email && <p className="mb-2 truncate" title={email}>{email}</p>}
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="hover:underline" onClick={onNavigate}>
            ← Vai al sito
          </Link>
          <form action="/logout" method="post">
            <button type="submit" className="rounded-full border border-background/40 px-3 py-1 hover:bg-background hover:text-foreground">
              Esci
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
