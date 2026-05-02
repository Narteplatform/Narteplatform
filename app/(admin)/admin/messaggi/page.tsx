import { createAdminClient } from "@/lib/supabase/server";

export const metadata = { title: "Messaggi — N'arte Admin" };

export default async function AdminMessaggiPage() {
  const supabase = createAdminClient();
  const { data: messages } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-xl text-4xl">Messaggi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tutte le richieste arrivate dal form &quot;Vuoi realizzare un evento?&quot; e dai
          contatti pubblici.
        </p>
      </div>

      {!messages || messages.length === 0 ? (
        <p className="text-muted-foreground">Nessun messaggio.</p>
      ) : (
        <ul className="space-y-4">
          {messages.map((m) => (
            <li key={m.id} className="border border-border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("it-IT")}
                  </p>
                  <h3 className="mt-1 font-display text-xl uppercase">
                    {m.subject ?? "Messaggio"}
                  </h3>
                  <p className="text-sm">
                    Da <strong>{m.name}</strong> ·{" "}
                    <a href={`mailto:${m.email}`} className="underline">
                      {m.email}
                    </a>
                  </p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
