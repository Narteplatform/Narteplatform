-- =========================================
-- N'arte — 0034 venue_type 'privato'
-- Aggiunge il valore 'privato' all'enum venue_type_enum.
-- File dedicato: ALTER TYPE ... ADD VALUE non può essere usato nella
-- stessa transazione in cui il valore viene poi referenziato.
-- Idempotente (IF NOT EXISTS, PG12+).
-- =========================================

alter type venue_type_enum add value if not exists 'privato';
