import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { BenvenutoForm } from "@/components/forms/BenvenutoForm";
import { NarteLogo } from "@/components/layout/NarteLogo";

export const metadata = { title: "Benvenuto — N'arte" };
export const dynamic = "force-dynamic";

/**
 * Primo accesso (tipicamente con Google): chi ha un account semplice sceglie se
 * è un artista o ha bisogno di un artista. Gli altri ruoli non hanno nulla da
 * scegliere e vanno dove li porta /post-login.
 */
export default async function BenvenutoPage() {
  const user = await requireUser();
  if (user.profile?.role !== "user") redirect("/post-login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex justify-center">
          <NarteLogo />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 md:p-8">
          <p className="accent-label mb-3">benvenuto</p>
          <h1 className="display-xl text-3xl">Ci siamo quasi</h1>
          <p className="mt-3 mb-6 text-muted-foreground">
            Dicci come vuoi usare N&rsquo;arte, così ti portiamo nel posto giusto.
          </p>
          <BenvenutoForm />
        </div>
      </div>
    </main>
  );
}
