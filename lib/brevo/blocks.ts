/**
 * Blocchi di composizione per i template email Brevo.
 *
 * Ogni funzione ritorna una stringa di HTML già pronto: niente JSX, niente
 * render asincrono. È una scelta obbligata, non stilistica — `render()` di
 * React Email fa escaping degli apici, e il copy italiano ("N'arte",
 * "l'artista") arriverebbe su Brevo come `&#x27;`, illeggibile sia nella GUI
 * sia nei diff. Le stringhe passano invece i `{{params.x}}` e i `{% if %}`
 * verbatim.
 *
 * Vincoli del mezzo (non scelte estetiche):
 *  - layout a tabelle: Outlook non conosce flexbox né grid
 *  - stili inline: molti client rimuovono <style> dall'head
 *  - i webfont non si caricano su Gmail e Outlook: si degrada su Georgia e Arial
 *  - border-radius ignorato da Outlook desktop: lì gli angoli restano vivi
 *  - le icone SVG vengono rimosse: servono PNG remoti (vedi ICONS)
 */

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

/**
 * Palette allineata al design system del sito (`app/globals.css`).
 *
 * NOTA — i mockup in `DESIGN EMAIL N'ARTE/` usano un blu più acceso
 * (campionato: `#005df9`) e un verde puro (`#10ac16`). È stata una scelta
 * deliberata tenere invece l'accento del sito: un'email che porta a una
 * pagina di un altro colore fa notare lo stacco. Struttura, proporzioni e
 * gerarchia dei mockup restano identiche — cambia solo la tinta.
 *
 * Per tornare ai colori dei mockup basta cambiare `accent` e `success` qui:
 * nessun template li ripete.
 */
export const C = {
  /** Header, titoli, testo principale. `--color-notte`. */
  navy: "#0d1b2a",
  /** Sfondo pagina, avorio caldo. `--color-palco`. */
  page: "#f7f5f2",
  /** Sfondo delle card. */
  card: "#ffffff",
  /** Bordo delle card. */
  cardBorder: "#e9e5e0",
  /** Accento: bottoni pieni, eyebrow, parola in corsivo, icone. `--color-azzurro`. */
  accent: "#1a6bad",
  /** Variante scura dell'accento, per il fallback VML di Outlook. */
  accentDark: "#145688",
  /** Sfondo delle piastrelle icona nelle schede dati. `--color-azzurro-subtle`. */
  accentTile: "#ebf4fb",
  /** Tratteggio dei connettori nella timeline. */
  accentDotted: "#a8c4dc",
  /** Verde: step completati, barra e titolo dei callout. `--color-success`. */
  success: "#2a9d5c",
  /** Sfondo del callout. */
  successBg: "#eef5f0",
  /** Ambra: pagamenti in sospeso, scadenze. `--color-warning`. */
  warning: "#e8a030",
  warningBg: "#fdf5e9",
  /** Rosso: annullamenti, rifiuti. `--color-error`. */
  danger: "#d93d2a",
  dangerBg: "#fdefed",
  /** Corallo: accento secondario. `--color-corallo`. */
  coral: "#e8542a",
  /** Testo secondario. */
  muted: "#7d746c",
  /** Separatore fra le righe di una scheda dati. */
  rule: "#eeeae5",
  /** Divider prima del footer. */
  divider: "#ddd6ce",
  /** Separatore verticale nella riga contatti del footer. */
  footerSep: "#c9c1b8",
  white: "#ffffff",
} as const;

const SANS = "'DM Sans',Helvetica,Arial,sans-serif";
const SERIF = "Fraunces,Georgia,'Times New Roman',serif";

/** Larghezza del contenitore e padding orizzontale del contenuto. */
const WIDTH = 600;
const PAD = 40;
/** Larghezza utile interna: 600 − 40 − 40. */
const INNER = WIDTH - PAD * 2;

/**
 * Host degli asset. Le email non possono usare percorsi relativi: ogni
 * immagine deve avere un URL assoluto e pubblico. Cambia quando il dominio
 * definitivo sostituirà quello Vercel.
 */
export const ASSETS = process.env.BREVO_ASSET_BASE_URL || "https://narteplatform.vercel.app";

