-- =========================================
-- N'arte — percorso_artistico: stop alla cancellazione su downgrade
-- =========================================
-- Richiede 0038 e 0039.
--
-- Il problema. 0022 ha introdotto:
--     create trigger artists_validate_tier_path_trg
--       before insert or update of tier, percorso_artistico on public.artists
--     → if new.percorso_artistico is not null and new.tier = 'free'
--          then new.percorso_artistico := null;
--
-- Cioè: quando il tier scende a 'free', il percorso artistico viene
-- DISTRUTTO, non nascosto. Finché il tier era un'etichetta che solo il
-- superadmin muoveva a mano, il danno era teorico. Da adesso il tier oscilla
-- da solo a ogni evento Stripe: carta scaduta, disdetta, fine trial. Ogni
-- oscillazione cancellerebbe in modo silenzioso e permanente un dato che
-- l'artista ha compilato, e che dovrebbe ricompilare a ogni riabbonamento.
--
-- La regola giusta: il downgrade toglie VISIBILITÀ, non DATI. Il percorso
-- resta in tabella e smette di comparire sul profilo pubblico; l'upgrade lo
-- ripristina all'istante. È lo stesso principio del soft cap su gallery,
-- audio e video (vedi lib/billing/entitlements.ts → checkCollectionLimit).
--
-- Cosa cambia qui:
--   - su INSERT la validazione resta (un artista nuovo nasce coerente);
--   - su UPDATE il valore non viene più azzerato;
--   - la visibilità è gated in lettura via entitlements.canSetPercorso, e la
--     scrittura è gated nella Server Action updateArtistProfile.
--
-- Idempotente.

create or replace function public.artists_validate_tier_path()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Solo in INSERT: un artista appena creato non può nascere con un percorso
  -- che il suo piano non prevede.
  if tg_op = 'INSERT'
     and new.percorso_artistico is not null
     and new.tier = 'free' then
    new.percorso_artistico := null;
  end if;

  -- In UPDATE il dato si conserva sempre. Il downgrade lo nasconde, non lo
  -- cancella: azzerarlo qui renderebbe la perdita irreversibile e invisibile.
  return new;
end;
$$;

-- Il trigger non serve più su `tier`: l'unico caso che tratta è l'INSERT.
-- Tenerlo agganciato a `update of tier` significherebbe farlo scattare a ogni
-- sync_artist_tier() per non fare nulla.
drop trigger if exists artists_validate_tier_path_trg on public.artists;
create trigger artists_validate_tier_path_trg
  before insert on public.artists
  for each row execute function public.artists_validate_tier_path();

comment on column public.artists.percorso_artistico is
  'Visibile sul profilo pubblico solo con piano pro/max. Su downgrade viene NASCOSTO, mai cancellato: l''upgrade lo ripristina. Gate di lettura in lib/billing/entitlements.ts, gate di scrittura in updateArtistProfile.';
