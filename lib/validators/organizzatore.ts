import { z } from "zod";

/**
 * Dati dell'organizzatore raccolti in registrazione e in /benvenuto.
 * Gli stessi limiti sono applicati (troncando) dalla trigger `handle_new_user`.
 */
export const datiOrganizzatoreSchema = z.object({
  organizerName: z
    .string()
    .trim()
    .min(2, "Indica il nome del locale o della realtà che rappresenti.")
    .max(120, "Il nome è troppo lungo (massimo 120 caratteri)."),
  city: z
    .string()
    .trim()
    .min(2, "Indica la città.")
    .max(80, "La città è troppo lunga (massimo 80 caratteri)."),
});

export type DatiOrganizzatore = z.infer<typeof datiOrganizzatoreSchema>;
