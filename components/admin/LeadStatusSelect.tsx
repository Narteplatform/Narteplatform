"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLeadStatus } from "@/app/(admin)/admin/leads/_actions";

export function LeadStatusSelect({
  leadId,
  status,
}: {
  leadId: string;
  status: "new" | "contacted" | "closed";
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await updateLeadStatus(leadId, e.target.value as "new" | "contacted" | "closed");
          router.refresh();
        })
      }
      className="h-9 rounded-full border border-border bg-background px-4 text-sm"
    >
      <option value="new">Nuovo</option>
      <option value="contacted">Contattato</option>
      <option value="closed">Chiuso</option>
    </select>
  );
}
