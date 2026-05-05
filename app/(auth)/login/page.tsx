import { Suspense } from "react";
import { LoginForm } from "@/components/forms/LoginForm";
import Link from "next/link";
import { NarteLogo } from "@/components/layout/NarteLogo";

export const metadata = { title: "Accedi — N'arte" };

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container-narte flex min-h-screen flex-col items-center justify-center py-12">
        <div className="w-full max-w-md">
          <Link href="/" aria-label="Home N'arte" className="inline-flex">
            <NarteLogo variant="light" width={140} className="h-11 w-auto" priority />
          </Link>
          <h1 className="display-xl mt-8 text-4xl">Accedi / Iscriviti</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hai già un account? Accedi qui sotto. Altrimenti{" "}
            <Link href="/register" className="underline">
              iscriviti
            </Link>{" "}
            come utente o organizzatore.
          </p>
          <div className="mt-8">
            <Suspense fallback={<div className="h-32" />}>
              <LoginForm />
            </Suspense>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Non hai un account?{" "}
            <Link href="/register" className="underline">
              Registrati
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
