import { NextResponse } from "next/server";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { incassiCsv, incassiDelMese } from "@/lib/billing/incassi";

export const dynamic = "force-dynamic";

/** Esportazione CSV degli incassi di un mese, per il commercialista. */
export async function GET(request: Request) {
  await requireAdminPageAccess("abbonamenti");
  const mese = new URL(request.url).searchParams.get("mese") ?? "";
  const esito = await incassiDelMese(mese);
  if (!esito.ok) return NextResponse.json({ error: esito.error }, { status: 400 });
  return new NextResponse(incassiCsv(esito.incassi), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="narte-incassi-${mese}.csv"`,
      "cache-control": "no-store",
    },
  });
}
