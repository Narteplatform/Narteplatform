"use client";

import * as React from "react";
import { Controller, useWatch } from "react-hook-form";
import { Images } from "lucide-react";
import { GalleryUpload } from "@/components/forms/GalleryUpload";
import { ProfileSection } from "@/components/dashboard/profile/ProfileSection";
import { ProfileSectionForm } from "@/components/dashboard/profile/ProfileSectionForm";
import { useProfileSectionForm } from "@/components/dashboard/profile/useProfileSectionForm";
import { PendingMediaNotice } from "@/components/dashboard/PendingMediaNotice";
import { PendingMediaThumbs } from "@/components/dashboard/PendingMediaThumbs";
import {
  gallerySectionSchema,
  toGalleryPayload,
  type GallerySectionValues,
} from "@/lib/validators/artist-profile";
import type { ArtistProfileData, MediaSubmissionNotice } from "@/components/dashboard/profile/types";

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

  const gallery = useWatch({ control: form.control, name: "gallery" }) ?? [];

  return (
    <ProfileSection
      id="gallery"
      title="Galleria foto"
      description="Gli scatti che accompagnano il tuo profilo"
      icon={<Images className="size-4" />}
      status={
        gallery.length > 0
          ? { tone: "count", label: gallery.length === 1 ? "1 foto" : `${gallery.length} foto` }
          : { tone: "todo", label: "Nessuna foto" }
      }
      dirty={isDirty}
    >
      <PendingMediaNotice items={pendingMedia} />
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
