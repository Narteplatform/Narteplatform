import Link from "next/link";

const VOCI = [
  { href: "/admin/contenuti", label: "Testi e foto" },
  { href: "/admin/contenuti/tappe", label: "Tappe di Chi siamo" },
  { href: "/admin/contenuti/collaborazioni", label: "Loghi delle collaborazioni" },
];

/** Schede della sezione «Contenuti del sito». */
export function ContenutiNav({ attiva }: { attiva: string }) {
  return (
    <nav aria-label="Sezioni dei contenuti" className="flex flex-wrap gap-2">
      {VOCI.map((v) => (
        <Link
          key={v.href}
          href={v.href}
          aria-current={v.href === attiva ? "page" : undefined}
          className={`rounded-full border px-3 py-1.5 text-sm ${
            v.href === attiva ? "border-foreground font-medium" : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {v.label}
        </Link>
      ))}
    </nav>
  );
}
