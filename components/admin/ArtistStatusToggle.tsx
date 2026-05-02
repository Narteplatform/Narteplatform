"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { updateArtistStatus } from "@/app/(admin)/admin/artisti/_actions";

const STATUSES = ["pending", "approved", "rejected"] as const;

export function ArtistStatusToggle({
  artistId,
  status,
}: {
  artistId: string;
  status: "pending" | "approved" | "rejected";
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Stato:</span>
      {STATUSES.map((s) => (
        <Button
          key={s}
          size="sm"
          variant={s === status ? "default" : "outline"}
          disabled={pending || s === status}
          onClick={() =>
            start(async () => {
              await updateArtistStatus(artistId, s);
              router.refresh();
            })
          }
        >
          {s}
        </Button>
      ))}
    </div>
  );
}
