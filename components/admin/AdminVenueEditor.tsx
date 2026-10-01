"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { MotivazioneField } from "@/components/admin/MotivazioneField";
import {
  aggiornaStrutturaAction,
  nascondiStrutturaAction,
} from "@/app/(admin)/admin/utenti/_actions";

export type AdminVenue = {
  id: string;
  name: string;
  venue_type: "club" | "pub" | "festival" | "teatro" | "locale" | "privato" | "altro";
  city: string | null;
  region: string | null;
  address: string | null;
  postal_code: string | null;
  capacity: number | null;
  description: string | null;
  website: string | null;
  instagram: string | null;
  phone: string | null;
  email: string | null;
  hidden_at: string | null;
};

const TIPI: AdminVenue["venue_type"][] = ["club", "pub", "festival", "teatro", "locale", "privato", "altro"];

/**
 * Una struttura di un organizzatore, vista dal Team: campi principali
 * modificabili e Nascondi/Mostra con motivazione. Entrambe le azioni scrivono
 * nel registro e avvisano l'organizzatore.
 */
export function AdminVenueEditor({ venue }: { venue: AdminVenue }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [modifica, setModifica] = useState(false);
  const [nascondi, setNascondi] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [motivoModifica, setMotivoModifica] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [f, setF] = useState({
    name: venue.name,
    venue_type: venue.venue_type,
    city: venue.city ?? "",
    region: venue.region ?? "",
    address: venue.address ?? "",
    postal_code: venue.postal_code ?? "",
    capacity: venue.capacity === null ? "" : String(venue.capacity),
    description: venue.description ?? "",
    website: venue.website ?? "",
    instagram: venue.instagram ?? "",
    phone: venue.phone ?? "",
    email: venue.email ?? "",
  });
  const nascosta = Boolean(venue.hidden_at);

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  function salva() {
    setMsg(null);
    const cap = f.capacity.trim();
    const capacity = cap === "" ? null : Number(cap);
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 0)) {
      setMsg({ tone: "err", text: "La capienza deve essere un numero intero." });
      return;
    }
    start(async () => {
      const res = await aggiornaStrutturaAction(
        { venueId: venue.id, ...f, capacity },
        motivoModifica || undefined,
      );
      if (!res.ok) {
        setMsg({ tone: "err", text: res.error });
        return;
      }
      setMsg({
        tone: "ok",
        text: motivoModifica
          ? res.notified
            ? "Salvato. L'organizzatore è stato avvisato via email."
            : "Salvato, ma l'email all'organizzatore non è partita."
          : "Salvato.",
      });
      setModifica(false);
      router.refresh();
    });
  }

  function conferma() {
    setMsg(null);
    start(async () => {
      const res = await nascondiStrutturaAction(venue.id, !nascosta, motivo);
      if (!res.ok) {
        setMsg({ tone: "err", text: res.error });
        return;
      }
      setMsg({
        tone: "ok",
        text: res.notified
          ? "Fatto. L'organizzatore è stato avvisato via email."
          : "Fatto, ma l'email all'organizzatore non è partita.",
      });
      setNascondi(false);
      setMotivo("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{venue.name}</span>
        <span className="text-xs text-muted-foreground">
          {[venue.city, venue.venue_type].filter(Boolean).join(" · ")}
        </span>
        {nascosta && <Badge variant="warning">Nascosta dal team</Badge>}
        <div className="ml-auto flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setModifica((v) => !v)}>
            {modifica ? "Chiudi modifica" : "Modifica"}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setNascondi((v) => !v)}>
            {nascosta ? "Mostra" : "Nascondi"}
          </Button>
        </div>
      </div>

      {modifica && (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor={`n-${venue.id}`}>Nome</Label>
            <Input id={`n-${venue.id}`} value={f.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`t-${venue.id}`}>Tipo</Label>
            <select
              id={`t-${venue.id}`}
              value={f.venue_type}
              onChange={(e) => set("venue_type", e.target.value as AdminVenue["venue_type"])}
              className="h-10 w-full rounded-md border-[1.5px] border-border bg-surface px-2 text-sm"
            >
              {TIPI.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor={`c-${venue.id}`}>Città</Label>
            <Input id={`c-${venue.id}`} value={f.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`r-${venue.id}`}>Regione</Label>
            <Input id={`r-${venue.id}`} value={f.region} onChange={(e) => set("region", e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`a-${venue.id}`}>Indirizzo</Label>
            <Input id={`a-${venue.id}`} value={f.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`p-${venue.id}`}>CAP</Label>
            <Input id={`p-${venue.id}`} value={f.postal_code} onChange={(e) => set("postal_code", e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`k-${venue.id}`}>Capienza</Label>
            <Input id={`k-${venue.id}`} inputMode="numeric" value={f.capacity} onChange={(e) => set("capacity", e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`e-${venue.id}`}>Email</Label>
            <Input id={`e-${venue.id}`} value={f.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`w-${venue.id}`}>Sito web</Label>
            <Input id={`w-${venue.id}`} value={f.website} onChange={(e) => set("website", e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`i-${venue.id}`}>Instagram</Label>
            <Input id={`i-${venue.id}`} value={f.instagram} onChange={(e) => set("instagram", e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`h-${venue.id}`}>Telefono</Label>
            <Input id={`h-${venue.id}`} value={f.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor={`d-${venue.id}`}>Descrizione</Label>
            <Textarea id={`d-${venue.id}`} rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <MotivazioneField
              compact
              label="Motivazione (facoltativa: se la indichi, l'organizzatore viene avvisato)"
              disabled={pending}
              onChange={setMotivoModifica}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="button" size="sm" disabled={pending} onClick={salva}>
              {pending ? "Salvo…" : "Salva modifiche"}
            </Button>
          </div>
        </div>
      )}

      {nascondi && (
        <div className="max-w-md space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-semibold">{nascosta ? "Mostra di nuovo la struttura" : "Nascondi la struttura"}</p>
          <MotivazioneField
            compact
            label="Motivazione (obbligatoria)"
            disabled={pending}
            onChange={setMotivo}
            hint="Viene inviata all'organizzatore per email, con il collegamento per presentare reclamo."
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={pending || !motivo} onClick={conferma}>
              {pending ? "Attendi…" : "Conferma"}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setNascondi(false)}>
              Annulla
            </Button>
          </div>
        </div>
      )}

      {msg && (
        <p role={msg.tone === "err" ? "alert" : "status"} className={`text-xs ${msg.tone === "ok" ? "text-muted-foreground" : "text-corallo"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
