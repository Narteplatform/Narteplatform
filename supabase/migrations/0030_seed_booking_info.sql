-- =========================================
-- N'arte — Seed Booking information per artisti demo
-- =========================================
-- Riempie i campi della sezione "Informazioni di booking" sui
-- record demo creati in 0002_seed_narte.sql. Idempotente: aggiorna
-- solo gli artisti con slug noto.

update public.artists set
  price_range = 'da €450 (solo voce + chitarra) a €1.200 (formazione completa)',
  gig_min_minutes = 60,
  gig_max_minutes = 180,
  languages = array['Italiano', 'Napoletano'],
  what_to_expect = 'Un live intimo e coinvolgente, tra brani originali e riletture in italiano e dialetto. Set adatto a locali, terrazze, eventi privati e matrimoni. Il sound passa da momenti acustici a brani pi'||chr(249)||' ritmati per coinvolgere il pubblico.',
  about_extended = 'Nasce a Napoli e inizia a scrivere canzoni in adolescenza. Negli ultimi anni ha collaborato con musicisti della scena partenopea, costruendo un repertorio personale che cerca un equilibrio tra il pop contemporaneo e la tradizione cantautoriale italiana.',
  personnel = '[{"name":"Marta Esposito","role":"Voce e chitarra"},{"name":"Davide Russo","role":"Pianoforte"},{"name":"Sara Coppola","role":"Cori e percussioni"}]'::jsonb,
  set_list = 'Estratto repertorio (sostituibile da admin)
- Brano originale 1
- Brano originale 2
- Cover italiana #1
- Cover italiana #2
- Brano in dialetto
- Cover internazionale acustica',
  influences = array['Pino Daniele', 'Carmen Consoli', 'Brunori Sas', 'Norah Jones'],
  setup_requirements = 'PA stereo (min. 2x500W) gestito da fonico del locale.
2 microfoni voce (Shure SM58 o equivalente) con asta dritta.
1 DI box per chitarra acustica + 1 DI box per pianoforte.
2 monitor a pavimento.
Alimentazione: 2 prese 230V dietro al palco.
Palco minimo 4x3 m.'
where slug = 'marta-esposito';

update public.artists set
  price_range = 'da €350 (solo voce + chitarra) a €700 (con sezione ritmica)',
  gig_min_minutes = 60,
  gig_max_minutes = 150,
  languages = array['Italiano'],
  what_to_expect = 'Una serata cantautoriale con chitarra acustica, in cui le parole hanno lo stesso peso della musica. Adatto a wine bar, club, rassegne letterarie ed eventi culturali. Sound caldo, pochi effetti, attenzione al testo.',
  about_extended = 'Romano di nascita, ha iniziato a suonare nei locali della Capitale per poi portare il proprio repertorio in giro per l''Italia. Pubblica in autonomia EP e singoli, costruendo nel tempo un seguito affezionato.',
  personnel = '[{"name":"Luca Romano","role":"Voce e chitarra acustica"},{"name":"Marco Tortolini","role":"Contrabbasso"}]'::jsonb,
  set_list = 'Estratto repertorio (sostituibile da admin)
- Brano originale 1
- Brano originale 2
- Riletture della tradizione cantautoriale italiana
- Cover dal repertorio internazionale rivisitate in italiano',
  influences = array['Fabrizio De Andr'||chr(233)||'', 'Lucio Dalla', 'Niccol'||chr(242)||' Fabi', 'Leonard Cohen'],
  setup_requirements = 'PA stereo gestito dal locale.
1 microfono voce + 1 microfono chitarra (o DI box).
1 monitor a pavimento.
Palco minimo 2x2 m anche acustico.
Possibilit'||chr(224)||' di formato totalmente acustico per spazi piccoli.'
where slug = 'luca-romano';

