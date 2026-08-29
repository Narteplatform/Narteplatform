import "server-only";
import { createHash } from "node:crypto";
import { bunnyStorageConfig } from "./config";

/**
 * API HTTP nativa di Bunny Storage — le operazioni fatte dal SERVER.
 *
 * Il browser non passa mai di qui: userebbe l'`AccessKey`, che è la password
 * della storage zone, e mandarla al client significherebbe consegnare la
 * scrittura e la cancellazione dell'intero archivio. Per gli upload dal browser
 * esiste `presign.ts`.
 *
 * L'API nativa vuole il corpo come binario grezzo: qualunque altro formato
 * (multipart, base64, JSON) riceve un 401 — non un 400 — che sembra un problema
 * di credenziali e non lo è.
 */

export type StorageEntry = {
  objectName: string;
  path: string;
  length: number;
  isDirectory: boolean;
  lastChanged: string | null;
};

function endpoint(key: string): string {
  const cfg = bunnyStorageConfig();
  return `https://${cfg.host}/${cfg.zone}/${key.replace(/^\/+/, "")}`;
}

function authHeaders(): Record<string, string> {
  return { AccessKey: bunnyStorageConfig().password };
}

async function describeFailure(res: Response, action: string): Promise<never> {
  const body = await res.text().catch(() => "");
  throw new Error(`[bunny/storage] ${action} fallita (${res.status}): ${body.slice(0, 300)}`);
}

/**
 * Scrive un oggetto. Sovrascrive se la chiave esiste già — non è un rischio
 * perché le chiavi contengono un token casuale (lib/storage/bunny/paths.ts).
 *
 * L'header `Checksum` costa una `createHash` e trasforma una corruzione in
 * rete in un 400 esplicito invece che in un file rotto e servito dal CDN.
 */
export async function putObject(input: {
  key: string;
  body: ArrayBuffer | Uint8Array;
  contentType?: string;
}): Promise<void> {
  const bytes = input.body instanceof Uint8Array ? input.body : new Uint8Array(input.body);
  const checksum = createHash("sha256").update(bytes).digest("hex").toUpperCase();

  const res = await fetch(endpoint(input.key), {
    method: "PUT",
    headers: {
      ...authHeaders(),
      "Content-Type": input.contentType ?? "application/octet-stream",
      Checksum: checksum,
    },
    body: bytes as unknown as BodyInit,
  });

  if (!res.ok) await describeFailure(res, "PUT");
}

/**
 * Cancella un oggetto.
 *
 * Un 404 non è un errore: cancellare qualcosa che non c'è più è il risultato
 * voluto. Distinguere i due casi serve al chiamante — `deleteArtistVideo` deve
 * poter rimuovere la riga anche quando il file era già sparito, ma NON quando
 * la cancellazione è fallita davvero.
 */
export async function deleteObject(key: string): Promise<"deleted" | "not-found"> {
  const res = await fetch(endpoint(key), { method: "DELETE", headers: authHeaders() });
  if (res.status === 404) return "not-found";
  if (!res.ok) await describeFailure(res, "DELETE");
  return "deleted";
}

/** Metadati di un oggetto. `null` se non esiste. Serve alla verifica in migrazione. */
export async function headObject(key: string): Promise<{ size: number } | null> {
  const res = await fetch(endpoint(key), { method: "HEAD", headers: authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) await describeFailure(res, "HEAD");
  return { size: Number(res.headers.get("content-length") ?? 0) };
}

/** Scarica un oggetto. Usato dalla riconciliazione, non dal percorso di lettura pubblico. */
export async function getObject(key: string): Promise<ArrayBuffer | null> {
  const res = await fetch(endpoint(key), { headers: authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) await describeFailure(res, "GET");
  return res.arrayBuffer();
}

/**
 * Elenca una cartella. Il percorso DEVE finire con `/`, altrimenti Bunny lo
 * interpreta come un file e risponde con i byte invece che con il JSON.
 */
export async function listDirectory(prefix: string): Promise<StorageEntry[]> {
  const clean = prefix.replace(/^\/+/, "").replace(/\/*$/, "/");
  const res = await fetch(endpoint(clean), { headers: authHeaders() });
  if (res.status === 404) return [];
  if (!res.ok) await describeFailure(res, "LIST");

  const raw = (await res.json()) as Array<Record<string, unknown>>;
  return raw.map((e) => ({
    objectName: String(e.ObjectName ?? ""),
    path: String(e.Path ?? ""),
    length: Number(e.Length ?? 0),
    isDirectory: Boolean(e.IsDirectory),
    lastChanged: typeof e.LastChanged === "string" ? e.LastChanged : null,
  }));
}
