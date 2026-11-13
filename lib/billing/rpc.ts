import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Chiamata a una funzione SQL che i tipi generati (lib/supabase/types.ts) non
 * conoscono ancora: le funzioni della migration 0082.
 *
 * Il codice gira anche PRIMA che la migration sia applicata: per questo ogni
 * chiamante distingue «funzione assente» (→ ripiego sul comportamento di
 * prima) da un errore vero (→ ci si ferma). Quando i tipi verranno rigenerati
 * si potrà tornare a `admin.rpc(...)` tipizzato.
 */

export type ErroreRpc = { message: string; code?: string };
export type RispostaRpc<T> = { data: T | null; error: ErroreRpc | null };

type RpcGenerica = (nome: string, args: Record<string, unknown>) => PromiseLike<RispostaRpc<unknown>>;

export async function rpcSenzaTipi<T>(nome: string, args: Record<string, unknown> = {}): Promise<RispostaRpc<T>> {
  const admin = createAdminClient();
  const chiama = admin.rpc.bind(admin) as unknown as RpcGenerica;
  const { data, error } = await chiama(nome, args);
  return { data: (data as T | null) ?? null, error };
}

/** La funzione non esiste (migration non applicata): PostgREST o Postgres. */
export function funzioneAssente(error: ErroreRpc | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST202" || error.code === "42883";
}
