"use client";

import * as React from "react";
import { useWatch } from "react-hook-form";
import { Share2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { ProfileSection } from "@/components/dashboard/profile/ProfileSection";
import { Field, ProfileSectionForm } from "@/components/dashboard/profile/ProfileSectionForm";
import { useProfileSectionForm } from "@/components/dashboard/profile/useProfileSectionForm";
import {
  socialSectionSchema,
  toSocialPayload,
  SOCIAL_KEYS,
  type SocialSectionValues,
} from "@/lib/validators/artist-profile";
import { readLink, type ArtistProfileData } from "@/components/dashboard/profile/types";

const LABELS: Record<(typeof SOCIAL_KEYS)[number], { label: string; placeholder: string }> = {
  instagram: { label: "Instagram", placeholder: "@handle o link" },
  facebook: { label: "Facebook", placeholder: "link Facebook" },
  tiktok: { label: "TikTok", placeholder: "@handle o link" },
  youtube: { label: "YouTube", placeholder: "link canale YouTube" },
  spotify: { label: "Spotify", placeholder: "link Spotify" },
  website: { label: "Sito web", placeholder: "https://" },
};

export function SocialBlock({ artist }: { artist: ArtistProfileData }) {
  // Memoizzati: RHF confronta i valori correnti con questo oggetto per calcolare
  // isDirty, e ogni salvataggio altrove rigenera la pagina server rimontando i
  // blocchi. Ricrearli a ogni render falserebbe il dirty.
  const defaultValues = React.useMemo<SocialSectionValues>(
    () => ({
      instagram: readLink(artist.social_links, "instagram"),
      facebook: readLink(artist.social_links, "facebook"),
      tiktok: readLink(artist.social_links, "tiktok"),
      youtube: readLink(artist.social_links, "youtube"),
      spotify: readLink(artist.social_links, "spotify"),
      website: readLink(artist.social_links, "website"),
    }),
    [artist.social_links]
  );

  const { form, onSubmit, isDirty, isSubmitting, serverError } = useProfileSectionForm({
    artistId: artist.id,
    section: "social",
    schema: socialSectionSchema,
    defaultValues,
    toPayload: toSocialPayload,
    successMessage: "Social salvati",
  });

  const values = useWatch({ control: form.control });
  const connected = SOCIAL_KEYS.filter((k) => (values?.[k] ?? "").length > 0).length;

  return (
    <ProfileSection
      id="social"
      title="Social network"
      description="I profili collegati alla tua pagina pubblica"
      icon={<Share2 className="size-4" />}
      status={
        connected > 0
          ? { tone: "count", label: connected === 1 ? "1 collegato" : `${connected} collegati` }
          : { tone: "todo", label: "Da compilare" }
      }
      dirty={isDirty}
    >
      <ProfileSectionForm
        onSubmit={onSubmit}
        isDirty={isDirty}
        isSubmitting={isSubmitting}
        serverError={serverError}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {SOCIAL_KEYS.map((key) => (
            <Field
              key={key}
              label={LABELS[key].label}
              error={form.formState.errors[key]?.message}
            >
              <Input placeholder={LABELS[key].placeholder} {...form.register(key)} />
            </Field>
          ))}
        </div>
      </ProfileSectionForm>
    </ProfileSection>
  );
}
