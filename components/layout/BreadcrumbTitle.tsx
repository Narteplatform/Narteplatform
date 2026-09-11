"use client";

import * as React from "react";

/**
 * Il nome vero dell'ultima voce del breadcrumb.
 *
 * Il breadcrumb della shell si costruisce dal pathname, e su una rotta [id] il
 * pathname contiene un uuid: in cima a "/admin/artisti/9d1fe8a2-…" compariva
 * quella stringa di codici. Il layout che monta la shell non riceve i params
 * della pagina figlia, quindi il nome non può scendere per props.
 *
 * Sale invece per contesto: la pagina rende <BreadcrumbTitle title={…} />, che
 * non disegna niente e si limita a dichiarare come si chiama la cosa aperta.
 * Registrazione e pulizia stanno nello stesso effetto, quindi uscendo dalla
 * pagina l'etichetta sparisce da sola e non resta appiccicata alla successiva.
 */

type Ctx = {
  title: string | undefined;
  setTitle: (t: string | undefined) => void;
};

const BreadcrumbTitleContext = React.createContext<Ctx | null>(null);

export function BreadcrumbTitleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [title, setTitle] = React.useState<string | undefined>(undefined);
  const value = React.useMemo(() => ({ title, setTitle }), [title]);
  return (
    <BreadcrumbTitleContext.Provider value={value}>
      {children}
    </BreadcrumbTitleContext.Provider>
  );
}

export function useBreadcrumbTitle(): string | undefined {
  return React.useContext(BreadcrumbTitleContext)?.title;
}

export function BreadcrumbTitle({ title }: { title: string | null | undefined }) {
  const ctx = React.useContext(BreadcrumbTitleContext);
  const setTitle = ctx?.setTitle;
  const clean = title?.trim() || undefined;

  React.useEffect(() => {
    if (!setTitle) return;
    setTitle(clean);
    return () => setTitle(undefined);
  }, [clean, setTitle]);

  return null;
}
