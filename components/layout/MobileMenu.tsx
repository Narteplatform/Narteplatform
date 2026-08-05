"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X, LogIn, UserPlus, User, LayoutDashboard, Sparkles, LogOut } from "lucide-react";

type Props = {
  isLoggedIn: boolean;
  role?: "superadmin" | "artist" | "user" | "organizer" | "consultant" | null;
};

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/eventi", label: "Eventi" },
  { href: "/artisti", label: "Artisti" },
  { href: "/format", label: "Format" },
  { href: "/blog", label: "Blog" },
  { href: "/help", label: "Centro Assistenza" },
  { href: "/chi-siamo", label: "Chi siamo" },
  { href: "/collaborazioni", label: "Collaborazioni" },
  { href: "/contatti", label: "Contatti" },
];

/** Curva di uscita del design system: rapida all'inizio, morbida in chiusura. */
const EASE = [0.22, 1, 0.36, 1] as const;

export function MobileMenu({ isLoggedIn, role }: Props) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

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
    role === "superadmin"
      ? "/admin"
      : role === "artist"
      ? "/dashboard"
      : role === "organizer"
      ? "/organizzatore"
      : role === "consultant"
      ? "/admin"
      : "/artisti";
  const dashLabel =
    role === "superadmin"
      ? "Admin"
      : role === "artist"
      ? "Dashboard"
      : role === "organizer"
      ? "Area Organizzatore"
      : role === "consultant"
      ? "Consulenza"
      : "Area Riservata";

  // Con `prefers-reduced-motion` il pannello non scorre: compare e basta.
  // Nascondere del tutto la transizione è preferibile a rallentarla — chi
  // attiva quell'impostazione lo fa spesso per motivi vestibolari.
  const panelMotion = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { x: "100%" },
        animate: { x: 0 },
        exit: { x: "100%" },
        transition: { duration: 0.42, ease: EASE },
      };

  /** Le voci entrano a cascata dietro il pannello, non insieme a lui. */
  const itemMotion = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, x: 24 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.35, ease: EASE, delay: 0.12 + i * 0.035 },
        };

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

      {/* AnimatePresence tiene in vita il pannello finché l'uscita non è
          finita: senza, alla chiusura sparirebbe di colpo e l'animazione si
          vedrebbe solo in apertura. */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[200] lg:hidden" role="dialog" aria-modal="true">
            <motion.button
              type="button"
              aria-label="Chiudi menu"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.aside
              {...panelMotion}
              className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col overflow-y-auto bg-background text-foreground shadow-2xl"
            >
              {/* TESTATA. L'etichetta usa lo stesso trattamento delle
                  micro-label del sito (maiuscoletto spaziato azzurro) invece di
                  un "Menu" in carattere display, che a quella dimensione
                  sembrava un titolo di sezione lasciato lì per sbaglio. */}
              <div className="flex h-20 shrink-0 items-center justify-between border-b border-border px-5">
                <span className="accent-label">menu</span>
                <button
                  type="button"
                  aria-label="Chiudi menu"
                  onClick={() => setOpen(false)}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>

              <nav aria-label="Navigazione mobile" className="flex flex-col gap-0.5 px-5 py-6">
                {NAV_LINKS.map((l, i) => (
                  <motion.div key={l.href} {...itemMotion(i)}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-3 py-3 font-display text-lg transition-colors hover:bg-muted"
                    >
                      {l.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              {/* AZIONI. Accedi e Iscriviti stanno appaiate: sono due varianti
                  della stessa cosa e in colonna facevano tre righe identiche in
                  cui la CTA vera si perdeva. Quella resta a tutta larghezza e in
                  arancio — `bg-corallo` come il pulsante del desktop, non
                  `bg-accent`, che nel tema scuro del sito pubblico è azzurro. */}
              <div className="mt-auto border-t border-border px-5 py-6">
                {isLoggedIn ? (
                  <div className="space-y-2">
                    <Link
                      href={dashHref}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-azzurro px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-azzurro-dark"
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
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:border-foreground"
                      >
                        <LogOut className="size-4" /> Esci
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/login"
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-medium transition-colors hover:border-foreground"
                      >
                        <LogIn className="size-4" /> Accedi
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-medium transition-colors hover:border-foreground"
                      >
                        <UserPlus className="size-4" /> Iscriviti
                      </Link>
                    </div>
                    <Link
                      href="/candidatura-artista"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-corallo px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-corallo-dark"
                    >
                      <Sparkles className="size-4" /> Sei un artista?
                    </Link>
                  </div>
                )}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
