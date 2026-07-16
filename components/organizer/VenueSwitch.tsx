"use client";

import { useRouter } from "next/navigation";

export function VenueSwitch({
  venues,
  selected,
}: {
  venues: { id: string; name: string }[];
  selected: string | null;
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Struttura:</span>
      <select
        defaultValue={selected ?? ""}
        className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        onChange={(e) => {
          const v = e.currentTarget.value;
          router.push(v ? `/organizzatore/calendario?venue=${v}` : "/organizzatore/calendario");
        }}
      >
        <option value="">Tutte</option>
        {venues.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
    </label>
  );
}
