"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star, CheckCircle2 } from "lucide-react";
import { feedbackSchema, type FeedbackInput } from "@/lib/validators/schemas";
import { Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitFeedback } from "@/lib/feedback/_actions";

export function FeedbackForm({ bookingId, artistName }: { bookingId: string; artistName: string }) {
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FeedbackInput>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { booking_request_id: bookingId, rating: 0, body: "" },
  });

  function onSubmit(values: FeedbackInput) {
    setError(null);
    if (rating < 1) {
      setError("Seleziona un voto");
      return;
    }
    startTransition(async () => {
      const res = await submitFeedback({
        booking_request_id: values.booking_request_id,
        rating,
        body: values.body,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="inline-flex items-center gap-2">
          <CheckCircle2 className="size-4" /> Feedback inviato a {artistName}. Grazie!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <input type="hidden" {...register("booking_request_id")} value={bookingId} />
      <div>
        <Label>Valutazione</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = n <= (hover || rating);
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${n} stelle`}
                className="p-0.5"
              >
                <Star
                  className={`size-7 transition ${
                    active ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                  }`}
                />
              </button>
            );
          })}
          {rating > 0 && (
            <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>
          )}
        </div>
      </div>
      <div>
        <Label>Commento</Label>
        <Textarea
          rows={4}
          placeholder="Com'è andata? Punti forti, eventuali criticità…"
          {...register("body")}
        />
        {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body.message}</p>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Invio…" : "Invia feedback"}
      </Button>
    </form>
  );
}
