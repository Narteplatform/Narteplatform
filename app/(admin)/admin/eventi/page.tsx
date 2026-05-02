import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";

export default async function AdminEventiPage() {
  const supabase = createAdminClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, slug, title, category, date, city, featured, cover_image")
    .order("date", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="display-xl text-4xl">Eventi</h1>
        <Button asChild>
          <Link href="/admin/eventi/new">+ Nuovo evento</Link>
        </Button>
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="w-20 p-3">Cover</th>
              <th className="p-3">Titolo</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Data</th>
              <th className="p-3">Città</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).map((e) => (
              <tr key={e.id} className="border-t border-border align-middle">
                <td className="p-3">
                  <div className="relative size-14 overflow-hidden rounded-md border border-border bg-muted">
                    {e.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.cover_image}
                        alt={e.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="size-4" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-3 font-medium">{e.title}</td>
                <td className="p-3 uppercase text-xs">{e.category}</td>
                <td className="p-3">{new Date(e.date).toLocaleDateString("it-IT")}</td>
                <td className="p-3">{e.city}</td>
                <td className="p-3 text-right">
                  <Link href={`/admin/eventi/${e.id}`} className="underline">Modifica</Link>
                </td>
              </tr>
            ))}
            {(!events || events.length === 0) && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Nessun evento. Crea il primo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
