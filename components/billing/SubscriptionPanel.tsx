"use client";

import { useState, useTransition } from "react";
import { CreditCard, Undo2 } from "lucide-react";
import {
  createBillingPortalSession,
  createCheckoutSession,
  recediAbbonamento,
  type StatoRecesso,
} from "@/app/(artist)/dashboard/abbonamento/_actions";
import { PlanComparison } from "@/components/billing/PlanComparison";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  formatPrice,
  PLAN_LABELS,
  PLAN_PRICES_CENTS,
  type BillingInterval,
  type PaidTier,
} from "@/lib/billing/plans";
import type { ArtistTier } from "@/lib/supabase/types";

type Scelta = { tier: PaidTier; interval: BillingInterval };
type Acquirente = "consumatore" | "professionista";

export function SubscriptionPanel({
  currentTier,
  hasSubscription,
  recesso = { disponibile: false },
}: {
  currentTier: ArtistTier;
  hasSubscription: boolean;
  recesso?: StatoRecesso;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [scelta, setScelta] = useState<Scelta | null>(null);

  function onSelect(tier: PaidTier, interval: BillingInterval) {
    setError(null);
    setScelta({ tier, interval });
  }

  function onPortal() {
    setError(null);
    start(async () => {
      const res = await createBillingPortalSession();
      if (res && !res.ok) setError(res.error ?? "Errore");
    });
  }

  return (
    <div className="space-y-6">
      {hasSubscription && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-medium">Fatturazione</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Cambia piano, aggiorna la carta, scarica le ricevute o disdici. La disdetta ha
                effetto alla fine del periodo già pagato.
              </p>
            </div>
            <Button variant="outline" onClick={onPortal} disabled={pending}>
              <CreditCard className="size-4" />
              {pending ? "Apertura…" : "Gestisci fatturazione"}
            </Button>
          </CardContent>
        </Card>
      )}

      {recesso.disponibile && <RecessoCard stato={recesso} />}

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {scelta ? (
        <ConfermaAbbonamento scelta={scelta} onIndietro={() => setScelta(null)} />
      ) : (
        <PlanComparison
          currentTier={currentTier}
          onSelect={onSelect}
          pending={pending}
          // Chi ha già un piano attivo cambia dal Portal, che gestisce proration e
          // switch: un secondo checkout creerebbe una subscription parallela.
          disabledReason={
            hasSubscription
              ? "Hai già un abbonamento attivo: usa «Gestisci fatturazione» per cambiare piano."
              : undefined
          }
        />
      )}
    </div>
  );
}

/**
 * Il passaggio prima di Stripe: riepilogo e accettazioni (doc. 08, punto G).
 * Le caselle stanno qui e non nella pagina di Stripe perché la prova deve
 * restare a N'arte, con la versione delle condizioni accettata.
 */
