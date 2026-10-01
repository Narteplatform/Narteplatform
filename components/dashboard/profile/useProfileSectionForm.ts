"use client";

import * as React from "react";
import { useForm, type DefaultValues, type FieldValues, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { ZodType } from "zod";
import {
  updateArtistProfileSection,
  type ProfileSectionId,
  type SectionPayload,
} from "@/app/(artist)/dashboard/_actions";
import { useDirittiContenuti } from "@/components/dashboard/profile/DirittiContenuti";

/**
 * Un form per blocco, non un form gigante con più pulsanti.
 *
 * Con un solo useForm si perderebbero `isDirty` e `isSubmitting` per sezione
 * (salvare la galleria disabiliterebbe il pulsante del booking), i pulsanti
 * andrebbero messi a `type="button"` con submit manuale — perdendo l'invio da
 * tastiera — e `reset()` post-salvataggio diventerebbe un caso limite.
 *
 * Sonner è già montato nel layout della dashboard artista (UnreadToastProvider),
 * quindi `toast` funziona qui senza aggiungere provider né dipendenze.
 */
export function useProfileSectionForm<TValues extends FieldValues, S extends ProfileSectionId>(opts: {
  artistId: string;
  section: S;
  schema: ZodType<TValues>;
  defaultValues: TValues;
  toPayload: (values: TValues) => SectionPayload<S>;
  successMessage: string;
}): {
  form: UseFormReturn<TValues>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  isDirty: boolean;
  isSubmitting: boolean;
  serverError: string | null;
} {
  const { artistId, section, schema, defaultValues, toPayload, successMessage } = opts;
  const [serverError, setServerError] = React.useState<string | null>(null);
  const diritti = useDirittiContenuti();

  const form = useForm<TValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: defaultValues as DefaultValues<TValues>,
    mode: "onBlur",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const res = await updateArtistProfileSection(artistId, section, toPayload(values));
    if (!res.ok) {
      // Mancata dichiarazione dei diritti: non è un errore da mostrare crudo,
      // si apre la modale e si invita a ripetere il salvataggio.
      if (diritti.gestisciErrore(res.error)) {
        setServerError(
          "Prima di salvare nuovi contenuti conferma la dichiarazione sui diritti, poi salva di nuovo."
        );
        return;
      }
      setServerError(res.error);
      toast.error(res.error);
      return;
    }
    // Rifissa il baseline: senza reset il form resta "dirty" e il pulsante
    // Salva non torna mai disabilitato.
    form.reset(values);
    toast.success(successMessage);
  });

  return {
    form,
    onSubmit,
    isDirty: form.formState.isDirty,
    isSubmitting: form.formState.isSubmitting,
    serverError,
  };
}
