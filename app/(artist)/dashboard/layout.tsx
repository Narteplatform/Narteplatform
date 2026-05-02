import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";

export default async function ArtistDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["artist", "superadmin"]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-foreground text-background">
        <div className="container-narte flex h-16 items-center justify-between">
          <Link href="/" className="font-display text-lg">
            N&apos;ARTE / ARTIST
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="hover:underline">Profilo</Link>
            <Link href="/dashboard/calendario" className="hover:underline">Calendario</Link>
            <Link href="/dashboard/leads" className="hover:underline">Richieste</Link>
            <span className="opacity-60">{user.email}</span>
            <form action="/logout" method="post">
              <button type="submit" className="hover:underline">Esci</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="container-narte py-12">{children}</main>
    </div>
  );
}
