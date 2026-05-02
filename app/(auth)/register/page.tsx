import { RegisterForm } from "@/components/forms/RegisterForm";
import Link from "next/link";

export const metadata = { title: "Registrati — N'arte" };

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container-narte flex min-h-screen flex-col items-center justify-center py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="font-display text-xl">
            HAP<br />PEEN
          </Link>
          <h1 className="display-xl mt-8 text-4xl">Registrati</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea il tuo account per scoprire e ingaggiare artisti.
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
