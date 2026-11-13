import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { BenvenutoForm } from "@/components/forms/BenvenutoForm";
import { NarteLogo } from "@/components/layout/NarteLogo";
import { OrganizzatoreForm } from "./OrganizzatoreForm";
import { getGenreOptions } from "@/lib/content/generi";
import { invitoDaCookie } from "@/lib/inviti/cookie";

export const metadata = { title: "Benvenuto — N'arte" };
export const dynamic = "force-dynamic";

/**
 * Primo accesso (tipicamente con Google): chi ha un account semplice sceglie se
 * è un artista o ha bisogno di un artista. Gli altri ruoli non hanno nulla da
 * scegliere e vanno dove li porta /post-login.
 *
 * `?ruolo=organizer`: arriva da /auth/callback per chi si è iscritto con Google
 * dalla scheda organizzatore. La scelta è già fatta: si chiedono solo locale e
 * città, e SOLO a quel punto parte la richiesta al team. I consensi li ha già
 * raccolti il gate del middleware (/benvenuto non ne è esente).
 */
export default async function BenvenutoPage({
  searchParams,
}: {
  searchParams: Promise<{ ruolo?: string | string[] }>;
}) {
  const user = await requireUser();
  if (user.profile?.role !== "user") redirect("/post-login");
  const organizzatore = (await searchParams).ruolo === "organizer";
  // Per «Sono un artista»: il modulo di candidatura si compila qui, senza
  // passare dalla pagina lunga di /candidatura-artista.
  const [genreOptions, invito] = organizzatore
    ? [[], null]
    : await Promise.all([getGenreOptions(), invitoDaCookie()]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex justify-center">
          <NarteLogo />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 md:p-8">
          <p className="accent-label mb-3">benvenuto</p>
          <h1 className="display-xl text-3xl">Ci siamo quasi</h1>
          {organizzatore ? (
            <>
              <p className="mt-3 mb-6 text-muted-foreground">
                Dicci quale locale o realtà rappresenti e in che città: il team verifica la
                richiesta e ti scrive appena l&rsquo;account è attivo.
              </p>
              <OrganizzatoreForm />
            </>
          ) : (
            <>
              <p className="mt-3 mb-6 text-muted-foreground">
                Dicci come vuoi usare N&rsquo;arte, così ti portiamo nel posto giusto.
              </p>
              <BenvenutoForm
                candidatura={{
                  genreOptions,
                  invitatoDa: invito?.stageName ?? null,
                  nomeIniziale: user.profile?.full_name ?? "",
                  emailAccount: user.email ?? null,
                }}
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