update public.artists set
  price_range = 'da €600 (trio) a €1.800 (sestetto)',
  gig_min_minutes = 75,
  gig_max_minutes = 210,
  languages = array['Italiano', 'Inglese', 'Napoletano'],
  what_to_expect = 'Set jazz/soul elegante con repertorio che spazia tra grandi standard americani e brani originali. Perfetto per ricevimenti, aperitivi live, eventi corporate, rassegne jazz e matrimoni.',
  about_extended = 'Formata al conservatorio e nei locali di Napoli, porta in scena uno stile che unisce la tradizione jazz alla sensibilit'||chr(224)||' melodica partenopea. Collabora regolarmente con jazz club italiani ed europei.',
  personnel = '[{"name":"Aria Mare","role":"Voce"},{"name":"Stefano Iuliano","role":"Pianoforte"},{"name":"Pasquale Costa","role":"Contrabbasso"},{"name":"Vincenzo Liguori","role":"Batteria"}]'::jsonb,
  set_list = 'Estratto repertorio (sostituibile da admin)
- Standard jazz dal Great American Songbook
- Brani originali della cantante
- Bossa nova e brani in lingua portoghese
- Riletture in chiave jazz di brani della tradizione napoletana',
  influences = array['Ella Fitzgerald', 'Sarah Vaughan', 'Norah Jones', 'Pino Daniele'],
  setup_requirements = 'PA stereo professionale, pianoforte acustico verticale o digitale 88 tasti pesati con stand.
4 microfoni vocali, 1 set microfoni batteria, 1 DI box contrabbasso.
4 monitor a pavimento (uno per musicista).
Alimentazione: 4 prese 230V dietro al palco.
Palco minimo 5x4 m.'
where slug = 'aria-mare';

update public.artists set
  price_range = 'da €400 (DJ set 2h) a €1.500 (DJ + visual + extended set)',
  gig_min_minutes = 90,
  gig_max_minutes = 360,
  languages = array['Italiano', 'Inglese'],
  what_to_expect = 'DJ set di house melodica e progressive, costruito sull''energia del locale. Adatto a club, terrazze, opening party ed eventi privati di fascia alta. Possibilit'||chr(224)||' di abbinare visual sincronizzati.',
  about_extended = 'Producer e DJ con base a Milano, suona regolarmente nei club italiani e ha pubblicato release su etichette indipendenti del circuito house. Affianca al djing la produzione di brani originali e remix.',
  personnel = '[{"name":"DJ Solis","role":"DJ e producer"}]'::jsonb,
  set_list = 'Estratto repertorio (sostituibile da admin)
- Set house melodica (opener)
- Set progressive house (peak time)
- Set deep / afro house (warm down)
- Possibilit'||chr(224)||' di richiedere brani o atmosfere specifiche',
  influences = array['Solomun', 'Black Coffee', 'Tale Of Us', 'Bedouin'],
  setup_requirements = '2 CDJ-3000 (o Pioneer XDJ equivalente) + mixer DJM-900NXS2.
Cuffie del DJ fornite dall''artista.
Cabina DJ illuminata e adeguatamente isolata dal pubblico.
1 monitor cabina dedicato.
Alimentazione: 3 prese 230V in cabina.'
where slug = 'dj-solis';

update public.artists set
  price_range = 'da €500 (formato acustico) a €2.000 (band completa amplificata)',
  gig_min_minutes = 60,
  gig_max_minutes = 120,
  languages = array['Italiano'],
  what_to_expect = 'Rock alternativo cantato in italiano, energico e diretto. Perfetto per club, rassegne live e festival. Possibilit'||chr(224)||' di formato acustico per spazi pi'||chr(249)||' piccoli o set di apertura.',
  about_extended = 'Frontman e autore della band, attivo nella scena alternative bolognese. Pubblica con la formazione album in italiano dal 2019, alternando tour estivi a residenze nei club della citt'||chr(224)||'.',
  personnel = '[{"name":"Federico Conte","role":"Voce e chitarra ritmica"},{"name":"Andrea Vitali","role":"Chitarra solista"},{"name":"Giulio Bernardi","role":"Basso"},{"name":"Mattia Ferri","role":"Batteria"}]'::jsonb,
  set_list = 'Estratto repertorio (sostituibile da admin)
- Brani originali dall''ultimo album
- Brani originali dai dischi precedenti
- 1-2 cover rock italiane riarrangiate
- Brano inedito (anteprima live)',
  influences = array['Verdena', 'Afterhours', 'Marlene Kuntz', 'Arctic Monkeys'],
  setup_requirements = 'PA professionale gestito da fonico del locale (consigliato fonico esperienza rock).
