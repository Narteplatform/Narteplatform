"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { eliminaTappa, riordinaTappe, salvaTappa } from "@/app/(admin)/admin/contenuti/_actions";
import type { TappaRiga } from "@/lib/content/milestones-server";

type Bozza = Omit<TappaRiga, "id" | "order_index" | "photo_url"> & { id?: string; photo_url: string };

const VUOTA: Bozza = { year_label: "", date_label: "", title: "", description: "", photo_url: "", photo_alt: "" };

function aBozza(t: TappaRiga): Bozza {
  return { ...t, photo_url: t.photo_url ?? "" };
}

/** Elenco delle tappe di Chi siamo: modifica, foto, ordine, aggiunta ed eliminazione. */
export function TappeEditor({ tappe }: { tappe: TappaRiga[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [nuova, setNuova] = useState<Bozza | null>(null);

  function sposta(i: number, dir: -1 | 1) {
    const ids = tappe.map((t) => t.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    start(async () => {
      const res = await riordinaTappe(ids);
      if (!res.ok) toast.error(res.error ?? "Ordine non salvato");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {tappe.length === 0 && !nuova && (
        <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          Nessuna tappa: la linea del tempo non compare su Chi siamo.
        </p>
      )}
      {tappe.map((t, i) => (
        <SchedaTappa
          key={`${t.id}-${t.order_index}`}
          iniziale={aBozza(t)}
          numero={i + 1}
          azioniOrdine={
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" disabled={pending || i === 0} onClick={() => sposta(i, -1)} aria-label="Sposta prima">
                <ArrowUp className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={pending || i === tappe.length - 1} onClick={() => sposta(i, 1)} aria-label="Sposta dopo">
                <ArrowDown className="size-4" />
              </Button>
            </div>
          }
          onSalvata={() => router.refresh()}
        />
      ))}

      {nuova ? (
        <SchedaTappa
          iniziale={nuova}
          numero={tappe.length + 1}
          onSalvata={() => {
            setNuova(null);
            router.refresh();
          }}
          onAnnulla={() => setNuova(null)}
        />
      ) : (
        <Button type="button" variant="outline" onClick={() => setNuova({ ...VUOTA })}>
          <Plus className="size-4" aria-hidden="true" /> Aggiungi una tappa
        </Button>
      )}
    </div>
  );
}

function SchedaTappa({
  iniziale,
  numero,
  azioniOrdine,
  onSalvata,
  onAnnulla,
}: {
  iniziale: Bozza;
  numero: number;
  azioniOrdine?: React.ReactNode;
  onSalvata: () => void;
  onAnnulla?: () => void;
}) {
  const [b, setB] = useState<Bozza>(iniziale);
  const [pending, start] = useTransition();
  const modificata = JSON.stringify(b) !== JSON.stringify(iniziale);
  const id = b.id ?? "nuova";

  function salva() {
    start(async () => {
      const res = await salvaTappa(b);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Tappa salvata: è già online.");
      onSalvata();
    });
  }

  function elimina() {
    if (!b.id) return onAnnulla?.();
    if (!window.confirm(`Eliminare la tappa «${b.title}»? Non si può annullare.`)) return;
    start(async () => {
      const res = await eliminaTappa(b.id as string);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Tappa eliminata.");
      onSalvata();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {b.id ? `Tappa ${numero}` : "Nuova tappa"}
          </p>
          {azioniOrdine}
        </div>
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <ImageUpload
            label="Foto"
            kind="site_square"
            value={b.photo_url}
            onChange={(url) => setB({ ...b, photo_url: url })}
          />
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${id}-anno`}>Anno sulla linea</Label>
                <Input id={`${id}-anno`} maxLength={20} placeholder="es. 2018 (vuoto = senza data)" value={b.year_label} onChange={(e) => setB({ ...b, year_label: e.target.value })} />
              </div>
              <div>
                <Label htmlFor={`${id}-data`}>Data estesa</Label>
                <Input id={`${id}-data`} maxLength={60} placeholder="es. Marzo 2018" value={b.date_label} onChange={(e) => setB({ ...b, date_label: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor={`${id}-titolo`}>Titolo</Label>
              <Input id={`${id}-titolo`} maxLength={120} value={b.title} onChange={(e) => setB({ ...b, title: e.target.value })} />
            </div>
            <div>
              <Label htmlFor={`${id}-testo`}>Racconto</Label>
              <Textarea id={`${id}-testo`} rows={4} maxLength={1200} value={b.description} onChange={(e) => setB({ ...b, description: e.target.value })} />
            </div>
            <div>
              <Label htmlFor={`${id}-alt`}>Descrizione della foto (per chi non vede)</Label>
              <Input id={`${id}-alt`} maxLength={200} value={b.photo_alt} onChange={(e) => setB({ ...b, photo_alt: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={salva} disabled={pending || (!modificata && Boolean(b.id))}>
            {pending ? "Salvataggio…" : b.id ? "Salva tappa" : "Aggiungi tappa"}
          </Button>
          <Button type="button" variant="ghost" onClick={elimina} disabled={pending}>
            <Trash2 className="size-4" aria-hidden="true" /> {b.id ? "Elimina" : "Annulla"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
