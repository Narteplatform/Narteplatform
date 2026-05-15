"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "chat-attachments";
const MAX = 25 * 1024 * 1024;

function sanitize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function uploadChatFile(
  bookingRequestId: string,
  file: File | Blob,
  filename: string,
  contentType: string,
): Promise<{ url: string; path: string; size: number; type: string; name: string } | { error: string }> {
  if (file.size <= 0) return { error: "File vuoto" };
  if (file.size > MAX) return { error: "File troppo grande (max 25 MB)" };

  const supabase = createClient();
  const id = uid();
  const safe = sanitize(filename) || `file-${id}`;
  const path = `${bookingRequestId}/${id}-${safe}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType,
    upsert: false,
    cacheControl: "3600",
  });
  if (error) return { error: error.message };

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return {
    url: pub.publicUrl,
    path,
    size: file.size,
    type: contentType,
    name: safe,
  };
}
