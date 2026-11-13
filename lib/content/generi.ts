import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

/** Generi musicali per i moduli (candidatura), nell'ordine scelto dal team. Sola lettura. */
export async function getGenreOptions(): Promise<string[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("genres")
      .select("name")
      .order("order_index", { ascending: true });
    if (error) return [];
    return ((data ?? []) as unknown as { name: string }[]).map((g) => g.name);
  } catch {
    return [];
  }
}
