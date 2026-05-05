import Link from "next/link";
import { LogIn, UserPlus, User, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/guards";
import { SearchBar } from "@/components/layout/SearchBar";
import { NarteLogo } from "@/components/layout/NarteLogo";

export async function Header() {
  const user = await getCurrentUser();
  const role = user?.profile?.role;
  const dashHref =
    role === "superadmin"
      ? "/admin"
      : role === "artist"
      ? "/dashboard"
      : "/artisti";
  const dashLabel =
    role === "superadmin"
      ? "Admin"
      : role === "artist"
      ? "Dashboard"
      : role === "organizer"
      ? "Organizzatore"
      : "Area Riservata";

  return (
    <header className="absolute inset-x-0 top-0 z-30 bg-transparent">
      <div className="container-narte flex h-20 items-center justify-between gap-4 md:gap-6">
        <Link
          href="/"
          aria-label="Home N'arte"
          className="flex shrink-0 items-center"
        >
          <NarteLogo variant="dark" width={110} priority className="h-9 w-auto md:h-10" />
        </Link>

        <div className="hidden flex-1 max-w-md items-center md:flex">
          <SearchBar />
        </div>

        <nav className="hidden items-center gap-6 text-sm text-foreground/80 lg:flex">
          <Link href="/eventi" className="hover:text-foreground">Eventi</Link>
          <Link href="/artisti" className="hover:text-foreground">Artisti</Link>
          <Link href="/chi-siamo" className="hover:text-foreground">Chi siamo</Link>
          <Link href="/collaborazioni" className="hover:text-foreground">Collaborazioni</Link>
          <Link href="/contatti" className="hover:text-foreground">Contatti</Link>
        </nav>

        <div className="flex items-center gap-2">
          {!user ? (
            <>
              {/* Desktop: testo + icona */}
              <Link
                href="/login"
                className="hidden items-center gap-1.5 rounded-full border border-foreground/20 px-3.5 py-1.5 text-sm text-foreground/90 transition-colors hover:border-foreground hover:text-foreground sm:inline-flex"
              >
                <LogIn className="size-4" />
                Accedi
              </Link>
              <Link
                href="/register"
                className="hidden items-center gap-1.5 rounded-full border border-foreground/20 px-3.5 py-1.5 text-sm text-foreground/90 transition-colors hover:border-foreground hover:text-foreground sm:inline-flex"
              >
                <UserPlus className="size-4" />
                Iscriviti
              </Link>

              {/* Mobile: solo icone */}
              <Link
                href="/login"
                aria-label="Accedi"
                className="inline-flex size-9 items-center justify-center rounded-full border border-foreground/20 text-foreground/90 transition-colors hover:border-foreground hover:text-foreground sm:hidden"
              >
                <LogIn className="size-4" />
              </Link>
              <Link
                href="/register"
                aria-label="Iscriviti"
                className="inline-flex size-9 items-center justify-center rounded-full border border-foreground/20 text-foreground/90 transition-colors hover:border-foreground hover:text-foreground sm:hidden"
              >
                <UserPlus className="size-4" />
              </Link>

              <Button asChild variant="accent" size="sm" className="hidden rounded-full sm:inline-flex">
                <Link href="/candidatura-artista">Sei un artista?</Link>
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="default" size="sm" className="rounded-full">
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
                  className="rounded-full"
                >
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">Esci</span>
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
