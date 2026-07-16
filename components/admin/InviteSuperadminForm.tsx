"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteSuperadminSchema, type InviteSuperadminInput } from "@/lib/validators/schemas";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { inviteSuperadmin } from "@/app/(admin)/admin/impostazioni/_actions";

export function InviteSuperadminForm() {
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteSuperadminInput>({ resolver: zodResolver(inviteSuperadminSchema) });

  async function onSubmit(values: InviteSuperadminInput) {
    setError(null);
    setDone(null);
    const fd = new FormData();
    fd.set("email", values.email);
    if (values.full_name) fd.set("full_name", values.full_name);
    const res = await inviteSuperadmin(fd);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(`Invito inviato a ${values.email}. Verifica le permessi pagine sotto.`);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Email del nuovo superadmin</Label>
          <Input type="email" placeholder="nome@dominio.it" {...register("email")} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <Label>Nome completo (opzionale)</Label>
          <Input {...register("full_name")} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="text-sm text-emerald-600">{done}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Invio in corso…" : "Invia invito"}
      </Button>
    </form>
  );
}
