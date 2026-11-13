"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { VerificaCodice } from "@/app/(auth)/auth/mfa/VerificaCodice";

type Stato =
  | { fase: "lettura" }
  | { fase: "errore"; messaggio: string }
  | { fase: "spenta" }
  | { fase: "attivazione"; factorId: string; qr: string; segreto: string }
  | { fase: "attiva"; factorId: string; verificata: boolean };

/**
 * Attivazione e disattivazione della verifica in due passaggi (TOTP di
 * Supabase): enroll → QR → verifica del primo codice; per disattivare serve
 * una sessione già verificata (aal2), quindi prima si chiede il codice.
 */
export function GestioneMfa({ obbligatoria }: { obbligatoria: boolean }) {
  const router = useRouter();
  const [stato, setStato] = useState<Stato>({ fase: "lettura" });
  const [lavoro, setLavoro] = useState(false);
  const [avviso, setAvviso] = useState<string | null>(null);

  const leggi = useCallback(async () => {
    try {
      const supabase = createClient();
      const [fattori, livello] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);
      if (fattori.error) throw fattori.error;
      const attivo = fattori.data.totp[0];
      if (attivo) {
        setStato({
          fase: "attiva",
          factorId: attivo.id,
          verificata: !livello.error && livello.data?.currentLevel === "aal2",
        });
      } else {
        setStato({ fase: "spenta" });
      }
    } catch {
      setStato({ fase: "errore", messaggio: "Non riesco a leggere lo stato della verifica. Ricarica la pagina." });
    }
  }, []);

  useEffect(() => {
    void leggi();
  }, [leggi]);

  async function attiva() {
    setAvviso(null);
    setLavoro(true);
    try {
      const supabase = createClient();
      // Fattori lasciati a metà da un tentativo precedente: si tolgono, così
      // non restano voci «non verificate» e il nuovo QR è l'unico valido.
      const elenco = await supabase.auth.mfa.listFactors();
      if (!elenco.error) {
        for (const f of elenco.data.all) {
          if (f.factor_type === "totp" && f.status === "unverified") {
            await supabase.auth.mfa.unenroll({ factorId: f.id });
          }
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `N'arte ${new Date().toISOString().slice(0, 16)}`,
      });
      if (error || !data) {
        setAvviso("Attivazione non riuscita. Riprova fra poco.");
        return;
      }
      setStato({ fase: "attivazione", factorId: data.id, qr: data.totp.qr_code, segreto: data.totp.secret });
    } catch {
      setAvviso("Attivazione non riuscita. Riprova fra poco.");
    } finally {
      setLavoro(false);
    }
  }

  async function disattiva(factorId: string) {
    if (!window.confirm("Disattivare la verifica in due passaggi? L'account sarà protetto solo dalla password.")) return;
    setAvviso(null);
    setLavoro(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        setAvviso("Disattivazione non riuscita: verifica di nuovo il codice e riprova.");
        return;
      }
      // Il livello della sessione scende: si rinnova il token per allinearlo.
      await supabase.auth.refreshSession().catch(() => null);
      setStato({ fase: "spenta" });
      router.refresh();
    } catch {
      setAvviso("Disattivazione non riuscita. Riprova.");
    } finally {
      setLavoro(false);
    }
  }

  return (
    <div className="space-y-5">
      {obbligatoria && stato.fase === "spenta" && (
        <p role="alert" className="rounded-xl border border-corallo/30 bg-corallo/10 px-4 py-3 text-sm">
          Per entrare nel pannello di amministrazione la verifica in due passaggi è obbligatoria:
          attivala qui sotto.
        </p>
      )}

      {stato.fase === "lettura" && <div className="h-24 animate-pulse rounded-xl bg-muted" />}

      {stato.fase === "errore" && (
        <p role="alert" className="flex items-start gap-2 text-sm text-corallo-dark">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {stato.messaggio}
        </p>
      )}

      {stato.fase === "spenta" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Oltre alla password, all&rsquo;accesso ti chiederemo un codice generato da
            un&rsquo;app sul telefono (Google Authenticator, Authy, 1Password, l&rsquo;app Password
            di iPhone…).
          </p>
          <Button type="button" onClick={attiva} disabled={lavoro}>
            {lavoro ? "Preparazione…" : "Attiva la verifica in due passaggi"}
          </Button>
        </div>
      )}

      {stato.fase === "attivazione" && (
        <div className="space-y-5">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Apri l&rsquo;app di autenticazione e aggiungi un account.</li>
            <li>Inquadra il codice QR, oppure inserisci a mano la chiave qui sotto.</li>
            <li>Scrivi il codice di 6 cifre che compare nell&rsquo;app.</li>
          </ol>
          <div className="inline-block rounded-xl bg-white p-3">
            {/* SVG generato da Supabase, in data URI: niente richieste esterne. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={stato.qr} alt="Codice QR per l'app di autenticazione" width={180} height={180} />
          </div>
          <p className="text-sm">
            Chiave: <code className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{stato.segreto}</code>
          </p>
          <div className="max-w-xs">
            <VerificaCodice
              factorId={stato.factorId}
              etichettaPulsante="Conferma e attiva"
              onVerificato={() => {
                setAvviso(null);
                setStato({ fase: "attiva", factorId: stato.factorId, verificata: true });
                router.refresh();
              }}
            />
          </div>
        </div>
      )}

      {stato.fase === "attiva" && (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-green-600" />
            La verifica in due passaggi è attiva.
          </p>
          {stato.verificata ? (
            <Button type="button" variant="outline" onClick={() => disattiva(stato.factorId)} disabled={lavoro}>
              {lavoro ? "Disattivazione…" : "Disattiva"}
            </Button>
          ) : (
            <div className="max-w-xs space-y-3">
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                Per modificarla inserisci prima il codice dell&rsquo;app.
              </p>
              <VerificaCodice
                factorId={stato.factorId}
                etichettaPulsante="Verifica"
                onVerificato={() => {
                  setStato({ fase: "attiva", factorId: stato.factorId, verificata: true });
                  router.refresh();
                }}
              />
            </div>
          )}
        </div>
      )}

      {avviso && (
        <p role="alert" className="flex items-start gap-2 text-sm text-corallo-dark">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {avviso}
        </p>
      )}
    </div>
  );
}
