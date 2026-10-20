import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { falha } from "@/lib/http";
import { verificarNovosAlertas } from "@/lib/push";

function autorizado(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  const enviado = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(enviado);
  const b = Buffer.from(segredo);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Disparo por cron externo: compara os avisos INMET atuais com os já notificados e envia push para os novos.
export async function GET(request: Request) {
  if (!autorizado(request)) return falha("Não autorizado.", 401);
  try {
    return NextResponse.json(await verificarNovosAlertas());
  } catch (erro) {
    console.error("[api/push/verificar]", erro);
    return falha("Falha ao verificar alertas.");
  }
}
