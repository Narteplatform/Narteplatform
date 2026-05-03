import { Mail } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "Messaggi — N'arte Admin" };
export const dynamic = "force-dynamic";

export default async function AdminMessaggiPage() {
  const supabase = createAdminClient();
  const { data: messages } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  const items = messages ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Messaggi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tutte le richieste arrivate dal form &quot;Vuoi realizzare un evento?&quot; e dai contatti
          pubblici.
        </p>
      </header>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nessun messaggio ricevuto.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((m) => (
            <Card key={m.id} className="flex flex-col">
              <CardHeader className="gap-3">
                <div className="flex items-start gap-3">
                  <Avatar name={m.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base leading-tight tracking-tight truncate">
                      {m.name}
                    </p>
                    <a
                      href={`mailto:${m.email}`}
                      className="text-xs text-muted-foreground hover:text-foreground truncate inline-flex items-center gap-1"
                    >
                      <Mail className="size-3" /> {m.email}
                    </a>
                  </div>
                </div>
                {m.subject && (
                  <Badge variant="muted" className="self-start">
                    {m.subject}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="flex-1 pt-0">
                <p className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed line-clamp-6">
                  {m.message}
                </p>
                <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {new Date(m.created_at).toLocaleString("it-IT")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
