import Link from "next/link";
import { dataLeggibile, modificheAnnunciate } from "@/lib/legal/avviso-modifiche";

/** Banner delle aree riservate: modifiche alle condizioni in arrivo. */
export function AvvisoModifiche() {
  const m = modificheAnnunciate();
  if (!m) return null;
  return (
    <div role="status" className="mb-6 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
      <p className="font-medium">Le condizioni di N&apos;arte cambiano dal {dataLeggibile(m.inVigoreDal)}.</p>
      <p className="mt-1 text-muted-foreground">
        {m.sintesi}{" "}
        <Link href={m.link} className="underline underline-offset-2">
          Leggi le condizioni
        </Link>
      </p>
    </div>
  );
}
