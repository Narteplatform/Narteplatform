"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { LogoUpload } from "@/components/admin/LogoUpload";
import {
  eliminaCollaborazione,
  riordinaCollaborazioni,
  salvaCollaborazione,
} from "@/app/(admin)/admin/contenuti/_actions";

export type CollaborazioneRiga = { id: string; name: string; logo_url: string | null; link: string | null; order_index: number };
type Bozza = { id?: string; name: string; logo_url: string; link: string };

/** Loghi del nastro in home e su /collaborazioni: modifica, ordine, aggiunta ed eliminazione. */
export function CollaborazioniEditor({ voci }: { voci: CollaborazioneRiga[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [nuova, setNuova] = useState<Bozza | null>(null);

  function sposta(i: number, dir: -1 | 1) {
    const ids = voci.map((v) => v.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    start(async () => {
      const res = await riordinaCollaborazioni(ids);
      if (!res.ok) toast.error(res.error ?? "Ordine non salvato");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {voci.map((v, i) => (
        <Scheda
          key={`${v.id}-${v.order_index}`}
          iniziale={{ id: v.id, name: v.name, logo_url: v.logo_url ?? "", link: v.link ?? "" }}
          ordine={
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" disabled={pending || i === 0} onClick={() => sposta(i, -1)} aria-label="Sposta prima">
                <ArrowUp className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={pending || i === voci.length - 1} onClick={() => sposta(i, 1)} aria-label="Sposta dopo">
                <ArrowDown className="size-4" />
              </Button>
            </div>
          }
          onFatto={() => router.refresh()}
        />
      ))}
      {nuova ? (
        <Scheda
          iniziale={nuova}
          onFatto={() => {
            setNuova(null);
            router.refresh();
          }}
          onAnnulla={() => setNuova(null)}
        />
      ) : (
        <Button type="button" variant="outline" onClick={() => setNuova({ name: "", logo_url: "", link: "" })}>
          <Plus className="size-4" aria-hidden="true" /> Aggiungi una collaborazione
        </Button>
      )}
    </div>
  );
}

function Scheda({
  iniziale,
  ordine,
  onFatto,
  onAnnulla,
}: {
  iniziale: Bozza;
  ordine?: React.ReactNode;
  onFatto: () => void;
  onAnnulla?: () => void;
}) {
  const [b, setB] = useState<Bozza>(iniziale);
  const [pending, start] = useTransition();
  const modificata = JSON.stringify(b) !== JSON.stringify(iniziale);
  const id = b.id ?? "nuova";

  function salva() {
    start(async () => {
      const res = await salvaCollaborazione(b);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Salvato: il logo è già online.");
      onFatto();
    });
  }

  function elimina() {
    if (!b.id) return onAnnulla?.();
    if (!window.confirm(`Togliere «${b.name}» dalle collaborazioni? Non si può annullare.`)) return;
    start(async () => {
      const res = await eliminaCollaborazione(b.id as string);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Collaborazione tolta.");
      onFatto();
    });
  }

  return (
    <Card>
      <CardContent className="grid gap-4 pt-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <LogoUpload value={b.logo_url} onChange={(url) => setB({ ...b, logo_url: url })} />
        <div className="space-y-3">
          <div>
            <Label htmlFor={`${id}-nome`}>Nome</Label>
            <Input id={`${id}-nome`} maxLength={120} value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor={`${id}-link`}>Sito (facoltativo)</Label>
            <Input id={`${id}-link`} type="url" maxLength={500} placeholder="https://" value={b.link} onChange={(e) => setB({ ...b, link: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
          {ordine}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={salva} disabled={pending || (!modificata && Boolean(b.id))}>
              {pending ? "…" : b.id ? "Salva" : "Aggiungi"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={elimina} disabled={pending} aria-label={b.id ? "Elimina" : "Annulla"}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
