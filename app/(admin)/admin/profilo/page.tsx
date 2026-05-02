import { requireRole } from "@/lib/auth/guards";
import { AccountSettingsForm } from "@/components/forms/AccountSettingsForm";

export const metadata = { title: "Profilo — N'arte Admin" };

export default async function AdminProfiloPage() {
  const user = await requireRole("superadmin");
  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-xl text-4xl">Profilo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aggiorna i dati del tuo account amministratore.
        </p>
      </div>
      <AccountSettingsForm
        email={user.email ?? ""}
        defaults={{
          fullName: user.profile?.full_name ?? "",
          avatarUrl: user.profile?.avatar_url ?? "",
        }}
      />
    </div>
  );
}
