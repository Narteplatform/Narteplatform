"use client";

import * as React from "react";
import { Controller, useWatch } from "react-hook-form";
import { Music } from "lucide-react";
import { AudioUpload, type AudioTrack } from "@/components/forms/AudioUpload";
import { ProfileSection } from "@/components/dashboard/profile/ProfileSection";
import { ProfileSectionForm } from "@/components/dashboard/profile/ProfileSectionForm";
import { useProfileSectionForm } from "@/components/dashboard/profile/useProfileSectionForm";
import { useDirittiContenuti } from "@/components/dashboard/profile/DirittiContenuti";
import { PendingMediaNotice } from "@/components/dashboard/PendingMediaNotice";
import { PendingMediaThumbs } from "@/components/dashboard/PendingMediaThumbs";
import {
  audioSectionSchema,
  toAudioPayload,
  type AudioSectionValues,
} from "@/lib/validators/artist-profile";
import type { ArtistProfileData, MediaSubmissionNotice } from "@/components/dashboard/profile/types";
import { entitlementsFor, isUnlimited, PLAN_LABELS } from "@/lib/billing/plans";

export function AudioBlock({
  artist,
  pendingMedia = [],
}: {
  artist: ArtistProfileData;
  /** Tracce in attesa di approvazione o rifiutate, dalla coda di moderazione. */
  pendingMedia?: MediaSubmissionNotice[];
}) {
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

  const diritti = useDirittiContenuti();
  const tracks = useWatch({ control: form.control, name: "audio_files" }) ?? [];
  // Tetto del piano attuale: sul profilo pubblico si vedono solo le prime
  // `tetto` tracce (0 su Free). Le altre restano qui, non cancellate.
  const piano = artist.tier ?? "free";
  const tetto = entitlementsFor(piano).audioMax;
  const conTetto = !isUnlimited(tetto);
  const oltre = conTetto ? Math.max(tracks.length - tetto, 0) : 0;

  return (
    <ProfileSection
      id="audio"
      title="Tracce audio"
      description="Demo, brani ed estratti dal vivo"
      icon={<Music className="size-4" />}
      status={
        tracks.length > 0
          ? {
              tone: "count",
              label:
                conTetto && tetto > 0
                  ? `${tracks.length} di ${tetto} ${tetto === 1 ? "traccia" : "tracce"}`
                  : tracks.length === 1
                    ? "1 traccia"
                    : `${tracks.length} tracce`,
            }
          : { tone: "todo", label: "Nessuna traccia" }
      }
      dirty={isDirty}
    >
      <PendingMediaNotice items={pendingMedia} />
      {oltre > 0 && (
        <p role="status" className="mb-3 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {tetto === 0
            ? `Con il piano ${PLAN_LABELS[piano]} le tracce audio non sono visibili sul profilo pubblico. `
            : oltre === 1
              ? `L'ultima traccia (la ${tetto + 1}ª) non è visibile sul profilo pubblico: il piano ${PLAN_LABELS[piano]} ne mostra ${tetto}. `
              : `Le ultime ${oltre} tracce (dalla ${tetto + 1}ª in poi) non sono visibili sul profilo pubblico: il piano ${PLAN_LABELS[piano]} ne mostra ${tetto}. `}
          Non sono cancellate e tornano visibili con un piano che le include.
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
              artistId={artist.id}
              beforePick={diritti.richiedi}
            />
          )}
        />
        {/* Anche le tracce in attesa restano visibili: dopo il salvataggio
            escono dall'elenco pubblicato e senza questa fila sembrerebbero
            non essere mai state caricate. */}
        <PendingMediaThumbs items={pendingMedia} kind="audio" />
      </ProfileSectionForm>
    </ProfileSection>
  );
}
