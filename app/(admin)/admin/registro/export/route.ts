import { NextResponse } from "next/server";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { leggiFiltri, leggiRegistro, righeInCsv } from "@/lib/admin/registro";
import { registraAzione } from "@/lib/moderation/decisioni";

export const dynamic = "force-dynamic";

/** Righe massime per file: oltre, restringere il periodo. */
const MAX_RIGHE = 5000;

export async function GET(request: Request) {
  const user = await requireAdminPageAccess("registro");
  const url = new URL(request.url);
  const filtri = leggiFiltri({
    operatore: url.searchParams.get("operatore") ?? undefined,
    tipo: url.searchParams.get("tipo") ?? undefined,
    dal: url.searchParams.get("dal") ?? undefined,
    al: url.searchParams.get("al") ?? undefined,
  });

  const esito = await leggiRegistro(filtri, { pagina: 1, perPagina: MAX_RIGHE });
  if (!esito.ok) {
    return NextResponse.json({ ok: false, error: esito.error }, { status: 500 });
  }

  await registraAzione({
    actorId: user.id,
    targetType: "registro",
    action: "registro_esportato",
    descrizione: `Registro esportato in CSV (${esito.righe.length} righe).`,
  });

  const nome = `registro-narte-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(`﻿${righeInCsv(esito.righe)}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
