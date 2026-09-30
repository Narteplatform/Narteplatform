"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Rilegge la pagina dal server. Per il Team non c'è realtime sulle chat. */
export function RefreshButton({ label = "Aggiorna" }: { label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => start(() => router.refresh())}
    >
      <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} /> {label}
    </Button>
  );
}
