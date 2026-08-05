import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";
import { AuthSplit } from "@/components/layout/AuthSplit";

export const metadata = { title: "Recupera la password — N'arte" };

export default function ForgotPasswordPage() {
  return (
    <AuthSplit
      active="login"
      showTabs={false}
      eyebrow="recupero"
      title="Hai dimenticato la password?"
      subtitle="Scrivi l'indirizzo con cui ti sei iscritto: ti mandiamo un link per sceglierne una nuova."
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-azzurro underline-offset-2 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Torna all&rsquo;accesso
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthSplit>
  );
}