/** Recapiti mostrati nel footer. */
const FOOTER_EMAIL = "brand@narte.it";
const FOOTER_SITE = "narteofficial.it";
const FOOTER_SITE_URL = "https://narteofficial.it";
const SOCIAL: readonly { label: string; glyph: string; href: string }[] = [
  { label: "Facebook", glyph: "f", href: "https://facebook.com/narteofficiall" },
  { label: "Instagram", glyph: "IG", href: "https://instagram.com/narte.official" },
  // TODO: URL TikTok non ancora configurato nel sito, rimanda alla home.
  { label: "TikTok", glyph: "&#9834;", href: FOOTER_SITE_URL },
];

// ---------------------------------------------------------------------------
// Helper di base
// ---------------------------------------------------------------------------

/**
 * Escape del testo che finisce dentro l'HTML. Da usare per QUALSIASI valore
 * che provenga dall'utente e venga inserito staticamente nel template.
 * I valori dinamici veri passano invece da `param()` e li sostituisce Brevo.
 */
export function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Placeholder Brevo. Dichiarare i parametri solo così: `usedParams()` li
 * ritrova con la stessa espressione regolare, e `brevo-sync` blocca il push
 * se un nome non compare fra quelli dichiarati nel template.
 */
export function param(name: string): string {
  return `{{params.${name}}}`;
}

/** Blocco condizionale Brevo: il contenuto sparisce se il parametro è vuoto. */
export function ifParam(name: string, html: string): string {
  return `{% if params.${name} %}${html}{% endif %}`;
}

/** Parola (o frase) in corsivo accento, come nei titoli dei mockup. */
export function em(text: string): string {
  return `<em style="font-style:italic;color:${C.accent};">${text}</em>`;
}

/** Riga vuota di altezza fissa. `font-size:0` evita il collasso su Outlook. */
export function spacer(px: number): string {
  return `<tr><td style="height:${px}px;line-height:${px}px;font-size:0;">&nbsp;</td></tr>`;
}

/** Avvolge un blocco in una riga della tabella esterna, con padding standard. */
function row(inner: string, padding: string, align: "center" | "left" = "center"): string {
  return `<tr>
          <td align="${align}" style="padding:${padding};">
${inner}
          </td>
        </tr>`;
}

// ---------------------------------------------------------------------------
// Icone
// ---------------------------------------------------------------------------

/**
 * Le icone dei mockup non sono ancora disponibili come PNG. Finché non
 * arrivano si usa un glifo unicode monocromatico: stessa posizione, stesso
 * colore, resa più povera.
 *
 * Quando il PNG esiste in `public/email/icons/<nome>.png`, basta aggiungere
 * `png: true` alla voce: `iconTile()` passa da glifo a `<img>` senza toccare
 * un solo template.
 */
type IconDef = { glyph: string; png?: true };

export const ICONS = {
  check: { glyph: "&#10003;" },
  clock: { glyph: "&#9719;" },
  mail: { glyph: "&#9993;" },
  user: { glyph: "&#9787;" },
  send: { glyph: "&#10148;" },
  store: { glyph: "&#8962;" },
  building: { glyph: "&#8862;" },
  briefcase: { glyph: "&#9636;" },
  star: { glyph: "&#9733;" },
  calendar: { glyph: "&#9635;" },
  wave: { glyph: "&#8776;" },
  mic: { glyph: "&#9834;" },
  pin: { glyph: "&#9679;" },
  map: { glyph: "&#9641;" },
  euro: { glyph: "&#8364;" },
  timer: { glyph: "&#9711;" },
  gear: { glyph: "&#9881;" },
  chat: { glyph: "&#10077;" },
  video: { glyph: "&#9654;" },
  link: { glyph: "&#8599;" },
  doc: { glyph: "&#8801;" },
  badge: { glyph: "&#10003;" },
  info: { glyph: "i" },
  bulb: { glyph: "&#9788;" },
} as const satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

/** Glifo o `<img>`, a seconda che il PNG dell'icona esista già. */
function iconMark(name: IconName, size: number, color: string): string {
  const def: IconDef = ICONS[name];
  if (def.png) {
    return `<img src="${ASSETS}/email/icons/${name}.png" width="${size}" height="${size}" alt=""
                 style="display:block;width:${size}px;height:${size}px;border:0;outline:none;" />`;
  }
  return `<span style="font-family:${SANS};font-size:${size}px;line-height:${size}px;color:${color};">${def.glyph}</span>`;
}

