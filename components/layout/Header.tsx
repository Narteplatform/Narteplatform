import Link from "next/link";
import { User, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/guards";
import { SearchBar } from "@/components/layout/SearchBar";

export async function Header() {
  const user = await getCurrentUser();
  const role = user?.profile?.role;
  const dashHref = role === "superadmin" ? "/admin" : role === "artist" ? "/dashboard" : "/artisti";
  const dashLabel = role === "superadmin" ? "Admin" : role === "artist" ? "Dashboard" : "Area Riservata";

  return (
    <header className="absolute inset-x-0 top-0 z-30 bg-transparent">
      <div className="container-narte flex h-20 items-center justify-between gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-xl leading-none"
          aria-label="Home N'arte"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground font-display text-sm">
            N
          </span>
          <span className="text-foreground">N&apos;arte</span>
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

        <div className="flex items-center gap-3">
          {!user ? (
            <>
              <Link
                href="/login"
                className="hidden text-sm text-foreground/80 hover:text-foreground sm:inline"
              >
                Accedi
              </Link>
              <Button asChild variant="accent" size="sm" className="rounded-full">
                <Link href="/candidatura-artista">Diventa artista</Link>
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
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
                <Button type="submit" variant="ghost" size="sm" className="text-sm">
                  Esci
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
