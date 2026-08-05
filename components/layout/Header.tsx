import Link from "next/link";
import { LogIn, UserPlus, User, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/guards";
import { SearchMenu } from "@/components/layout/SearchMenu";
import { NarteLogo } from "@/components/layout/NarteLogo";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { FavoritesMenu } from "@/components/layout/FavoritesMenu";

export async function Header() {
  const user = await getCurrentUser();
  const role = user?.profile?.role;
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
      ? "Organizzatore"
      : role === "consultant"
      ? "Consulenza"
      : "Area Riservata";

  return (
    <header className="absolute inset-x-0 top-0 z-50 bg-transparent">
      <div className="container-narte flex h-20 items-center justify-between gap-3 md:gap-6">
        <Link
          href="/"
          aria-label="Home N'Arte"
          className="flex shrink-0 items-center"
        >
          <NarteLogo variant="dark" width={110} priority className="h-7 w-auto md:h-8" />
        </Link>

        {/* Tutto ciò che non è il logo vive in un unico gruppo allineato a
            destra: menu, poi ricerca, poi le azioni. Così la ricerca sta dopo
            "Contatti" senza fare da distanziatore come faceva prima a sinistra. */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 md:gap-6">
          {/* shrink-0 + nowrap: le voci di due parole ("Chi siamo") non devono
              andare a capo quando la barra si stringe. */}
          <nav className="hidden shrink-0 items-center gap-6 whitespace-nowrap text-sm font-medium text-foreground/85 lg:flex">
            <Link href="/eventi" className="transition-opacity hover:opacity-75">Eventi</Link>
            <Link href="/artisti" className="transition-opacity hover:opacity-75">Artisti</Link>
            <Link href="/format" className="transition-opacity hover:opacity-75">Format</Link>
            <Link href="/blog" className="transition-opacity hover:opacity-75">Blog</Link>
            <Link href="/help" className="transition-opacity hover:opacity-75">Aiuto</Link>
            <Link href="/chi-siamo" className="transition-opacity hover:opacity-75">Chi siamo</Link>
            <Link href="/collaborazioni" className="transition-opacity hover:opacity-75">Collaborazioni</Link>
            <Link href="/contatti" className="transition-opacity hover:opacity-75">Contatti</Link>
          </nav>

          {/* Lente e cuore sono due bottoni tondi identici e vanno letti come
              una coppia: stanno insieme a gap-2, e il gap del gruppo esterno
              (24px da md) li distanzia allo stesso modo dalle voci di menu a
              sinistra e dai pulsanti di accesso a destra. Prima la lente stava
              a 24px dal cuore e il cuore a 8px da "Accedi": sembravano
              appartenere a due gruppi diversi. */}
          <div className="flex shrink-0 items-center gap-2">
            <SearchMenu />
            <FavoritesMenu />
          </div>

          <div className="flex items-center gap-2">
            {!user ? (
              <>
                {/* Desktop auth */}
                <Link
                  href="/login"
                  className="hidden items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-3.5 py-1.5 text-sm text-foreground transition-colors hover:border-azzurro hover:text-azzurro sm:inline-flex"
                >
                  <LogIn className="size-4" />
                  Accedi
                </Link>
                <Link
                  href="/register"
                  className="hidden items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-3.5 py-1.5 text-sm text-foreground transition-colors hover:border-azzurro hover:text-azzurro sm:inline-flex"
                >
                  <UserPlus className="size-4" />
                  Iscriviti
                </Link>
                <Button asChild variant="accent" size="sm" className="hidden sm:inline-flex">
                  <Link href="/candidatura-artista">Sei un artista?</Link>
                </Button>
              </>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Button asChild variant="default" size="sm">
                  <Link href={dashHref} title={user.email ?? undefined}>
                    {role === "superadmin" ? (
                      <LayoutDashboard className="size-4" />
                    ) : (
                      <User className="size-4" />
                    )}
                    <span className="hidden sm:inline">{dashLabel}</span>
                  </Link>
                </Button>
                <form action="/logout" method="post">
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    aria-label="Esci"
                  >
                    <LogOut className="size-4" />
                    <span className="hidden sm:inline">Esci</span>
                  </Button>
                </form>
              </div>
            )}

            {/* Burger sotto lg */}
            <MobileMenu
              isLoggedIn={!!user}
              role={(role as "superadmin" | "artist" | "user" | "organizer" | "consultant" | undefined) ?? null}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