/** Piastrella quadrata azzurra con l'icona dentro, usata nelle schede dati. */
function iconTile(name: IconName): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="36" style="width:36px;height:36px;background-color:${C.accentTile};border-radius:10px;">
                            <tr><td align="center" valign="middle" height="36" style="height:36px;">${iconMark(name, 16, C.accent)}</td></tr>
                          </table>`;
}

// ---------------------------------------------------------------------------
// Blocchi di contenuto
// ---------------------------------------------------------------------------

/** Sopratitolo: 12px maiuscolo spaziato, colore accento. */
export function eyebrow(text: string): string {
  return row(
    `            <p style="margin:0;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${C.accent};">${text}</p>`,
    "44px 40px 0 40px"
  );
}

/**
 * Titolo principale. `html` può contenere `em()` e `<br />`: i mockup mettono
 * in corsivo accento l'ultima parola, ma in "Hai un nuovo messaggio in chat"
 * la parola evidenziata sta in mezzo, quindi la composizione resta libera.
 */
export function title(html: string, opts: { size?: "lg" | "xl" } = {}): string {
  const [fs, lh] = opts.size === "xl" ? [46, 56] : [40, 48];
  return row(
    `            <h1 style="margin:0;font-family:${SERIF};font-size:${fs}px;line-height:${lh}px;font-weight:700;letter-spacing:-0.01em;color:${C.navy};">${html}</h1>`,
    "14px 40px 0 40px"
  );
}

/** Immagine di apertura, a tutta larghezza utile. */
export function hero(file: string, alt = ""): string {
  return row(
    `            <img src="${ASSETS}/${file}" width="${INNER}" alt="${esc(alt)}"
                 style="display:block;width:${INNER}px;max-width:100%;height:auto;border-radius:12px;border:0;outline:none;text-decoration:none;" />`,
    "28px 40px 0 40px"
  );
}

/**
 * Segnaposto tratteggiato per le due email il cui mockup riporta
 * "Placeholder immagine". Va sostituito con `hero()` prima di attivarle:
 * in una casella vera un riquadro tratteggiato sembra un errore.
 */
export function heroPlaceholder(): string {
  return row(
    `            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${INNER}" style="width:${INNER}px;max-width:100%;border:2px dashed ${C.cardBorder};border-radius:12px;">
              <tr><td align="center" valign="middle" height="150" style="height:150px;font-family:${SANS};font-size:14px;color:${C.muted};">Immagine in arrivo</td></tr>
            </table>`,
    "28px 40px 0 40px"
  );
}

/** Paragrafo di corpo. `html` può contenere `<br />` e `param()`. */
export function paragraph(html: string, opts: { align?: "center" | "left" } = {}): string {
  const align = opts.align ?? "center";
  return row(
    `            <p style="margin:0;font-family:${SANS};font-size:16px;line-height:30px;color:${C.navy};text-align:${align};">${html}</p>`,
    "26px 48px 0 48px",
    align
  );
}

/** Card bianca arrotondata. `body` è HTML già impaginato. */
export function card(body: string, opts: { paddingTop?: number } = {}): string {
  return row(
    `            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:${C.card};border:1px solid ${C.cardBorder};border-radius:16px;">
              <tr>
                <td style="padding:32px;">
${body}
                </td>
              </tr>
            </table>`,
    `${opts.paddingTop ?? 34}px 40px 0 40px`,
    "left"
  );
}

/** Titolo interno alla card, centrato, senza fregi. */
export function cardTitle(text: string): string {
  return `                  <p style="margin:0 0 26px 0;text-align:center;font-family:${SERIF};font-size:25px;line-height:32px;font-weight:700;color:${C.navy};">${text}</p>`;
}

/** Titolo di sezione con le due linee azzurre laterali, come nei mockup. */
export function sectionTitle(text: string): string {
  // Due accorgimenti obbligati: la larghezza esplicita (senza, la cella con
  // contenuto a font-size 0 collassa e la linea sparisce) e il div interno
  // (il bordo di una cella si disegna sul suo bordo superiore, quindi
  // finirebbe in cima al titolo invece che a metà).
  const rule = `                      <td width="50%" valign="middle" style="width:50%;">
                        <div style="border-top:1px solid ${C.accent};font-size:0;line-height:0;">&nbsp;</div>
                      </td>`;
  return `                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
                    <tr>
${rule}
                      <td align="center" style="padding:0 16px;white-space:nowrap;font-family:${SERIF};font-size:25px;line-height:32px;font-weight:700;color:${C.navy};">${text}</td>
${rule}
                    </tr>
                  </table>
                  ${spacerCell(24)}`;
}

/** Spaziatore usato dentro una card (non è una riga della tabella esterna). */
function spacerCell(px: number): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="height:${px}px;line-height:${px}px;font-size:0;">&nbsp;</td></tr></table>`;
}

