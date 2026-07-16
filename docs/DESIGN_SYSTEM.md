# Design System

Il design replica la reference fornita: tipografia display bold in Sentence case, layout monocromatico con accenti, hero "EVENT GUIDE" con immagine clip-path nel testo.

## Tokens

Definiti in `app/globals.css` tramite `@theme`:

| Token | Valore | Uso |
|-------|--------|-----|
| `--color-background` | `#FFFFFF` | Sfondo principale |
| `--color-foreground` | `#0B0B0B` | Testo principale, bottoni, header card |
| `--color-muted` | `#F4F4F4` | Sfondi secondari, placeholder card |
| `--color-muted-foreground` | `#6B6B6B` | Testo secondario |
| `--color-border` | `#E5E5E5` | Bordi |
| `--color-accent` | `#FF5722` | Solo micro-label ("about us", "popular categories", "location") |
| `--font-sans` | Open Sans | Body, sottotitoli |
| `--font-display` | Space Grotesk 700 | Titoli e headline |
| `--radius-pill` | `999px` | Bottoni pill |

I due font arrivano da `next/font/google` in `app/layout.tsx` e vengono esposti come
`--font-display-family` / `--font-sans-family`; `@theme` li avvolge con i fallback in
`--font-display` / `--font-sans`. Non referenziare mai le variabili `*-family` direttamente.

## Tipografia

- **Display** (`.font-display`): Space Grotesk 700, Sentence case, tracking `-0.02em`. Usato per hero, titoli sezione, bottoni di CTA. Il peso bold e il tracking arrivano dalla classe: non serve aggiungere `font-bold` o `tracking-tight` a mano.
- **Display gigante** (`.display-xl`): come sopra ma tracking `-0.03em` e line-height `1.08`.
- **Display accento** (`.display-italic`): Space Grotesk 700 in azzurro. Non è un corsivo — Space Grotesk non ne ha uno reale, la distinzione passa dal colore.
- **Body**: Open Sans 400. 14px-16px per il testo, 12px per micro-label.
- **Accent label** (`.accent-label`): azzurro, 12px, uppercase, tracking `0.12em`. Eyebrow sopra i titoli di sezione.
- **Narte label** (`.narte-label`): 11px, uppercase, tracking `0.1em`, grigio `--color-palco-40`. Micro-label secondaria.

> L'uppercase è riservato alle micro-label (`.accent-label`, `.narte-label`, badge). I titoli
> vanno in Sentence case: le minuscole sono la parte caratteristica di Space Grotesk.
> Unica eccezione: le iniziali-avatar generate con `slice()`, che restano `uppercase`.

## Componenti chiave

| Nome | Path | Note |
|------|------|------|
| `<HeroEventGuide>` | `components/marketing/HeroEventGuide.tsx` | Hero con `bg-clip-text` + immagine sotto. Animazione clip-path al mount. |
| `<AboutBlock>` | `components/marketing/AboutBlock.tsx` | "Find your vibe" con immagine inline tra le parole. |
| `<LocationPicker>` | `components/marketing/LocationPicker.tsx` | Barra nera full-width con dropdown città. |
| `<CategoryRail>` | `components/marketing/CategoryRail.tsx` | Lista categorie testuali separate da virgola. |
| `<EventCard>` | `components/marketing/EventCard.tsx` | Poster verticale 3:4 + data/prezzo + titolo. |
| `<EventGrid>` | `components/marketing/EventGrid.tsx` | Sezione titolata con grid e link "see all". |
| `<Button>` | `components/ui/Button.tsx` | Pill (rounded-full). Variants: default/outline/ghost/accent/link. |
| `<Reveal>`, `<StaggerList>`, `<HeroReveal>` | `components/animations/Reveal.tsx` | Animazioni di scroll/mount. |
| `<Marquee>` | `components/animations/Marquee.tsx` | Scorrimento orizzontale infinito. |

## Animazioni

Tutte le animazioni usano Framer Motion e rispettano `prefers-reduced-motion`.

| Pattern | Durata | Easing | Note |
|---------|--------|--------|------|
| Reveal on scroll | 0.6s | `[0.22, 1, 0.36, 1]` | `opacity 0→1` + `y 24→0` |
| Stagger | 0.6s con delay 0.08s/item | come sopra | Per griglie |
| Hero clip-path | 1.1s | come sopra | `inset(0 100% 0 0) → inset(0 0% 0 0)` |
| Marquee | 30s linear infinite | linear | `x: 0% → -50%` con duplicazione contenuti |
| Card hover | 300ms | default | `scale 1 → 1.05` sull'immagine, `-translate-y-1` sull'intera card |

## Layout

- Container massimo: 1200px (`.container-narte`)
- Padding orizzontale: 1.5rem (24px)
- Spazio verticale tra sezioni: 3rem (48px) - 6rem (96px) a seconda dell'importanza
- Griglie: 2 col mobile, 3 col tablet (md), 4 col desktop (lg)

## Accessibilità

- Contrasto minimo AA su tutto il testo (occhio all'arancio: usabile solo per testo grande o non-essenziale, mai sotto 18px su bianco)
- `:focus-visible` ben visibile (ring nera 2px)
- `aria-label` su pulsanti icon-only
- `<DayPicker>` di react-day-picker è già accessibile (nav tastiera + announce)
- Form: ogni input ha `<Label>` associato; errori in colore + testo (mai solo colore)
