"use client";

import * as React from "react";
import { Controller, useWatch } from "react-hook-form";
import { Music } from "lucide-react";
import { AudioUpload, type AudioTrack } from "@/components/forms/AudioUpload";
import { ProfileSection } from "@/components/dashboard/profile/ProfileSection";
import { ProfileSectionForm } from "@/components/dashboard/profile/ProfileSectionForm";
import { useProfileSectionForm } from "@/components/dashboard/profile/useProfileSectionForm";
import {
  audioSectionSchema,
  toAudioPayload,
  type AudioSectionValues,
} from "@/lib/validators/artist-profile";
import type { ArtistProfileData } from "@/components/dashboard/profile/types";

export function AudioBlock({ artist }: { artist: ArtistProfileData }) {
  const defaultValues = React.useMemo<AudioSectionValues>(
    () => ({ audio_files: (artist.audio_files ?? []) as AudioTrack[] }),
    [artist.audio_files]
  );

  const { form, onSubmit, isDirty, isSubmitting, serverError } = useProfileSectionForm({
    artistId: artist.id,
    section: "audio",
    schema: audioSectionSchema,
    defaultValues,
    toPayload: toAudioPayload,
    successMessage: "Tracce audio salvate",
  });

  const tracks = useWatch({ control: form.control, name: "audio_files" }) ?? [];

  return (
    <ProfileSection
      id="audio"
      title="Tracce audio"
      description="Demo, brani ed estratti dal vivo"
      icon={<Music className="size-4" />}
      status={
        tracks.length > 0
          ? { tone: "count", label: tracks.length === 1 ? "1 traccia" : `${tracks.length} tracce` }
          : { tone: "todo", label: "Nessuna traccia" }
      }
      dirty={isDirty}
    >
      <ProfileSectionForm
        onSubmit={onSubmit}
        isDirty={isDirty}
        isSubmitting={isSubmitting}
        serverError={serverError}
        footerNote={
          isDirty ? (
            <span className="text-sm text-muted-foreground">
              Le tracce caricate diventano pubbliche solo dopo il salvataggio.
            </span>
          ) : null
        }
      >
        <Controller
          control={form.control}
          name="audio_files"
          render={({ field }) => (
            <AudioUpload
              label="Carica demo, brani o estratti dal vivo (MP3/WAV/M4A)"
              value={(field.value ?? []) as AudioTrack[]}
              onChange={field.onChange}
            />
          )}
        />
      </ProfileSectionForm>
    </ProfileSection>
  );
}
