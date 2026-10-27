"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { MotivazioneField } from "@/components/admin/MotivazioneField";
import {
  approveApplication,
  rejectApplication,
  sbloccaCandidatura,
} from "@/app/(admin)/admin/artisti/_actions";

const REASON_MIN = 10;

type Sblocco = { profiliPrecedenti: { id: string; stage_name: string }[] };

export function ApplicationActions({ applicationId }: { applicationId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  // L'approvazione si è fermata su un account chiuso dall'interessato:
  // compare il pannello «Sblocca account» con le due scelte.
  const [sblocco, setSblocco] = useState<Sblocco | null>(null);
  const [scelta, setScelta] = useState<"ripristina" | "nuovo" | null>(null);
  // Approvata ma email non consegnata: la scheda resta finché l'admin non ha
  // letto l'avviso, altrimenti il refresh la farebbe sparire insieme al messaggio.
  const [avviso, setAvviso] = useState<string | null>(null);
  const router = useRouter();

  if (avviso) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="text-right text-xs text-amber-700">{avviso}</p>
        <Button size="sm" variant="outline" onClick={() => router.refresh()}>
          Ho capito
        </Button>
      </div>
    );
  }

  if (sblocco) {
    const puoRipristinare = sblocco.profiliPrecedenti.length > 0;
    const nomi = sblocco.profiliPrecedenti.map((p) => `«${p.stage_name}»`).join(", ");
    const id = `sblocco-${applicationId}`;
    return (
      <div className="w-80 max-w-full space-y-3 rounded-lg border border-amber-300 bg-amber-50/60 p-3 text-left">
        <div>
          <p className="text-sm font-semibold">Sblocca account</p>
          <p className="text-xs text-muted-foreground">
            Questa persona aveva chiuso il proprio account. Scegli come procedere: in entrambi i casi la
            cancellazione viene annullata e l&apos;accesso riaperto.
          </p>
        </div>
        <fieldset className="space-y-2 text-xs" disabled={pending}>
          <legend className="sr-only">Che fine fa il profilo</legend>
          <label className={`flex items-start gap-2 ${puoRipristinare ? "" : "opacity-50"}`}>
            <input
              type="radio"
              name={`${id}-scelta`}
              className="mt-0.5"
              disabled={!puoRipristinare}
              checked={scelta === "ripristina"}
              onChange={() => setScelta("ripristina")}
            />
            <span>
              <strong>Ripristina il profilo precedente</strong>
              {puoRipristinare
                ? ` ${nomi}, con foto, video e recensioni. La nuova candidatura si chiude senza creare un altro profilo; l'artista riceve un'email e accede con la password di prima.`
                : " — non disponibile: il profilo precedente non esiste più."}
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name={`${id}-scelta`}
              className="mt-0.5"
              checked={scelta === "nuovo"}
              onChange={() => setScelta("nuovo")}
            />
            <span>
              <strong>Approva come profilo nuovo</strong>. Si crea il profilo da questa candidatura e
              l&apos;artista riceve il benvenuto.
              {puoRipristinare && " Il profilo precedente resta nascosto: se non serve più, eliminalo da Artisti."}
            </span>
          </label>
        </fieldset>
        <div className="space-y-1">
          <label className="block text-xs font-semibold" htmlFor={id}>
            Motivazione (obbligatoria, minimo {REASON_MIN} caratteri)
          </label>
          <Textarea
            id={id}
            rows={2}
            value={reason}
            disabled={pending}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Es. l'artista si è ricandidato e ha chiesto di riattivare l'account."
          />
          <p className="text-xs text-muted-foreground">Resta nel registro delle decisioni.</p>
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={pending || !scelta || reason.trim().length < REASON_MIN}
            onClick={() =>
              start(async () => {
                if (!scelta) return;
                setError(null);
                const res = await sbloccaCandidatura(applicationId, scelta, reason.trim());
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setSblocco(null);
                setReason("");
                if (!res.notified) {
                  setAvviso(
                    res.scelta === "ripristina"
                      ? "Profilo precedente ripristinato, ma l'email all'artista non è partita: avvisalo a mano."
                      : "Account sbloccato e candidatura approvata, ma l'email di benvenuto non è partita: avvisa l'artista a mano.",
                  );
                } else router.refresh();
              })
            }
          >
            {pending ? "Attendi…" : "Sblocca e conferma"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setSblocco(null);
              setScelta(null);
              setReason("");
              setError(null);
            }}
          >
            Indietro
          </Button>
        </div>
      </div>
    );
  }

  if (rejecting) {
    return (
      <div className="flex w-72 max-w-full flex-col items-end gap-2">
        <MotivazioneField
          compact
          label="Motivazione del rifiuto"
          disabled={pending}
          onChange={setReason}
          hint="La motivazione viene inviata al candidato per email, con il modo per contestare la decisione."
          className="w-full"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setRejecting(false);
              setReason("");
              setError(null);
            }}
          >
            Annulla
          </Button>
          <Button
            size="sm"
            disabled={pending || reason.trim().length < REASON_MIN}
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await rejectApplication(applicationId, reason.trim());
                if (!res.ok) setError(res.error ?? "Errore");
                else router.refresh();
              })
            }
          >
            {pending ? "Invio…" : "Conferma rifiuto"}
          </Button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await approveApplication(applicationId);
              if (!res.ok) {
                if ("sblocco" in res && res.sblocco) {
                  setSblocco(res.sblocco);
                  setScelta(res.sblocco.profiliPrecedenti.length > 0 ? null : "nuovo");
                } else setError(res.error ?? "Errore");
              } else if (!res.notified)
                setAvviso("Candidatura approvata, ma l'email di benvenuto non è partita: avvisa l'artista a mano.");
              else router.refresh();
            })
          }
        >
          Approva
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejecting(true)}>
          Rifiuta
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
