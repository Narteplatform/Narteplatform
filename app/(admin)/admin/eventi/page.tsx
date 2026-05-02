import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";

export default async function AdminEventiPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, slug, title, category, date, city, featured")
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
              <th className="p-3">Titolo</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Data</th>
              <th className="p-3">Città</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).map((e) => (
              <tr key={e.id} className="border-t border-border">
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
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
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
