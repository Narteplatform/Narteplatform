"use client";

import { KeyRound } from "lucide-react";
import { AccountSettingsForm } from "@/components/forms/AccountSettingsForm";
import { ProfileSection } from "@/components/dashboard/profile/ProfileSection";

/**
 * L'unico blocco che non usa useProfileSectionForm: AccountSettingsForm ha già
 * i propri <form> e le proprie Server Action (updateAccountProfile,
 * changePassword), e non tocca la tabella `artists`. Qui viene solo uniformato
 * visivamente agli altri blocchi.
 */
export function AccountBlock({
  email,
  fullName,
  avatarUrl,
}: {
  email: string;
  fullName: string;
  avatarUrl: string;
}) {
  return (
    <ProfileSection
      id="account"
      title="Account"
      description="Nome visualizzato, foto profilo e password"
      icon={<KeyRound className="size-4" />}
    >
      <AccountSettingsForm email={email} defaults={{ fullName, avatarUrl }} />
    </ProfileSection>
  );
}
