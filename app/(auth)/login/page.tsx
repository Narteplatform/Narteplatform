import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/forms/LoginForm";
import { AuthSplit } from "@/components/layout/AuthSplit";
import { MESSAGGIO_ACCOUNT_CHIUSO, MESSAGGIO_ACCOUNT_SOSPESO } from "@/lib/auth/sospeso";

export const metadata = { title: "Accedi — N'arte" };

/**
 * `next` viene letto qui e non solo dentro il form: serve anche ai link del
 * selettore, altrimenti chi arriva da un profilo bloccato e passa a "Iscriviti"
 * perde la destinazione e finisce in home a registrazione fatta.
 * Solo percorsi interni: `//host` è un URL assoluto travestito.
 */
function safeNext(value?: string | string[]) {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith("/") && !v.startsWith("//") ? v : null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; sospeso?: string | string[]; chiuso?: string | string[]; errore?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const sospeso = params.sospeso === "1";
  const chiuso = params.chiuso === "1" && !sospeso;
  const erroreOauth = params.errore === "oauth";

  return (
    <AuthSplit
      active="login"
      next={next}
      eyebrow="accesso"
      title="Bentornato su N'arte"
      subtitle="Accedi per sbloccare i profili completi degli artisti, salvare i preferiti e seguire le tue richieste di booking."
      footer={
        <p className="text-sm text-muted-foreground">
          Sei un artista e vuoi entrare nel roster?{" "}
          <Link
            href="/candidatura-artista"
            className="font-semibold text-azzurro underline-offset-2 hover:underline"
          >
            Candidati qui
          </Link>
          .
        </p>
      }
    >
      {(sospeso || chiuso) && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-corallo/30 bg-corallo/10 px-4 py-3 text-sm"
        >
          {chiuso ? MESSAGGIO_ACCOUNT_CHIUSO : MESSAGGIO_ACCOUNT_SOSPESO}
        </p>
      )}
      {erroreOauth && !sospeso && !chiuso && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-corallo/30 bg-corallo/10 px-4 py-3 text-sm"
        >
          Accesso con Google non riuscito. Riprova o usa email e password.
        </p>
      )}
      {/* useSearchParams dentro al form richiede un confine di Suspense. */}
      <Suspense fallback={<div className="h-64" />}>
        <LoginForm />
      </Suspense>
    </AuthSplit>
  );
}
