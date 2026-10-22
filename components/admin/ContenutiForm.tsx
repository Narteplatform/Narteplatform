"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { CHIAVI_CONTENUTI, CONTENUTI, type ChiaveContenuto, type Contenuti } from "@/lib/content/site-settings";
import { salvaContenuti } from "@/app/(admin)/admin/contenuti/_actions";

export function ContenutiForm({ valori, salvati }: { valori: Contenuti; salvati: string[] }) {
  const [bozza, setBozza] = useState<Contenuti>(valori);
  const [base, setBase] = useState<Contenuti>(valori);
  const [esito, setEsito] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [pending, start] = useTransition();

  const gruppi = useMemo(() => {
    const m = new Map<string, ChiaveContenuto[]>();
    for (const k of CHIAVI_CONTENUTI) {
      const g = CONTENUTI[k].gruppo;
      m.set(g, [...(m.get(g) ?? []), k]);
    }
    return [...m.entries()];
  }, []);

  const modificati = CHIAVI_CONTENUTI.filter((k) => bozza[k] !== base[k]);

  function salva(e: React.FormEvent) {
    e.preventDefault();
    setEsito(null);
    const daInviare: Partial<Contenuti> = {};
    for (const k of modificati) daInviare[k] = bozza[k];
    start(async () => {
      const res = await salvaContenuti(daInviare);
      if (!res.ok) {
        setEsito({ tipo: "errore", testo: res.error });
        return;
      }
      setBase(bozza);
      setEsito({
        tipo: "ok",
        testo: res.cambiati === 0 ? "Nessuna modifica da salvare." : "Salvato: le modifiche sono online.",
      });
    });
  }

  return (
    <form onSubmit={salva} className="space-y-6">
      {gruppi.map(([gruppo, chiavi]) => (
        <Card key={gruppo}>
          <CardHeader>
            <CardTitle className="text-base">{gruppo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {chiavi.map((k) => {
              const def = CONTENUTI[k];
              const id = `contenuto-${k}`;
              const diverso = bozza[k] !== def.predefinito;
              return (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={id}>{def.etichetta}</Label>
                  {def.tipo === "testo-lungo" ? (
                    <Textarea
                      id={id}
                      rows={3}
                      maxLength={def.max}
                      value={bozza[k]}
                      onChange={(e) => setBozza({ ...bozza, [k]: e.target.value })}
                    />
                  ) : (
                    <Input
                      id={id}
                      type={def.tipo === "url" ? "url" : def.tipo === "telefono" ? "tel" : "text"}
                      maxLength={def.max}
                      value={bozza[k]}
                      onChange={(e) => setBozza({ ...bozza, [k]: e.target.value })}
                    />
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{"aiuto" in def ? def.aiuto : null}</span>
                    {diverso && (
                      <button
                        type="button"
                        className="underline-offset-2 hover:text-foreground hover:underline"
                        onClick={() => setBozza({ ...bozza, [k]: def.predefinito })}
                      >
                        Ripristina il testo originale
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
        <Button type="submit" disabled={pending || modificati.length === 0}>
          {pending ? "Salvataggio…" : "Salva modifiche"}
        </Button>
        {modificati.length > 0 && !pending && (
          <span className="text-xs text-muted-foreground">
            {modificati.length === 1 ? "1 campo modificato" : `${modificati.length} campi modificati`}
          </span>
        )}
        {esito && (
          <span role="status" className={esito.tipo === "ok" ? "text-sm text-green-700" : "text-sm text-red-600"}>
            {esito.testo}
          </span>
        )}
        {salvati.length === 0 && modificati.length === 0 && !esito && (
          <span className="text-xs text-muted-foreground">Il sito mostra i testi originali.</span>
        )}
      </div>
    </form>
  );
}
