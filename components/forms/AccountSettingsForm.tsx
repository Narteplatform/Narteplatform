"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/forms/ImageUpload";
import {
  updateAccountProfile,
  changePassword,
  impostaPassword,
  inviaCodiceRiautenticazione,
  leggiMetodiAccesso,
  type MetodiAccesso,
} from "@/app/account/_actions";

type ProfileValues = { fullName: string; avatarUrl: string };
type PasswordValues = { currentPassword: string; password: string };
type ImpostaValues = { codice: string; password: string };

/**
 * `metodi` (facoltativo): come si accede all'account. Se il chiamante non lo
 * passa, il modulo lo chiede al server al montaggio: così anche le pagine che
 * non lo conoscono (admin, dashboard artista) mostrano il modulo giusto a chi
 * è entrato solo con Google e non ha una password da «ridigitare».
 */
export function AccountSettingsForm({
  email,
  defaults,
  metodi: metodiIniziali,
}: {
  email: string;
  defaults: { fullName: string; avatarUrl: string };
  metodi?: MetodiAccesso;
}) {
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [metodi, setMetodi] = useState<MetodiAccesso | null>(metodiIniziali ?? null);
  const [codiceInviato, setCodiceInviato] = useState(false);
  const [invioCodice, setInvioCodice] = useState(false);

  useEffect(() => {
    if (metodiIniziali) return;
    let annullato = false;
    leggiMetodiAccesso()
      .then((r) => {
        if (!annullato && r.ok) setMetodi(r.metodi);
      })
      .catch(() => {});
    return () => {
      annullato = true;
    };
  }, [metodiIniziali]);

  // Senza password solo quando il server lo dice: finché non si sa, il modulo
  // resta quello di sempre (password attuale + nuova).
  const senzaPassword = metodi !== null && !metodi.password;
  const impostaForm = useForm<ImpostaValues>({ defaultValues: { codice: "", password: "" } });

  async function onInviaCodice() {
    setPwMsg(null);
    setInvioCodice(true);
    const res = await inviaCodiceRiautenticazione().catch(() => null);
    setInvioCodice(false);
    if (res?.ok) {
      setCodiceInviato(true);
      setPwMsg({ type: "ok", text: `Ti abbiamo mandato un codice a ${metodi?.email || email}. Controlla anche nello spam.` });
    } else {
      setPwMsg({ type: "err", text: res && !res.ok ? res.error : "Invio non riuscito. Riprova." });
    }
  }

  async function onImposta(values: ImpostaValues) {
    setPwMsg(null);
    const res = await impostaPassword(values).catch(() => null);
    if (res?.ok) {
      impostaForm.reset({ codice: "", password: "" });
      setCodiceInviato(false);
      setPwMsg({ type: "ok", text: "Password impostata. Da ora puoi accedere anche con email e password." });
    } else {
      setPwMsg({ type: "err", text: res && !res.ok ? res.error : "Errore" });
    }
  }

  const profileForm = useForm<ProfileValues>({ defaultValues: defaults });
  const { control: profileControl } = profileForm;
  const pwForm = useForm<PasswordValues>({
    defaultValues: { currentPassword: "", password: "" },
  });

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
    const res = await changePassword({
      currentPassword: values.currentPassword,
      password: values.password,
    });
    if (res.ok) {
      pwForm.reset({ currentPassword: "", password: "" });
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
            {senzaPassword
              ? "Accedi con Google. Se vuoi entrare anche con email e password, impostane una: per sicurezza ti mandiamo un codice via email."
              : "Imposta una nuova password per accedere alla piattaforma."}
          </p>
        </header>
        {senzaPassword ? (
          !codiceInviato ? (
            <Button type="button" onClick={onInviaCodice} disabled={invioCodice}>
              {invioCodice ? "Invio in corso…" : "Inviami il codice"}
            </Button>
          ) : (
            <form onSubmit={impostaForm.handleSubmit(onImposta)} className="space-y-4">
              <Field label="Codice ricevuto via email">
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={10}
                  {...impostaForm.register("codice", { required: true })}
                />
              </Field>
              <Field label="Nuova password">
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...impostaForm.register("password", { required: true, minLength: 8 })}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={impostaForm.formState.isSubmitting}>
                  {impostaForm.formState.isSubmitting ? "Salvataggio…" : "Imposta password"}
                </Button>
                <button
                  type="button"
                  onClick={onInviaCodice}
                  disabled={invioCodice}
                  className="text-sm underline underline-offset-4 text-muted-foreground"
                >
                  Invia un nuovo codice
                </button>
              </div>
            </form>
          )
        ) : (
          <form onSubmit={pwForm.handleSubmit(onChangePw)} className="space-y-4">
            {/* La password attuale si chiede per davvero: senza, chi mette le mani
                su una sessione aperta può cambiarla e chiudere fuori il
                proprietario dell'account. */}
            <Field label="Password attuale">
              <Input
                type="password"
                autoComplete="current-password"
                {...pwForm.register("currentPassword", { required: true })}
              />
            </Field>
            <Field label="Nuova password">
              <Input type="password" autoComplete="new-password" {...pwForm.register("password", { required: true, minLength: 8 })} />
            </Field>
            <Button type="submit" disabled={pwForm.formState.isSubmitting}>
              {pwForm.formState.isSubmitting ? "Salvataggio…" : "Cambia password"}
            </Button>
          </form>
        )}
        {pwMsg && (
          <p
            role={pwMsg.type === "err" ? "alert" : "status"}
            className={
              pwMsg.type === "ok" ? "text-sm text-green-700" : "text-sm text-red-600"
            }
          >
            {pwMsg.text}
          </p>
        )}
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
