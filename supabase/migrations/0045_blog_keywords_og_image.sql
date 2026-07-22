-- =========================================
-- N'arte — Blog: keywords + og_image
-- =========================================
-- Additivo, idempotente, NON distruttivo: aggiunge due colonne SEO alla
-- tabella blog_posts senza toccare i dati esistenti.
--   - keywords: array di parole chiave SEO (default array vuoto)
--   - og_image: immagine Open Graph dedicata (fallback: cover_image)
-- RLS e trigger updated_at esistenti coprono già le nuove colonne.

alter table public.blog_posts
  add column if not exists keywords text[] not null default '{}';

alter table public.blog_posts
  add column if not exists og_image text;
