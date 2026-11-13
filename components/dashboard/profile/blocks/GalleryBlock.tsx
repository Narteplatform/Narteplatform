"use client";

import * as React from "react";
import { Controller, useWatch } from "react-hook-form";
import { Images } from "lucide-react";
import { GalleryUpload } from "@/components/forms/GalleryUpload";
import { ProfileSection } from "@/components/dashboard/profile/ProfileSection";
import { ProfileSectionForm } from "@/components/dashboard/profile/ProfileSectionForm";
import { useProfileSectionForm } from "@/components/dashboard/profile/useProfileSectionForm";
import { useDirittiContenuti } from "@/components/dashboard/profile/DirittiContenuti";
import { PendingMediaNotice } from "@/components/dashboard/PendingMediaNotice";
import { PendingMediaThumbs } from "@/components/dashboard/PendingMediaThumbs";
import {
  gallerySectionSchema,
  toGalleryPayload,
  type GallerySectionValues,
} from "@/lib/validators/artist-profile";
import type { ArtistProfileData, MediaSubmissionNotice } from "@/components/dashboard/profile/types";
import { entitlementsFor, isUnlimited, PLAN_LABELS } from "@/lib/billing/plans";

export function GalleryBlock({
  artist,
  pendingMedia = [],
}: {
  artist: ArtistProfileData;
  /** Foto in attesa di approvazione o rifiutate, dalla coda di moderazione. */
  pendingMedia?: MediaSubmissionNotice[];
}) {
  const defaultValues = React.useMemo<GallerySectionValues>(
    () => ({ gallery: artist.gallery ?? [] }),
    [artist.gallery]
  );

  const { form, onSubmit, isDirty, isSubmitting, serverError } = useProfileSectionForm({
    artistId: artist.id,
    section: "gallery",
    schema: gallerySectionSchema,
    defaultValues,
    toPayload: toGalleryPayload,
    successMessage: "Galleria salvata",
  });

  const diritti = useDirittiContenuti();
  const gallery = useWatch({ control: form.control, name: "gallery" }) ?? [];
  // Tetto del piano attuale: sul profilo pubblico si vedono solo le prime
  // `tetto` foto (soft cap in lettura). Le altre restano qui, non cancellate.
  const piano = artist.tier ?? "free";
  const tetto = entitlementsFor(piano).galleryMax;
  const conTetto = !isUnlimited(tetto);
  const oltre = conTetto ? Math.max(gallery.length - tetto, 0) : 0;

  return (
    <ProfileSection
      id="gallery"
      title="Galleria foto"
      description="Gli scatti che accompagnano il tuo profilo"
      icon={<Images className="size-4" />}
      status={
        gallery.length > 0
          ? {
              tone: "count",
              label: conTetto
                ? `${gallery.length} di ${tetto} foto`
                : gallery.length === 1
                  ? "1 foto"
                  : `${gallery.length} foto`,
            }
          : { tone: "todo", label: "Nessuna foto" }
      }
      dirty={isDirty}
    >
      <PendingMediaNotice items={pendingMedia} />
      {oltre > 0 && (
        <p role="status" className="mb-3 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {oltre === 1
            ? `L'ultima foto (la ${tetto + 1}ª) non è visibile sul profilo pubblico: `
            : `Le ultime ${oltre} foto (dalla ${tetto + 1}ª in poi) non sono visibili sul profilo pubblico: `}
          il piano {PLAN_LABELS[piano]} ne mostra {tetto}. Non sono cancellate e tornano visibili con un
          piano che le include, oppure se ne rimuovi altre.
        </p>
      )}
      <ProfileSectionForm
        onSubmit={onSubmit}
        isDirty={isDirty}
        isSubmitting={isSubmitting}
        serverError={serverError}
        footerNote={
          isDirty ? (
            <span className="text-sm text-muted-foreground">
              Le foto caricate diventano pubbliche solo dopo il salvataggio.
            </span>
          ) : null
        }
      >
        <Controller
          control={form.control}
          name="gallery"
          render={({ field }) => (
            <GalleryUpload
              label="Carica foto direttamente da computer o cellulare"
              value={field.value ?? []}
              onChange={field.onChange}
              beforePick={diritti.richiedi}
            />
          )}
        />
        {/* Le foto in attesa restano visibili qui sotto, nella stessa griglia:
            dopo il salvataggio escono dalla galleria pubblicata, e senza questa
            fila sembrerebbero perdute. */}
        <PendingMediaThumbs items={pendingMedia} />
      </ProfileSectionForm>
    </ProfileSection>
  );
}
