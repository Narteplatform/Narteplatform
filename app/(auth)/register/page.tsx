import Link from "next/link";
import { RegisterForm } from "@/components/forms/RegisterForm";
import { AuthSplit } from "@/components/layout/AuthSplit";

export const metadata = { title: "Iscriviti — N'arte" };

/** Vedi la nota gemella in /login: solo percorsi interni. */
function safeNext(value?: string | string[]) {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith("/") && !v.startsWith("//") ? v : null;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = safeNext((await searchParams).next);

  return (
    <AuthSplit
      active="register"
      next={next}
      title="Crea il tuo account"
      subtitle="Bastano un'email e una password. Scegli come vuoi usare N'arte: puoi cambiare idea in qualunque momento scrivendoci."
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
