import Link from "next/link";
import { Search, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/guards";

export async function Header() {
  const user = await getCurrentUser();
  const role = user?.profile?.role;

  return (
    <header className="border-b border-border bg-background">
      <div className="container-narte flex h-20 items-center justify-between gap-6">
        <Link href="/" className="font-display text-xl leading-none">
          HAP<br />PEEN
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
              <Link href="/login" className="text-sm hover:underline">sign in</Link>
              <Link href="/register" className="text-sm hover:underline">register</Link>
            </>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href={role === "superadmin" ? "/admin" : role === "artist" ? "/dashboard" : "/artisti"}>
                <User className="size-4" /> Area Riservata
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
