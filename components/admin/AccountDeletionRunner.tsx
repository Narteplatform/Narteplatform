"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  anteprimaCancellazioneAction,
  completaCancellazioneAction,
  type CompletaState,
} from "@/app/(admin)/admin/impostazioni/cancellazioni/_actions";
import type { AnteprimaCompletamento } from "@/lib/legal/completa-cancellazione";

const initial: CompletaState = {};

/**
 * Anteprima + esecuzione per UNA richiesta confermata.
 * L'esecuzione compare solo dopo aver letto un'anteprima senza errori; il
 * server ricalcola tutto comunque: questa interfaccia non è un controllo di
 * sicurezza, è una guida.
 */
export function AccountDeletionRunner({
  richiestaId,
  email,
}: {
  richiestaId: string;
  email: string;
}) {
  const [anteprima, setAnteprima] = useState<AnteprimaCompletamento | null>(null);
  const [erroreAnteprima, setErroreAnteprima] = useState<string | null>(null);
  const [caricamento, avviaLettura] = useTransition();
  const [state, action, pending] = useActionState(completaCancellazioneAction, initial);

  function leggi() {
    setErroreAnteprima(null);
    avviaLettura(async () => {
      const res = await anteprimaCancellazioneAction(richiestaId);
      if (!res.ok) {
        setAnteprima(null);
        setErroreAnteprima(res.error);
        return;
      }
      setAnteprima(res.anteprima);
    });
  }

  const finito = state.esito === "ok";

  return (
    <div className="space-y-4">
      {!finito && (
        <Button type="button" variant="outline" size="sm" onClick={leggi} disabled={caricamento}>
          {caricamento ? "Lettura in corso…" : anteprima ? "Rileggi l'anteprima" : "Anteprima"}
        </Button>
      )}

      {erroreAnteprima && <p className="text-sm text-red-600">{erroreAnteprima}</p>}

      {anteprima && !finito && (
        <div className="space-y-4 rounded-md border border-border p-4">
          {anteprima.bloccanti.length > 0 && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              <p className="font-semibold">Esecuzione bloccata</p>
              <ul className="mt-1 list-disc pl-5">
                {anteprima.bloccanti.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {anteprima.avvisi.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-amber-700">
              {anteprima.avvisi.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}

          <ul className="divide-y divide-border text-sm">
            {anteprima.voci.map((v) => (
              <li key={v.chiave} className="py-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{v.etichetta}</span>
                  {v.errore ? (
                    <span className="text-red-600">lettura fallita</span>
                  ) : (
                    <span className="tabular-nums">{v.conteggio}</span>
                  )}
                </div>
                <p className="text-muted-foreground">{v.azione}</p>
                {v.errore && <p className="text-red-600">{v.errore}</p>}
                {v.note && <p className="text-xs text-muted-foreground">{v.note}</p>}
                {v.dettagli && v.dettagli.length > 0 && (
                  <p className="text-xs text-muted-foreground">{v.dettagli.join(" · ")}</p>
                )}
              </li>
            ))}
          </ul>

          {anteprima.eseguibile && (
            <form action={action} className="space-y-3 border-t border-border pt-4">
              <input type="hidden" name="richiestaId" value={richiestaId} />
              <div>
                <Label htmlFor={`conferma-${richiestaId}`}>Ridigita l&apos;email dell&apos;account</Label>
                <Input
                  id={`conferma-${richiestaId}`}
                  name="confermaEmail"
                  type="email"
                  autoComplete="off"
                  placeholder={email}
                  required
                />
              </div>
              <Checkbox
                name="anteprimaVerificata"
                required
                label="Ho verificato l'anteprima"
              />
              {anteprima.richiedeForzatura && (
                <Checkbox
                  name="forza"
                  required
                  label="Procedo prima dei 30 giorni su richiesta dell'interessato"
                  hint={`Sono passati ${anteprima.richiesta?.giorniTrascorsi ?? 0} giorni dalla conferma.`}
                />
              )}
              <p className="text-xs text-red-700">
                Operazione irreversibile: dati e file di produzione verranno eliminati.
              </p>
              <Button
                type="submit"
                disabled={pending}
                className="bg-red-600 text-white hover:bg-red-700 hover:shadow-none"
              >
                {pending ? "Cancellazione in corso…" : "Completa la cancellazione"}
              </Button>
            </form>
          )}
        </div>
      )}

      {state.esito && (
        <div
          role="status"
          className={
            state.esito === "ok"
              ? "rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
              : "rounded-md bg-red-50 p-3 text-sm text-red-700"
          }
        >
          <p className="font-semibold">{state.messaggio}</p>
          {state.passoFallito && <p>Passo fallito: {state.passoFallito}</p>}
          {state.passiEseguiti && state.passiEseguiti.length > 0 && (
            <p>Passi eseguiti: {state.passiEseguiti.join(", ")}</p>
          )}
          {state.esito === "errore" && state.passoFallito && state.passoFallito !== "verifica" && (
            <p>Non c&apos;è rollback automatico: controlla i log prima di riprovare.</p>
          )}
          {state.avvisi?.map((a) => (
            <p key={a}>{a}</p>
          ))}
        </div>
      )}
    </div>
  );
}
