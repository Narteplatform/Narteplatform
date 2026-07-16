"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/forms/ImageUpload";
import {
  updateAccountProfile,
  changePassword,
} from "@/app/account/_actions";

type ProfileValues = { fullName: string; avatarUrl: string };
type PasswordValues = { password: string };

export function AccountSettingsForm({
  email,
  defaults,
}: {
  email: string;
  defaults: { fullName: string; avatarUrl: string };
}) {
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const profileForm = useForm<ProfileValues>({ defaultValues: defaults });
  const { control: profileControl } = profileForm;
  const pwForm = useForm<PasswordValues>({ defaultValues: { password: "" } });

  async function onSaveProfile(values: ProfileValues) {
    setProfileMsg(null);
    const res = await updateAccountProfile({
      fullName: values.fullName,
      avatarUrl: values.avatarUrl || undefined,
    });
    setProfileMsg(
      res.ok
        ? { type: "ok", text: "Profilo aggiornato." }
        : { type: "err", text: res.error ?? "Errore" }
    );
  }

  async function onChangePw(values: PasswordValues) {
    setPwMsg(null);
    const res = await changePassword({ password: values.password });
    if (res.ok) {
      pwForm.reset({ password: "" });
      setPwMsg({ type: "ok", text: "Password aggiornata." });
    } else {
      setPwMsg({ type: "err", text: res.error ?? "Errore" });
    }
  }

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <section className="space-y-4">
        <header>
          <h2 className="font-display text-2xl">Profilo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Email account: <span className="font-mono">{email}</span>
          </p>
        </header>
        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
          <Field label="Nome completo">
            <Input {...profileForm.register("fullName", { required: true })} />
          </Field>
          <Controller
            control={profileControl}
            name="avatarUrl"
            render={({ field }) => (
              <ImageUpload
                label="Foto profilo"
                kind="avatar"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {profileMsg && (
            <p
              className={
                profileMsg.type === "ok"
                  ? "text-sm text-green-700"
                  : "text-sm text-red-600"
              }
            >
              {profileMsg.text}
            </p>
          )}
          <Button type="submit" disabled={profileForm.formState.isSubmitting}>
            {profileForm.formState.isSubmitting ? "Salvataggio…" : "Salva profilo"}
          </Button>
        </form>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="font-display text-2xl">Password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Imposta una nuova password per accedere alla piattaforma.
          </p>
        </header>
        <form onSubmit={pwForm.handleSubmit(onChangePw)} className="space-y-4">
          <Field label="Nuova password">
            <Input type="password" autoComplete="new-password" {...pwForm.register("password", { required: true, minLength: 8 })} />
          </Field>
          {pwMsg && (
            <p
              className={
                pwMsg.type === "ok" ? "text-sm text-green-700" : "text-sm text-red-600"
              }
            >
              {pwMsg.text}
            </p>
          )}
          <Button type="submit" disabled={pwForm.formState.isSubmitting}>
            {pwForm.formState.isSubmitting ? "Salvataggio…" : "Cambia password"}
          </Button>
        </form>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
