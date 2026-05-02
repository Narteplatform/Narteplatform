import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("superadmin");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-foreground text-background">
        <div className="container-narte flex h-16 items-center justify-between">
          <Link href="/" className="font-display text-lg">
            N&apos;ARTE / ADMIN
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/admin" className="hover:underline">Overview</Link>
            <Link href="/admin/eventi" className="hover:underline">Eventi</Link>
            <Link href="/admin/artisti" className="hover:underline">Artisti</Link>
            <Link href="/admin/leads" className="hover:underline">Lead</Link>
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
