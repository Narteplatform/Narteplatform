"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createConsultant, updateConsultant } from "@/app/(admin)/admin/consulenza/_actions";

type Initial = {
  id?: string;
  name?: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
};

export function ConsultantForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    role: initial?.role ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    bio: initial?.bio ?? "",
    avatarUrl: initial?.avatarUrl ?? "",
    createAccount: false,
    password: "",
  });

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (form.name.trim().length < 2) {
      setError("Nome obbligatorio (min 2 caratteri).");
      return;
    }
    if (form.createAccount) {
      if (!form.email.trim()) {
        setError("Email obbligatoria per creare l'account di login.");
        return;
      }
      if (form.password.length < 8) {
        setError("Password min 8 caratteri.");
        return;
      }
    }
    start(async () => {
      const payload = {
        name: form.name.trim(),
        role: form.role.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        bio: form.bio.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
        createAccount: !initial?.id ? form.createAccount : false,
        password: !initial?.id && form.createAccount ? form.password : undefined,
      };
      const res = initial?.id
        ? await updateConsultant(initial.id, payload)
        : await createConsultant(payload);
      if (!res.ok) {
        setError(res.error ?? "Errore");
        return;
      }
      if (!initial?.id && "id" in res && res.id) {
        router.push(`/admin/consulenza/consulenti/${res.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Nome e cognome">
        <input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
        />
      </Field>
      <Field label="Ruolo / titolo">
        <input
          value={form.role}
          onChange={(e) => update("role", e.target.value)}
          placeholder="Consulente artistico"
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
        />
      </Field>
      <Field label="Telefono">
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
        />
      </Field>
      <Field label="Avatar URL" className="md:col-span-2">
        <input
          type="url"
          value={form.avatarUrl}
          onChange={(e) => update("avatarUrl", e.target.value)}
          placeholder="https://"
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
        />
      </Field>
      <Field label="Bio" className="md:col-span-2">
        <textarea
          value={form.bio}
          onChange={(e) => update("bio", e.target.value)}
          rows={3}
          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </Field>
      {!initial?.id && (
        <div className="md:col-span-2 rounded-md border border-border bg-muted/40 p-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.createAccount}
              onChange={(e) => update("createAccount", e.target.checked)}
            />
            <span>Crea account di login per il consulente</span>
          </label>
          {form.createAccount && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Email account (usa la stessa sopra se vuoi)">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </Field>
              <Field label="Password (min 8)">
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </Field>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Con l&apos;account il consulente potrà entrare in /admin e vedere solo i propri appuntamenti.
          </p>
        </div>
      )}
      {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
      <div className="md:col-span-2">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Salvataggio..." : initial?.id ? "Salva modifiche" : "Crea consulente"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
