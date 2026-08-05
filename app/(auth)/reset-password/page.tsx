import { ResetPasswordForm } from "@/components/forms/ResetPasswordForm";
import { AuthSplit } from "@/components/layout/AuthSplit";

export const metadata = {
  title: "Nuova password — N'arte",
  // La pagina si apre da un link con token nel frammento: non deve finire
  // negli indici dei motori di ricerca.
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthSplit
      active="login"
      showTabs={false}
      eyebrow="nuova password"
      title="Scegli una nuova password"
      subtitle="Ultimo passo: imposta la password con cui entrerai da adesso in poi."
    >
      <ResetPasswordForm />
    </AuthSplit>
  );
}
