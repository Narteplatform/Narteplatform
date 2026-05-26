"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import {
  platformFeedbackSchema,
  type PlatformFeedbackInput,
} from "@/lib/validators/schemas";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitPlatformFeedback } from "@/lib/feedback/_actions";

const CATEGORIES: { v: PlatformFeedbackInput["category"]; label: string }[] = [
  { v: "generale", label: "Generale" },
  { v: "suggerimento", label: "Suggerimento" },
  { v: "bug", label: "Segnalazione bug" },
  { v: "altro", label: "Altro" },
];

export function PlatformFeedbackForm() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlatformFeedbackInput>({
    resolver: zodResolver(platformFeedbackSchema),
    defaultValues: {
      category: "generale",
      subject: "",
      body: "",
    },
  });

  function onSubmit(values: PlatformFeedbackInput) {
    setError(null);
    startTransition(async () => {
      const res = await submitPlatformFeedback({
        category: values.category,
        subject: values.subject || undefined,
        body: values.body,
        rating: values.rating,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      reset();
    });
  }

  if (done) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="inline-flex items-center gap-2">
          <CheckCircle2 className="size-4" /> Grazie! Il tuo feedback è stato inviato al team N&apos;arte.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => setDone(false)}
        >
          Invia un&apos;altra segnalazione
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div>
          <Label>Categoria</Label>
          <select
            {...register("category")}
            className="h-10 w-full rounded-md border-[1.5px] border-border bg-surface px-3 text-sm focus:border-azzurro focus:outline-none focus:ring-[3px] focus:ring-azzurro/15"
          >
            {CATEGORIES.map((c) => (
              <option key={c.v} value={c.v}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Oggetto (opzionale)</Label>
          <Input placeholder="Breve titolo" {...register("subject")} />
        </div>
      </div>
      <div>
        <Label>Messaggio</Label>
        <Textarea
          rows={6}
          placeholder="Descrivi feedback, suggerimento o bug nel dettaglio…"
          {...register("body")}
        />
        {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body.message}</p>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Invio…" : "Invia feedback al team N'arte"}
      </Button>
    </form>
  );
}
