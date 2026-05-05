import { RegisterForm } from "@/components/forms/RegisterForm";
import Link from "next/link";
import { NarteLogo } from "@/components/layout/NarteLogo";

export const metadata = { title: "Registrati — N'arte" };

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container-narte flex min-h-screen flex-col items-center justify-center py-12">
        <div className="w-full max-w-md">
          <Link href="/" aria-label="Home N'arte" className="inline-flex">
            <NarteLogo variant="light" width={140} className="h-11 w-auto" priority />
          </Link>
          <h1 className="display-xl mt-8 text-4xl">Iscriviti</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea il tuo account come <strong>utente</strong> per scoprire eventi e artisti, o
            come <strong>organizzatore</strong> per richiedere e ingaggiare artisti.
          </p>
          <div className="mt-8">
            <RegisterForm />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Hai gia&apos; un account?{" "}
            <Link href="/login" className="underline">
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
