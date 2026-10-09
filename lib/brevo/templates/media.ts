/**
 * Moderazione dei contenuti: copia interna per il team.
 *
 * `media_pending_admin` va al superadmin quando un artista carica foto, video o
 * audio da approvare (una email ogni mezz'ora per artista, vedi
 * `lib/media/notify.ts`). Non ha una controparte per l'artista: l'esito gli
 * arriva con `media_approved`.
 */

import {
  buttonPair,
  card,
  dataTable,
  em,
  eyebrow,
  internalBadge,
  layout,
  paragraph,
  param,
  sectionTitle,
  title,
} from "../blocks.ts";
import { defineTemplate } from "./types.ts";

const mediaPendingAdmin = defineTemplate({
  key: "media_pending_admin",
  name: "N'arte · Contenuti da approvare, copia interna [media_pending_admin]",
  subject: "Contenuti da approvare — {{params.artistName}}",
  sample: {
    artistName: "Marina Blu",
    count: 3,
    moderationUrl: "https://narteofficial.it/admin/moderazione",
  },
  html: layout({
    key: "media_pending_admin",
    preheader: "Un artista ha caricato contenuti: sono in coda per l'approvazione.",
    body: [
      internalBadge(),
      eyebrow("Moderazione"),
      title(`Contenuti da ${em("approvare.")}`),
      paragraph(
        `${param("artistName")} ha caricato nuovi contenuti.<br />
              Restano nascosti dal profilo pubblico finché non li approvi.`
      ),
      card(
        [
          sectionTitle("In coda"),
          dataTable([
            { icon: "star", label: "Artista", value: param("artistName") },
            { icon: "check", label: "Contenuti da approvare", value: param("count") },
          ]),
        ].join("\n")
      ),
      buttonPair({ href: param("moderationUrl"), label: "Apri la coda di moderazione" }),
    ].join("\n"),
  }),
});

export const MEDIA_TEMPLATES = [mediaPendingAdmin];
