import Link from "next/link";
import { RegisterForm } from "@/components/forms/RegisterForm";
import { AuthSplit } from "@/components/layout/AuthSplit";
import { percorsoSicuro } from "@/lib/auth/percorso";

export const metadata = { title: "Iscriviti — N'arte" };

/** Vedi la nota gemella in /login: solo percorsi interni (lib/auth/percorso.ts). */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = percorsoSicuro((await searchParams).next);

  return (
    <AuthSplit
      active="register"
      next={next}
      eyebrow="iscrizione"
      title="Crea il tuo account"
      subtitle="Scegli come vuoi usare N'arte. Gli account degli organizzatori vengono verificati dal team prima dell'attivazione."
      footer={
        <p className="text-sm text-muted-foreground">
          Sei un artista?{" "}
          <Link
            href="/candidatura-artista"
            className="font-semibold text-azzurro underline-offset-2 hover:underline"
          >
            Candidati per entrare nel roster
          </Link>
          : il profilo artista non si crea da qui, passa da un'approvazione.
        </p>
      }
    >
      <RegisterForm next={next} />
    </AuthSplit>
  );
}
