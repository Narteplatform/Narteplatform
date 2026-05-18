"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, LogIn, UserPlus, User, LayoutDashboard, Sparkles } from "lucide-react";

type Props = {
  isLoggedIn: boolean;
  role?: "superadmin" | "artist" | "user" | "organizer" | null;
};

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/eventi", label: "Eventi" },
  { href: "/artisti", label: "Artisti" },
  { href: "/chi-siamo", label: "Chi siamo" },
  { href: "/collaborazioni", label: "Collaborazioni" },
  { href: "/contatti", label: "Contatti" },
  { href: "/faq", label: "F.A.Q." },
];

export function MobileMenu({ isLoggedIn, role }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const dashHref =
    role === "superadmin" ? "/admin" : role === "artist" ? "/dashboard" : "/artisti";
  const dashLabel =
    role === "superadmin"
      ? "Admin"
      : role === "artist"
      ? "Dashboard"
      : role === "organizer"
      ? "Area Organizzatore"
      : "Area Riservata";

  return (
    <>
      <button
        type="button"
        aria-label="Apri menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex size-10 items-center justify-center rounded-full border border-foreground/20 text-foreground transition-colors hover:border-foreground lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Chiudi menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col overflow-y-auto bg-background text-foreground shadow-2xl">
            <div className="flex h-20 shrink-0 items-center justify-between border-b border-border px-5">
              <span className="font-display text-base uppercase tracking-tight">Menu</span>
              <button
                type="button"
                aria-label="Chiudi menu"
                onClick={() => setOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav aria-label="Navigazione mobile" className="flex flex-col gap-1 px-5 py-6">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 font-display text-lg uppercase tracking-tight transition-colors hover:bg-muted"
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto border-t border-border px-5 py-6">
              {isLoggedIn ? (
                <div className="space-y-2">
                  <Link
                    href={dashHref}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl border border-border bg-muted px-4 py-3 text-sm font-medium hover:border-accent hover:text-accent"
                  >
                    {role === "superadmin" ? (
                      <LayoutDashboard className="size-4" />
                    ) : (
                      <User className="size-4" />
                    )}
                    {dashLabel}
                  </Link>
                  <form action="/logout" method="post">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:border-accent hover:text-accent"
                    >
                      Esci
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium hover:border-accent hover:text-accent"
                  >
                    <LogIn className="size-4" /> Accedi
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium hover:border-accent hover:text-accent"
                  >
                    <UserPlus className="size-4" /> Iscriviti
                  </Link>
                  <Link
                    href="/candidatura-artista"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90"
                  >
                    <Sparkles className="size-4" /> Sei un artista?
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