Batteria fornita dal locale (rullante portato dall''artista).
2 amplificatori chitarra + 1 amplificatore basso.
5 microfoni voce/strumenti + microfonatura batteria completa.
4 monitor a pavimento.
Palco minimo 5x4 m.'
where slug = 'federico-conte';

update public.artists set
  price_range = 'da €500 (voce + tastiere) a €1.400 (band 4 elementi)',
  gig_min_minutes = 60,
  gig_max_minutes = 150,
  languages = array['Italiano', 'Inglese'],
  what_to_expect = 'R&B e neo-soul con voce calda e arrangiamenti raffinati. Adatto a lounge, locali di tendenza, aperitivi live, eventi corporate e matrimoni eleganti.',
  about_extended = 'Cresciuta tra Napoli e Londra, sviluppa una voce influenzata dalla scena soul britannica e dalla canzone d''autore italiana. Si esibisce in club e festival, collaborando con producer della scena urban.',
  personnel = '[{"name":"Sara Greco","role":"Voce"},{"name":"Marco Ferraro","role":"Tastiere"},{"name":"Tommaso Lo Russo","role":"Basso"},{"name":"Alessio Borrelli","role":"Batteria/Drum machine"}]'::jsonb,
  set_list = 'Estratto repertorio (sostituibile da admin)
- Brani originali R&B/neo-soul
- Cover soul anni 70 riarrangiate
- Standard soul/R&B contemporanei
- Possibilit'||chr(224)||' di set acustico solo voce + tastiera',
  influences = array['Erykah Badu', 'D''Angelo', 'Jorja Smith', 'Mina'],
  setup_requirements = 'PA stereo.
2 microfoni voce, 1 DI tastiere, 1 DI basso, microfoni batteria/percussioni.
3 monitor a pavimento.
Palco minimo 4x3 m.
Luci ambient consigliate (no flash stroboscopici).'
where slug = 'sara-greco';

update public.artists set
  price_range = 'da €800 (quartetto) a €2.500 (sestetto completo + danzatrici)',
  gig_min_minutes = 75,
  gig_max_minutes = 180,
  languages = array['Italiano', 'Napoletano', 'Pugliese'],
  what_to_expect = 'World music del Mediterraneo: pizzica, tammurriata, sonorit'||chr(224)||' nordafricane e arrangiamenti contemporanei. Ideale per festival, sagre, eventi culturali e matrimoni a tema.',
  about_extended = 'Collettivo nato a Salerno per recuperare e reinterpretare il patrimonio sonoro del Sud Italia. Sei elementi che alternano strumenti tradizionali a strumenti elettrificati, con un repertorio in continua evoluzione.',
  personnel = '[{"name":"Antonio Greco","role":"Voce e tamburello"},{"name":"Lina Galiardi","role":"Voce e organetto"},{"name":"Pasquale Lerro","role":"Mandolino e chitarra battente"},{"name":"Roberto Caputo","role":"Fisarmonica"},{"name":"Vincenzo Sorrentino","role":"Fiati (sax, clarinetto)"},{"name":"Giorgio De Luca","role":"Percussioni"}]'::jsonb,
  set_list = 'Estratto repertorio (sostituibile da admin)
- Pizziche e tarantelle della tradizione
- Tammurriate dell''area vesuviana
- Brani originali di world music
- Brani in lingua napoletana riarrangiati
- Suggestioni mediorientali (oud e percussioni)',
  influences = array['Officina Zo'||chr(232)||'', 'Spakka-Neapolis 55', 'Eugenio Bennato', 'Daniele Sepe'],
  setup_requirements = 'PA professionale con fonico esperto in formazioni acustiche.
6 microfoni voce/strumenti + 4 microfoni per percussioni.
DI per fisarmonica, organetto e mandolino.
4 monitor a pavimento.
Palco minimo 6x4 m.
Spazio per movimento scenico delle danzatrici (se incluse).'
where slug = 'il-collettivo-sud';
