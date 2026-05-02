import Link from "next/link";
import { Search, User, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/guards";

export async function Header() {
  const user = await getCurrentUser();
  const role = user?.profile?.role;
  const dashHref = role === "superadmin" ? "/admin" : role === "artist" ? "/dashboard" : "/artisti";
  const dashLabel = role === "superadmin" ? "Admin" : role === "artist" ? "Dashboard" : "Area Riservata";

  return (
    <header className="border-b border-border bg-background">
      <div className="container-narte flex h-20 items-center justify-between gap-6">
        <Link href="/" className="font-display text-xl leading-none" aria-label="Home N'arte">
          N&apos;AR<br />TE
        </Link>

        <div className="hidden flex-1 max-w-md items-center md:flex">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="cerca"
              className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
            />
          </div>
        </div>

        <nav className="hidden items-center gap-6 text-sm lg:flex">
          <Link href="/eventi" className="hover:underline">Eventi</Link>
          <Link href="/artisti" className="hover:underline">Artisti</Link>
          <Link href="/chi-siamo" className="hover:underline">Chi siamo</Link>
          <Link href="/collaborazioni" className="hover:underline">Collaborazioni</Link>
          <Link href="/contatti" className="hover:underline">Contatti</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link href="/candidatura-artista">Sei un artista?</Link>
          </Button>

          {!user ? (
            <>
              <Link href="/login" className="text-sm hover:underline">Accedi</Link>
              <Link href="/register" className="text-sm hover:underline">Registrati</Link>
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
