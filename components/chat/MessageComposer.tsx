"use client";

import { useRef, useState, useTransition } from "react";
import { Image as ImageIcon, Loader2, Mic, Paperclip, Send, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { sendAttachment, sendMessage } from "@/lib/chat/actions";
import { uploadChatFile } from "@/lib/chat/upload";
import { OfferDialog } from "./OfferDialog";
import { VoiceRecorder } from "./VoiceRecorder";

export function MessageComposer({
  conversationId,
  disabled,
  disabledReason,
  allowOffer = true,
}: {
  conversationId: string;
  disabled: boolean;
  disabledReason?: string;
  allowOffer?: boolean;
}) {
  const [text, setText] = useState("");
  const [showOffer, setShowOffer] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const imgInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  function submit() {
    if (!text.trim()) return;
    setError(null);
    const body = text;
    startTransition(async () => {
      const res = await sendMessage({ conversation_id: conversationId, body });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setText("");
      if (taRef.current) taRef.current.style.height = "auto";
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  async function handleFile(file: File, kind: "image" | "document") {
    setError(null);
    setUploading(true);
    try {
      const up = await uploadChatFile(conversationId, file, file.name, file.type || "application/octet-stream");
      if ("error" in up) {
        setError(up.error);
        return;
      }
      const res = await sendAttachment({
        conversation_id: conversationId,
        kind,
        url: up.url,
        type: up.type,
        name: up.name,
        size: up.size,
      });
      if (!res.ok) setError(res.error);
    } finally {
      setUploading(false);
    }
  }

  function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) handleFile(f, "image");
  }

  function onDocChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) handleFile(f, "document");
  }

  if (disabled) {
    return (
      <div className="border-t border-border bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {disabledReason ?? "Composer disabilitato"}
      </div>
    );
  }

  if (recording) {
    return (
      <div className="border-t border-border bg-surface px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <VoiceRecorder
          conversationId={conversationId}
          onSent={() => setRecording(false)}
          onCancel={() => setRecording(false)}
          onError={(msg) => setError(msg)}
        />
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-surface px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      {error && <p className="px-1 pb-1 text-xs text-[var(--color-error)]">{error}</p>}
      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        onChange={onImageChange}
        className="hidden"
      />
      <input
        ref={docInputRef}
        type="file"
        accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,application/zip"
        onChange={onDocChange}
        className="hidden"
      />
      <div className="flex items-end gap-1.5">
        {allowOffer && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowOffer(true)}
            disabled={busy || uploading}
            className="shrink-0 min-h-11 min-w-11"
            aria-label="Fai un'offerta"
          >
            <Tag className="size-4" />
            <span className="hidden lg:inline">Offerta</span>
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => imgInputRef.current?.click()}
          disabled={busy || uploading}
          className="shrink-0 min-h-11 min-w-11"
          aria-label="Allega immagine"
        >
          <ImageIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => docInputRef.current?.click()}
          disabled={busy || uploading}
          className="shrink-0 min-h-11 min-w-11"
          aria-label="Allega documento"
        >
          <Paperclip className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setRecording(true)}
          disabled={busy || uploading}
          className="shrink-0 min-h-11 min-w-11"
          aria-label="Registra vocale"
        >
          <Mic className="size-4" />
        </Button>
        <textarea
          ref={taRef}
          value={text}
          onChange={autoResize}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={uploading ? "Caricamento allegato…" : "Scrivi un messaggio…"}
          disabled={uploading}
          className="flex-1 resize-none rounded-2xl border-[1.5px] border-border bg-background px-3.5 py-2 text-sm leading-relaxed focus:outline-none focus:border-azzurro focus:ring-[3px] focus:ring-azzurro/15 disabled:opacity-60"
        />
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={busy || uploading || !text.trim()}
          aria-label="Invia messaggio"
          className="shrink-0 min-h-11 min-w-11"
        >
          {busy || uploading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
      {allowOffer && (
        <OfferDialog
          open={showOffer}
          onClose={() => setShowOffer(false)}
          conversationId={conversationId}
        />
      )}
    </div>
  );
}