// ---------------------------------------------------------------------------
// Timeline "Cosa succede ora"
// ---------------------------------------------------------------------------

export interface TimelineStep {
  /** Icona dentro il cerchio. */
  icon: IconName;
  /** `done` colora il cerchio di verde, `next` di accento. */
  tone?: "done" | "next";
  /** Testo del passo, può contenere `<br />`. */
  text: string;
}

/** Elenco numerato con cerchi e connettori tratteggiati. */
export function timeline(steps: readonly TimelineStep[]): string {
  const connector = `                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0;">
                    <tr>
                      <td width="26" style="width:26px;">&nbsp;</td>
                      <td style="border-left:2px dotted ${C.accentDotted};height:22px;line-height:22px;font-size:0;">&nbsp;</td>
                    </tr>
                  </table>`;

  return steps
    .map((step, i) => {
      const color = step.tone === "done" ? C.success : C.accent;
      const n = String(i + 1).padStart(2, "0");
      const block = `                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
                    <tr>
                      <td width="56" valign="top" style="width:56px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="52" style="width:52px;height:52px;border:2px solid ${color};border-radius:26px;">
                          <tr><td align="center" valign="middle" height="48" style="height:48px;">${iconMark(step.icon, 20, color)}</td></tr>
                        </table>
                      </td>
                      <td width="20" style="width:20px;">&nbsp;</td>
                      <td width="44" valign="middle" style="width:44px;font-family:${SANS};font-size:17px;font-weight:700;color:${C.accent};">${n}</td>
                      <td valign="middle" style="font-family:${SANS};font-size:15px;line-height:23px;color:${C.navy};">${step.text}</td>
                    </tr>
                  </table>`;
      return i === 0 ? block : `${connector}\n${block}`;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Scheda dati
// ---------------------------------------------------------------------------

export interface DataRow {
  icon: IconName;
  label: string;
  /** Valore, tipicamente un `param()`. */
  value: string;
  /**
   * Se valorizzato, l'intera riga è avvolta in `{% if params.<nome> %}`:
   * quando il dato manca la riga sparisce invece di restare vuota.
   */
  onlyIf?: string;
  /** Valore su più righe (messaggi, note): allinea l'etichetta in alto. */
  multiline?: true;
}

/**
 * La tabella "Dettagli della richiesta" dei mockup: piastrella icona,
 * etichetta in grassetto, valore, separatore sottile fra le righe.
 */
export function dataTable(rows: readonly DataRow[]): string {
  return rows
    .map((r, i) => {
      const last = i === rows.length - 1;
      const border = last ? "" : `border-bottom:1px solid ${C.rule};`;
      const valign = r.multiline ? "top" : "middle";
      // Verificato sull'API: Brevo fa l'escaping dei valori sostituiti, quindi
      // un `<br />` dentro un parametro arriverebbe visibile come testo.
      // Gli a capo si ottengono solo lasciando i `\n` nel valore e rendendoli
      // con pre-wrap. Outlook desktop lo ignora e mostra tutto di seguito:
      // è il compromesso accettato, l'alternativa sarebbe non avere a capo.
      const wrap = r.multiline ? "white-space:pre-wrap;" : "";
      const html = `                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
                    <tr>
                      <td width="52" valign="top" style="width:52px;padding:14px 0;${border}">
                          ${iconTile(r.icon)}
                      </td>
                      <td width="168" valign="${valign}" style="width:168px;padding:14px 12px 14px 0;${border}font-family:${SANS};font-size:15px;line-height:23px;font-weight:700;color:${C.navy};">${r.label}</td>
                      <td valign="${valign}" style="padding:14px 0;${border}${wrap}font-family:${SANS};font-size:15px;line-height:23px;color:${C.navy};">${r.value}</td>
                    </tr>
                  </table>`;
      return r.onlyIf ? ifParam(r.onlyIf, html) : html;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Bottoni
// ---------------------------------------------------------------------------

export interface ButtonSpec {
  href: string;
  label: string;
}

const BTN_W = 300;

/**
 * Bottone. Il commento condizionale `<!--[if mso]>` serve a Outlook desktop,
 * che ignora `border-radius` e i padding sugli anchor: senza il `v:roundrect`
 * lì il bottone diventa un rettangolo con il testo attaccato ai bordi.
 */
export function button(spec: ButtonSpec, variant: "primary" | "secondary" = "primary"): string {
  const isPrimary = variant === "primary";
  const bg = isPrimary ? C.accent : C.white;
  const fg = isPrimary ? C.white : C.accent;
  const border = isPrimary ? C.accent : C.accent;

  return `            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${BTN_W}" style="width:${BTN_W}px;max-width:100%;">
              <tr>
                <td align="center" bgcolor="${bg}" style="background-color:${bg};border:1px solid ${border};border-radius:8px;">
                  <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${spec.href}" style="height:44px;v-text-anchor:middle;width:${BTN_W}px;" arcsize="18%" strokecolor="${border}" fillcolor="${bg}"><w:anchorlock/><center style="color:${fg};font-family:Arial,sans-serif;font-size:16px;font-weight:bold;"><![endif]-->
                  <a href="${spec.href}" target="_blank"
                     style="display:block;padding:13px 20px;font-family:${SANS};font-size:16px;line-height:20px;font-weight:700;color:${fg};text-decoration:none;">${spec.label}</a>
                  <!--[if mso]></center></v:roundrect><![endif]-->
                </td>
              </tr>
            </table>`;
}

/** Coppia di bottoni impilati: primario pieno sopra, secondario in outline. */
export function buttonPair(primary: ButtonSpec, secondary?: ButtonSpec): string {
  const first = row(button(primary, "primary"), "30px 40px 0 40px");
  if (!secondary) return first;
  return `${first}
${row(button(secondary, "secondary"), "12px 40px 0 40px")}`;
}

// ---------------------------------------------------------------------------
// Callout
// ---------------------------------------------------------------------------

export interface CalloutSpec {
  /** Testo, può contenere `<br />`. */
  text: string;
  /** Titolo opzionale colorato, come "N'Arte Tips" nei mockup. */
  heading?: string;
  icon?: IconName;
  /** Verde di default; ambra per le scadenze, rosso per gli annullamenti. */
  tone?: "success" | "warning" | "danger";
}

/** Riquadro con barra colorata a sinistra, per note e avvisi. */
export function callout(spec: CalloutSpec): string {
  const icon = spec.icon ?? "info";
  const tone = spec.tone ?? "success";
  const color = tone === "warning" ? C.warning : tone === "danger" ? C.danger : C.success;
  const bg = tone === "warning" ? C.warningBg : tone === "danger" ? C.dangerBg : C.successBg;
  const heading = spec.heading
    ? `<p style="margin:0 0 6px 0;font-family:${SANS};font-size:16px;line-height:22px;font-weight:700;color:${color};">${spec.heading}</p>`
    : "";
  const align = spec.heading ? "left" : "center";

  return row(
    `            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:${bg};border-left:4px solid ${color};">
              <tr>
                <td width="60" align="center" valign="middle" style="width:60px;padding:20px 0 20px 12px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="32" style="width:32px;height:32px;border:2px solid ${color};border-radius:16px;">
                    <tr><td align="center" valign="middle" height="28" style="height:28px;">${iconMark(icon, 15, color)}</td></tr>
                  </table>
                </td>
                <td align="${align}" valign="middle" style="padding:20px 24px 20px 0;font-family:${SANS};font-size:14px;line-height:22px;color:${C.navy};">
                  ${heading}${spec.text}
                </td>
              </tr>
            </table>`,
    "18px 40px 0 40px",
    "left"
  );
}

// ---------------------------------------------------------------------------
// Divider e footer
// ---------------------------------------------------------------------------

/**
 * Fascia "copia interna" per le email che arrivano solo a noi. Serve a
 * distinguerle a colpo d'occhio in casella: senza, la copia della
 * candidatura e la candidatura vera sembrano la stessa email.
 */
export function internalBadge(text = "Copia interna — N'arte"): string {
  return row(
    `            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:${C.navy};">
              <tr>
                <td align="center" style="padding:10px 20px;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a9ab2;">${text}</td>
              </tr>
            </table>`,
    "0",
    "left"
  );
}

/**
 * Valore in evidenza: una data per i promemoria, un importo per le offerte.
 * Sostituisce l'immagine di apertura nelle email che non ne hanno una ma
 * hanno comunque bisogno di un fuoco visivo.
 */
export function highlight(label: string, value: string, opts: { tone?: "accent" | "success" | "warning" } = {}): string {
  const color =
    opts.tone === "success" ? C.success : opts.tone === "warning" ? C.warning : C.accent;
  return row(
    `            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:${C.card};border:1px solid ${C.cardBorder};border-radius:16px;">
              <tr>
                <td align="center" style="padding:26px 24px;">
                  <p style="margin:0 0 6px 0;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${C.muted};">${label}</p>
                  <p style="margin:0;font-family:${SERIF};font-size:28px;line-height:36px;font-weight:700;color:${color};">${value}</p>
                </td>
              </tr>
            </table>`,
    "28px 40px 0 40px",
    "left"
  );
}

export function divider(): string {
  return row(
    `            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
              <tr><td style="border-top:1px solid ${C.divider};height:1px;line-height:1px;font-size:0;">&nbsp;</td></tr>
            </table>`,
    "36px 40px 0 40px",
    "left"
  );
}

function footer(): string {
  const contacts = `            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:${SANS};font-size:14px;color:${C.navy};">&#9993;&nbsp;&nbsp;</td>
                <td style="font-family:${SANS};font-size:14px;color:${C.navy};"><a href="mailto:${FOOTER_EMAIL}" style="color:${C.navy};text-decoration:none;">${FOOTER_EMAIL}</a></td>
                <td style="padding:0 16px;font-family:${SANS};font-size:14px;color:${C.footerSep};">|</td>
                <td style="font-family:${SANS};font-size:14px;color:${C.navy};">&#127760;&nbsp;&nbsp;</td>
                <td style="font-family:${SANS};font-size:14px;color:${C.navy};"><a href="${FOOTER_SITE_URL}" target="_blank" style="color:${C.navy};text-decoration:none;">${FOOTER_SITE}</a></td>
              </tr>
            </table>`;

  const social = SOCIAL.map(
    (s) => `                <td style="padding:0 6px;">
                  <a href="${s.href}" target="_blank" style="text-decoration:none;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="34" style="width:34px;height:34px;border:1px solid ${C.navy};border-radius:17px;">
                      <tr><td align="center" valign="middle" height="32" style="height:32px;font-family:${SANS};font-size:14px;font-weight:700;color:${C.navy};">${s.glyph}</td></tr>
                    </table>
                  </a>
                </td>`
  ).join("\n");

  // Stesso marchio dell'header, in versione scura per il fondo avorio.
  // `narte-logo-dark.png` è generato da `narte-logo.png` con
  // `scripts/recolor-png.mjs`: l'ufficiale esiste solo in bianco, e su questo
  // sfondo sarebbe invisibile.
  return `${row(
    `            <img src="${ASSETS}/brand/narte-logo-dark.png" width="160" alt="N'arte"
                 style="display:block;width:160px;max-width:50%;height:auto;border:0;outline:none;text-decoration:none;" />`,
    "32px 40px 0 40px"
  )}
${row(contacts, "20px 40px 0 40px")}
${row(`            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
${social}
              </tr>
            </table>`, "22px 40px 44px 40px")}`;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export interface LayoutOpts {
  /** Chiave del template: finisce in un marker invisibile (vedi brevo-sync). */
  key: string;
  /** Testo di anteprima mostrato da Gmail accanto all'oggetto. */
  preheader: string;
  /** Corpo: sequenza di `<tr>` prodotti dai blocchi. */
  body: string;
}

/**
 * Documento completo. Il marker `narte:key` permette a `brevo-sync` di
 * riconoscere il template su Brevo anche se qualcuno lo rinomina dal
 * pannello: è la difesa contro i duplicati.
 */
export function layout(o: LayoutOpts): string {
  // Il preheader è nascosto alla vista ma letto dai client nell'anteprima;
  // le entità finali servono a impedire che Gmail vi accodi il testo del corpo.
  const preheader = `      <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};">${o.preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>`;

  const header = `        <tr>
          <td align="center" bgcolor="${C.navy}" style="background-color:${C.navy};padding:34px 24px;">
            <img src="${ASSETS}/brand/narte-logo.png" width="190" alt="N'arte"
                 style="display:block;width:190px;max-width:60%;height:auto;border:0;outline:none;text-decoration:none;" />
          </td>
        </tr>`;

  return `<!-- narte:key=${o.key} -->
<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>N'arte</title>
</head>
<body style="margin:0;padding:0;background-color:${C.page};">
${preheader}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${C.page};margin:0;padding:0;width:100%;">
      <tr>
        <td align="center" style="padding:0;">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${WIDTH}" style="width:${WIDTH}px;max-width:100%;">

${header}

${o.body}

${divider()}

${footer()}

      </table>

        </td>
      </tr>
    </table>
</body>
</html>
`;
}
