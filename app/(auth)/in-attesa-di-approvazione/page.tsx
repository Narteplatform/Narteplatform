import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { leggiStatoOrganizzatore } from "@/lib/organizers/approvazione";
import { TITOLARE } from "@/lib/legal/titolare";
import { NarteLogo } from "@/components/layout/NarteLogo";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Verifica dell'account — N'arte" };
export const dynamic = "force-dynamic";

/**
 * Pagina di attesa per gli organizzatori non ancora approvati.
 *
 * Sta fuori da `/organizzatore` di proposito: il layout di quell'area rimanda
 * qui chi non è approvato, quindi una pagina al suo interno si
 * rimanderebbe da sola all'infinito.
 */
export default async function InAttesaPage() {
  const user = await requireUser();
  if (user.profile?.role !== "organizer") redirect("/");
  const stato = await leggiStatoOrganizzatore(user.id);
  if (stato === "approved") redirect("/organizzatore");

  const rifiutato = stato === "rejected";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <NarteLogo />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 text-center md:p-8">
          <span
            className={`mx-auto inline-flex size-12 items-center justify-center rounded-full ${
              rifiutato ? "bg-corallo/10 text-corallo" : "bg-azzurro/10 text-azzurro"
            }`}
          >
            {rifiutato ? <XCircle className="size-6" /> : <Clock className="size-6" />}
          </span>
          {rifiutato ? (
            <>
              <h1 className="display-xl mt-4 text-2xl md:text-3xl">La richiesta non è stata approvata</h1>
              <p className="mt-3 text-muted-foreground">
                Il team non ha approvato l&rsquo;account organizzatore. Ti abbiamo scritto all&rsquo;indirizzo{" "}
                <strong className="text-foreground">{user.email}</strong> con il motivo e la possibilità di
                contestare la decisione. Per qualunque chiarimento scrivi a{" "}
                <a
                  href={`mailto:${TITOLARE.emailContatti}`}
                  className="font-semibold text-azzurro underline-offset-2 hover:underline"
                >
                  {TITOLARE.emailContatti}
                </a>
                .
              </p>
            </>
          ) : (
            <>
              <h1 className="display-xl mt-4 text-2xl md:text-3xl">Stiamo verificando il tuo account</h1>
              <p className="mt-3 text-muted-foreground">
                Ogni organizzatore viene controllato dal team prima di poter inviare richieste e usare chat e
                calendario. Ti scriviamo a breve all&rsquo;indirizzo{" "}
                <strong className="text-foreground">{user.email}</strong>: non serve fare altro.
              </p>
            </>
          )}
          <div className="mt-6 flex flex-col items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/artisti">Sfoglia gli artisti</Link>
            </Button>
            <form action="/logout" method="post">
              <button type="submit" className="text-sm text-muted-foreground underline underline-offset-4">
                Esci dall&rsquo;account
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
