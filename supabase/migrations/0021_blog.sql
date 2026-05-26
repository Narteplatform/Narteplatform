-- =========================================
-- N'arte — Blog
-- =========================================
-- Tabella blog_posts (lista + dettaglio + admin CRUD)
-- + articolo seed ottimizzato SEO
-- Idempotente.

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  cover_image text,
  content text not null,
  seo_title text,
  seo_description text,
  author_name text not null default 'N''arte',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_published_idx
  on public.blog_posts(published_at desc nulls last);

alter table public.blog_posts enable row level security;

drop policy if exists "blog_posts public read published" on public.blog_posts;
create policy "blog_posts public read published"
  on public.blog_posts for select
  using (published_at is not null or public.is_superadmin(auth.uid()));

drop policy if exists "blog_posts superadmin all" on public.blog_posts;
create policy "blog_posts superadmin all"
  on public.blog_posts for all
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));

-- Trigger updated_at
create or replace function public.touch_blog_posts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists blog_posts_touch_updated_at on public.blog_posts;
create trigger blog_posts_touch_updated_at
  before update on public.blog_posts
  for each row execute function public.touch_blog_posts_updated_at();

-- =========================================
-- Articolo seed SEO
-- =========================================
insert into public.blog_posts
  (slug, title, excerpt, cover_image, content, seo_title, seo_description, author_name, published_at)
values (
  'come-scegliere-artista-musicale-evento-live',
  'Come scegliere l''artista musicale perfetto per il tuo evento live',
  'Una guida pratica per organizzatori e brand: come selezionare l''artista emergente giusto per il tuo evento, fissare un budget realistico e gestire la trattativa senza stress.',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80',
  '<h2>Perché la scelta dell''artista cambia tutto</h2>
<p>Quando organizzi un <strong>evento musicale dal vivo</strong>, l''artista che sceglierai definisce l''atmosfera, attira il pubblico giusto e costruisce il ricordo dell''esperienza. Affidarsi a un nome conosciuto è la via più semplice, ma anche la più costosa: scegliere un <em>artista emergente</em> ti permette spesso di portare a casa una performance autentica, energica e dal forte impatto, senza far esplodere il budget.</p>

<h2>1. Definisci il format dell''evento prima dell''artista</h2>
<p>Prima ancora di pensare al booking, chiarisci tre cose:</p>
<ul>
  <li><strong>Tipo di evento</strong>: club night, festival outdoor, evento privato, inaugurazione, matrimonio.</li>
  <li><strong>Pubblico target</strong>: età, gusti musicali, livello di attenzione (cena seduti vs. pista da ballo).</li>
  <li><strong>Mood desiderato</strong>: intimo e acustico, festoso e ballabile, sperimentale, nostalgico.</li>
</ul>
<p>Solo a questo punto puoi cercare l''artista giusto. Un cantautore introspettivo non funziona alle 2 di notte in club, così come una band tribute funky non è la scelta migliore per una cena di gala.</p>

<h2>2. Cerca tra gli artisti emergenti italiani</h2>
<p>L''Italia è piena di talenti che meritano di essere ascoltati. Cercare sulle piattaforme dedicate al <strong>booking artisti live</strong> ti permette di filtrare per genere, città, fascia di prezzo e tipologia di progetto: <em>cover artist</em>, <em>tribute band</em> o <em>progetto inedito</em>.</p>
<p>Su N''arte trovi profili verificati, audio originali, video di performance reali e disponibilità in tempo reale. Niente intermediari nascosti: parli direttamente con l''artista o con il suo team.</p>

<h2>3. Valuta il fit con tre domande chiave</h2>
<ol>
  <li><strong>L''artista ha esperienza live coerente con il tuo format?</strong> Una serata in pub e un open-air per 5.000 persone richiedono setup, energia e tecnica diversi.</li>
  <li><strong>Il repertorio è adatto al tuo pubblico?</strong> Chiedi scaletta indicativa o esempi di set precedenti.</li>
  <li><strong>Quanto è flessibile sulla durata e sulla struttura del set?</strong> Un buon artista live sa adattarsi al ritmo della serata.</li>
</ol>

<h2>4. Stabilisci un budget realistico</h2>
<p>Per un artista emergente di buon livello, in Italia, le fasce indicative sono:</p>
<ul>
  <li><strong>Budget</strong> (250-600€): solisti, duo acustici, DJ set in locali piccoli.</li>
  <li><strong>Standard</strong> (600-1500€): band complete in club medi, tribute band per eventi privati.</li>
  <li><strong>Premium</strong> (1500-4000€): band con following locale forte, headliner per festival emergenti.</li>
  <li><strong>Luxury</strong> (4000€+): nomi consolidati con management dedicato.</li>
</ul>
<p>Ricordati di includere nel budget anche <strong>service audio/luci, SIAE, eventuali rimborsi viaggio e ospitalità</strong>. Una richiesta di booking trasparente, con tutti questi punti chiari fin dall''inizio, evita malintesi e velocizza la trattativa.</p>

<h2>5. Gestisci la trattativa in modo professionale</h2>
<p>Quando contatti un artista, fornisci subito le informazioni essenziali:</p>
<ul>
  <li>Data, città e luogo dell''evento.</li>
  <li>Durata richiesta del set.</li>
  <li>Tipo di pubblico e capienza.</li>
  <li>Budget di massima e cosa è incluso (service, alloggio, pasti).</li>
</ul>
<p>Più sei chiaro all''inizio, più rapidamente otterrai una risposta concreta. Su N''arte questo dialogo avviene in chat dedicata, con offerte tracciate e conferma sicura quando entrambe le parti sono allineate.</p>

<h2>Conclusione</h2>
<p>Scegliere l''artista giusto è un mix di intuizione e metodo: parti dal format, restringi il campo per genere e tipologia, valuta il fit con il pubblico, allinea il budget e gestisci la trattativa in modo trasparente. Con gli strumenti giusti puoi costruire eventi che lasciano il segno, valorizzando al tempo stesso la scena emergente italiana.</p>

<p><a href="/artisti">Esplora i nostri artisti</a> e trova il prossimo nome che farà brillare il tuo evento.</p>',
  'Come scegliere l''artista musicale giusto per il tuo evento live | N''arte',
  'Guida pratica per organizzatori: scegliere l''artista emergente perfetto per il tuo evento musicale dal vivo, definire il budget e gestire la trattativa di booking.',
  'N''arte',
  now()
)
on conflict (slug) do nothing;
