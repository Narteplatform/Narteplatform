"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Send, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { uploadChatFile } from "@/lib/chat/upload";
import { sendAttachment } from "@/lib/chat/actions";

type State = "idle" | "recording" | "preview" | "uploading";

function pickMimeType(): { mime: string; ext: string } {
  if (typeof MediaRecorder === "undefined") return { mime: "audio/webm", ext: "webm" };
  const candidates: { mime: string; ext: string }[] = [
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
    { mime: "audio/mp4", ext: "m4a" },
    { mime: "audio/ogg;codecs=opus", ext: "ogg" },
  ];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c.mime)) return c;
    } catch {
      // ignore
    }
  }
  return { mime: "audio/webm", ext: "webm" };
}

export function VoiceRecorder({
  conversationId,
  onSent,
  onError,
  onCancel,
}: {
  conversationId: string;
  onSent: () => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState<State>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const mimeRef = useRef<{ mime: string; ext: string }>(pickMimeType());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanup() {
    try {
      mediaRef.current?.stop();
    } catch {
      // noop
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (tickRef.current) clearInterval(tickRef.current);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const m = mimeRef.current;
      const mr = new MediaRecorder(stream, { mimeType: m.mime });
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: m.mime });
        const url = URL.createObjectURL(b);
        setBlob(b);
        setPreviewUrl(url);
        setState("preview");
        streamRef.current?.getTracks().forEach((t) => t.stop());
        if (tickRef.current) clearInterval(tickRef.current);
      };
      mr.start();
      startedAtRef.current = Date.now();
      setElapsed(0);
      setState("recording");
      tickRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch (e) {
      onError(`Microfono non disponibile: ${(e as Error).message}`);
      onCancel();
    }
  }

  function stop() {
    try {
      mediaRef.current?.stop();
    } catch {
      // noop
    }
  }

  function discard() {
    cleanup();
    onCancel();
  }

  async function send() {
    if (!blob) return;
    setState("uploading");
    const filename = `voice-${Date.now()}.${mimeRef.current.ext}`;
    const up = await uploadChatFile(conversationId, blob, filename, mimeRef.current.mime);
    if ("error" in up) {
      onError(up.error);
      setState("preview");
      return;
    }
    const durationMs = elapsed * 1000;
    const res = await sendAttachment({
      conversation_id: conversationId,
      kind: "voice",
      url: up.url,
      type: up.type,
      name: up.name,
      size: up.size,
      duration_ms: durationMs,
    });
    if (!res.ok) {
      onError(res.error);
      setState("preview");
      return;
    }
    cleanup();
    onSent();
  }

  function fmt(s: number): string {
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}:${ss.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex w-full items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2">
      {state === "idle" && (
        <>
          <Button type="button" size="sm" variant="outline" onClick={start}>
            <Mic className="size-4" />
            <span>Inizia registrazione</span>
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={discard}>
            <X className="size-4" />
          </Button>
        </>
      )}
      {state === "recording" && (
        <>
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-corallo" />
          <span className="text-xs font-medium text-notte">Registrazione {fmt(elapsed)}</span>
          <div className="flex-1" />
          <Button type="button" size="sm" variant="outline" onClick={stop}>
            Stop
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={discard}>
            <X className="size-4" />
          </Button>
        </>
      )}
      {state === "preview" && previewUrl && (
        <>
          <audio src={previewUrl} controls preload="metadata" className="h-9 flex-1" />
          <Button type="button" size="sm" variant="ghost" onClick={discard} aria-label="Scarta">
            <X className="size-4" />
          </Button>
          <Button type="button" size="sm" onClick={send} aria-label="Invia">
            <Send className="size-4" />
          </Button>
        </>
      )}
      {state === "uploading" && (
        <>
          <Loader2 className="size-4 animate-spin text-azzurro" />
          <span className="text-xs text-muted-foreground">Invio…</span>
        </>
      )}
    </div>
  );
}
