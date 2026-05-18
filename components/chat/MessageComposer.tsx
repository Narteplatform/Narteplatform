"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Image as ImageIcon, Loader2, Mic, Paperclip, Plus, Send, Tag } from "lucide-react";
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
  const [plusOpen, setPlusOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const imgInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const plusWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!plusOpen) return;
    function handler(e: MouseEvent) {
      if (!plusWrapRef.current) return;
      if (!plusWrapRef.current.contains(e.target as Node)) setPlusOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [plusOpen]);

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
        <div ref={plusWrapRef} className="relative shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPlusOpen((v) => !v)}
            disabled={busy || uploading}
            className="shrink-0 min-h-11 min-w-11"
            aria-label="Apri allegati e offerta"
            aria-expanded={plusOpen}
          >
            <Plus className={`size-5 transition-transform ${plusOpen ? "rotate-45" : ""}`} />
          </Button>
          {plusOpen && (
            <div
              role="menu"
              className="absolute bottom-full left-0 mb-2 min-w-[200px] rounded-2xl border border-border bg-surface shadow-xl overflow-hidden z-20"
            >
              {allowOffer && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setPlusOpen(false);
                    setShowOffer(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-left hover:bg-muted/60 active:bg-muted/80"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-azzurro-subtle text-azzurro-dark">
                    <Tag className="size-4" />
                  </span>
                  <span className="font-medium text-notte">Fai un&apos;offerta</span>
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setPlusOpen(false);
                  imgInputRef.current?.click();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-left hover:bg-muted/60 active:bg-muted/80 border-t border-border"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-palco-80 text-azzurro">
                  <ImageIcon className="size-4" />
                </span>
                <span className="font-medium text-notte">Foto</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setPlusOpen(false);
                  docInputRef.current?.click();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-left hover:bg-muted/60 active:bg-muted/80 border-t border-border"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-palco-80 text-foreground">
                  <Paperclip className="size-4" />
                </span>
                <span className="font-medium text-notte">Documento</span>
              </button>
            </div>
          )}
        </div>
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
        {text.trim() ? (
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={busy || uploading}
            aria-label="Invia messaggio"
            className="shrink-0 min-h-11 min-w-11"
          >
            {busy || uploading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRecording(true)}
            disabled={busy || uploading}
            className="shrink-0 min-h-11 min-w-11"
            aria-label="Registra vocale"
          >
            <Mic className="size-5" />
          </Button>
        )}
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
