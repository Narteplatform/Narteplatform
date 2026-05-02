# Design System

Il design replica la reference fornita: tipografia bold all-caps, layout monocromatico con accenti arancio, hero "EVENT GUIDE" con immagine clip-path nel testo.

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
| `--font-sans` | Inter | Body |
| `--font-display` | Archivo Black | Display all-caps |
| `--radius-pill` | `999px` | Bottoni pill |

## Tipografia

- **Display** (`.font-display` / `.display-xl`): Archivo Black, all-caps, tracking stretto (`-0.02em`), line-height 0.9 per il display gigante. Usato per hero, titoli sezione, bottoni di CTA.
- **Body**: Inter 400/500. 14px-16px per il testo, 12px per micro-label.
- **Accent label** (`.accent-label`): arancio, 14px, lowercase. Usato per il piccolo eyebrow sopra i titoli di sezione.

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
