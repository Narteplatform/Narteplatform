"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { openOrCreateConversation } from "@/lib/chat/actions";

/**
 * Server action invocabile da un <form action>: apre/crea la conversazione
 * (artist, organizer) e redirige alla pagina chat del ruolo corrente.
 */
export async function openChatAndRedirect(formData: FormData): Promise<void> {
  const artistId = String(formData.get("artist_id") ?? "");
  const explicitOrganizerId = formData.get("organizer_id");
  const basePath = String(formData.get("base_path") ?? "");
  if (!artistId || !basePath) {
    throw new Error("Parametri mancanti");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(basePath)}`);
  }

  let organizerId: string | undefined =
    typeof explicitOrganizerId === "string" && explicitOrganizerId
      ? explicitOrganizerId
      : undefined;

  // Se non passato e l'utente è artista, deduzione non disponibile (artist non sa organizer_id direttamente)
  if (!organizerId) {
    const admin = createAdminClient();
    const { data: o } = await admin
      .from("organizers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (o) organizerId = o.id;
  }

  if (!organizerId) {
    throw new Error("Profilo organizzatore necessario per aprire la chat");
  }

  const res = await openOrCreateConversation(artistId, organizerId);
  if (!res.ok) throw new Error(res.error);
  redirect(`${basePath}/${res.conversationId}`);
}
