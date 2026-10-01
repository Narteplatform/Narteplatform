-- 0069 — Nuovo stato del booking: «accettata»
--
-- CONTESTO
-- Il cliente chiede una doppia conferma: quando l'ARTISTA accetta l'offerta,
-- la richiesta diventa «accettata» e resta in attesa; solo la conferma
-- dell'ORGANIZZATORE la porta a «confermata» e blocca la data.
--
-- PERCHÉ UN FILE A SÉ
-- Un valore aggiunto a un enum non si può usare nella stessa transazione in
-- cui lo si crea. La 0070, che lo usa nelle funzioni, va eseguita DOPO questa,
-- come comando separato nel SQL editor.
--
-- Additiva: aggiunge un valore, non tocca righe esistenti.

alter type public.booking_status_enum add value if not exists 'accettata' after 'in_trattativa';