function ConfermaAbbonamento({ scelta, onIndietro }: { scelta: Scelta; onIndietro: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [acquirente, setAcquirente] = useState<Acquirente>("consumatore");
  const [condizioni, setCondizioni] = useState(false);
  const [esecuzione, setEsecuzione] = useState(false);
  const [clausole, setClausole] = useState(false);

  const prezzo = formatPrice(PLAN_PRICES_CENTS[scelta.tier][scelta.interval]);
  const periodo = scelta.interval === "month" ? "mese" : "anno";
  const pronto =
    condizioni && (acquirente === "consumatore" ? esecuzione : clausole);

  function onConferma() {
    setError(null);
    start(async () => {
      // In caso di successo la action fa redirect() verso Stripe e non ritorna.
      const res = await createCheckoutSession({
        tier: scelta.tier,
        interval: scelta.interval,
        acquirente,
        accettaCondizioni: condizioni,
        esecuzioneImmediata: acquirente === "consumatore" ? esecuzione : false,
        clausoleSpecifiche: acquirente === "professionista" ? clausole : false,
      });
      if (res && !res.ok) setError(res.error ?? "Errore");
    });
  }

  return (
    <Card>
      <CardContent className="space-y-5 py-6">
        <div>
          <p className="accent-label">riepilogo</p>
          <h3 className="mt-1 font-display text-2xl">
            {PLAN_LABELS[scelta.tier]} — {scelta.interval === "month" ? "mensile" : "annuale"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            <strong className="text-foreground">{prezzo}</strong> ogni {periodo}, prezzo finale
            (operazione senza IVA, regime forfettario). Si rinnova automaticamente allo stesso
            prezzo finché non disdici; puoi disdire quando vuoi dalla pagina Abbonamento.
          </p>
        </div>

        <fieldset className="space-y-2 text-sm">
          <legend className="mb-1 font-medium">Ti abboni come</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="acquirente"
              checked={acquirente === "consumatore"}
              onChange={() => setAcquirente("consumatore")}
            />
            Privato
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="acquirente"
              checked={acquirente === "professionista"}
              onChange={() => setAcquirente("professionista")}
            />
            Con partita IVA (attività professionale o impresa)
          </label>
        </fieldset>

        <div className="space-y-3 text-sm">
          <Casella checked={condizioni} onChange={setCondizioni}>
            Ho letto e accetto le{" "}
            <a
              href="/condizioni-abbonamento"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Condizioni di abbonamento
            </a>
            .
          </Casella>
          {acquirente === "consumatore" ? (
            <Casella checked={esecuzione} onChange={setEsecuzione}>
              Chiedo che l&rsquo;abbonamento inizi subito. So che, se recedo entro 14 giorni,
              pagherò solo la parte di servizio già fruita e mi verrà rimborsato il resto.
            </Casella>
          ) : (
            <Casella checked={clausole} onChange={setClausole}>
              Ai sensi degli artt. 1341 e 1342 c.c. approvo specificamente le clausole indicate in
              fondo alle Condizioni di abbonamento: rinnovo automatico, esclusione di rimborsi per
              il periodo in corso, obbligo di mezzi e rimedio, modifiche di prezzo e servizio,
              sospensione e cessazione.
            </Casella>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <Button onClick={onConferma} disabled={!pronto || pending}>
            {pending ? "Apertura del pagamento…" : "Abbonati con obbligo di pagamento"}
          </Button>
          <Button variant="ghost" onClick={onIndietro} disabled={pending}>
            Scegli un altro piano
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Casella({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2">
      <input
        type="checkbox"
        className="mt-1 size-4 shrink-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

/**
 * La «funzione di recesso» (Dir. UE 2023/2673): ben visibile per tutto il
 * periodo in cui il recesso è esercitabile, a due passaggi per evitare il click
 * accidentale.
 */
function RecessoCard({ stato }: { stato: Extract<StatoRecesso, { disponibile: true }> }) {
  const [pending, start] = useTransition();
  const [conferma, setConferma] = useState(false);
  const [esito, setEsito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scade = new Date(stato.scade).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });

  function onRecedi() {
    setError(null);
    start(async () => {
      const res = await recediAbbonamento();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEsito(
        res.rimborsoInCorso
          ? `Recesso registrato. Rimborso di ${formatPrice(res.rimborsoCent)} sullo stesso metodo di pagamento entro 14 giorni. Ti abbiamo inviato una conferma via email.`
          : "Recesso registrato. Il rimborso verrà eseguito dal team entro 14 giorni: ti abbiamo inviato una conferma via email."
      );
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Recedi dal contratto</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Hai diritto di recedere da {stato.piano} fino al {scade}, senza motivazione.
            </p>
          </div>
          {!conferma && !esito && (
            <Button variant="outline" onClick={() => setConferma(true)}>
              <Undo2 className="size-4" /> Recedi dal contratto qui
            </Button>
          )}
        </div>
        {conferma && !esito && (
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
            <p>
              L&rsquo;abbonamento cessa subito e l&rsquo;account torna al piano Free. Ricevi il
              rimborso del prezzo pagato, meno la parte di servizio già fruita se avevi chiesto di
              iniziare subito. I tuoi contenuti non vengono cancellati.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={onRecedi} disabled={pending}>
                {pending ? "Invio…" : "Confermo il recesso"}
              </Button>
              <Button variant="ghost" onClick={() => setConferma(false)} disabled={pending}>
                Annulla
              </Button>
            </div>
          </div>
        )}
        {esito && <p className="text-sm">{esito}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
