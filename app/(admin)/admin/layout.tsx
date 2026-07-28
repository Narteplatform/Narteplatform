import type { Metadata, Viewport } from "next";
import { requireRole } from "@/lib/auth/guards";
import { AdminAppShell } from "@/components/dashboard/AppShellData";
import type { Role } from "@/lib/supabase/types";

/**
 * PWA installabile limitata all'area admin: il manifest è collegato solo da
 * qui, quindi il sito pubblico resta un normale sito. Il cliente aggiunge
 * l'icona alla Home da una pagina /admin e l'app parte su /admin a schermo
 * intero.
 *
 * Il file NON può chiamarsi /admin.webmanifest: middleware.ts protegge tutto
 * ciò che inizia per "/admin" e lo redirigerebbe al login.
 *
 * `scope: "/"` nel manifest (non "/admin"): così "Vai al sito" e "Help Center"
 * della shell restano dentro l'app invece di aprire Safari.
 *
 * Nessun Service Worker: il kill-switch in app/layout.tsx ne disinstalla
 * qualsiasi a ogni caricamento, e su iOS il manifest basta per l'icona a
 * schermo intero. Su un gestionale di produzione una cache offline
 * mostrerebbe dati vecchi come se fossero attuali.
 */
export const metadata: Metadata = {
  title: "Admin — N'arte",
  manifest: "/narte-admin.webmanifest",
  appleWebApp: {
    capable: true,
    title: "N'arte Admin",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f5f2",
  // Con il notch, senza questo le safe-area-inset restano a 0.
  viewportFit: "cover",
};

// requireRole(["superadmin", "consultant"]) garantisce già, a runtime, che il
// ruolo sia uno di questi due (altrimenti reindirizza altrove): questo guard
// serve solo a restringere il tipo `Role` (5 valori) per AdminAppShell, senza
// alterare quale ruolo viene effettivamente passato.
function toAdminShellRole(role: Role | undefined): "superadmin" | "consultant" {
  return role === "consultant" ? "consultant" : "superadmin";
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["superadmin", "consultant"]);
  return (
    <AdminAppShell
      user={{
        id: user.id,
        email: user.email ?? "",
        name: user.profile?.full_name ?? null,
        avatarUrl: user.profile?.avatar_url ?? null,
        role: toAdminShellRole(user.profile?.role),
      }}
    >
      {children}
    </AdminAppShell>
  );
}
