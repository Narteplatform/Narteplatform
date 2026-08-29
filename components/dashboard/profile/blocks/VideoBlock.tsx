"use client";

import * as React from "react";
import { useWatch } from "react-hook-form";
import { Video } from "lucide-react";
import { Textarea } from "@/components/ui/Input";
import { VideoUpload, type ArtistVideoItem } from "@/components/forms/VideoUpload";
import { ProfileSection } from "@/components/dashboard/profile/ProfileSection";
import { Field, ProfileSectionForm } from "@/components/dashboard/profile/ProfileSectionForm";
import { useProfileSectionForm } from "@/components/dashboard/profile/useProfileSectionForm";
import {
  videosSectionSchema,
  toVideosPayload,
  splitLines,
  type VideosSectionValues,
} from "@/lib/validators/artist-profile";
import type { ArtistProfileData } from "@/components/dashboard/profile/types";

/**
 * Due flussi distinti, di proposito:
 *   • gli URL YouTube/Vimeo stanno nella colonna `videos` e si salvano con il
 *     pulsante di questo blocco;
 *   • i file caricati vivono nella tabella `artist_videos` e hanno già Server
 *     Action proprie (addArtistVideo/deleteArtistVideo), quindi VideoUpload sta
 *     FUORI dal <form>: annidarlo lo farebbe partecipare al submit senza motivo.
 */
export function VideoBlock({
  artist,
  initialVideos,
  videoMax,
}: {
  artist: ArtistProfileData;
  initialVideos: ArtistVideoItem[];
  /** Tetto del piano dell'artista, risolto lato server: 1 Free, 3 Pro, 3 Max. */
  videoMax: number;
}) {
  const defaultValues = React.useMemo<VideosSectionValues>(
    () => ({ videos: (artist.videos ?? []).join("\n") }),
    [artist.videos]
  );

  const { form, onSubmit, isDirty, isSubmitting, serverError } = useProfileSectionForm({
    artistId: artist.id,
    section: "videos",
    schema: videosSectionSchema,
    defaultValues,
    toPayload: toVideosPayload,
    successMessage: "Video salvati",
  });

  const raw = useWatch({ control: form.control, name: "videos" }) ?? "";
  const total = splitLines(raw).length + initialVideos.length;

  return (
    <ProfileSection
      id="video"
      title="Galleria video"
      description="Link YouTube/Vimeo e file caricati"
      icon={<Video className="size-4" />}
      status={
        total > 0
          ? { tone: "count", label: total === 1 ? "1 video" : `${total} video` }
          : { tone: "todo", label: "Nessun video" }
      }
      dirty={isDirty}
    >
      <div className="space-y-6">
        <ProfileSectionForm
          onSubmit={onSubmit}
          isDirty={isDirty}
          isSubmitting={isSubmitting}
          serverError={serverError}
        >
          <Field
            label="URL video YouTube/Vimeo, uno per riga"
            error={form.formState.errors.videos?.message}
          >
            <Textarea
              rows={3}
              placeholder={"https://youtube.com/watch?v=...\nhttps://vimeo.com/..."}
              {...form.register("videos")}
            />
          </Field>
        </ProfileSectionForm>

        <div className="border-t border-border pt-5">
          <p className="mb-3 text-xs text-muted-foreground">
            Video caricati — si salvano da soli, senza passare dal pulsante qui sopra.
          </p>
          <VideoUpload artistId={artist.id} initialVideos={initialVideos} videoMax={videoMax} />
        </div>
      </div>
    </ProfileSection>
  );
}
