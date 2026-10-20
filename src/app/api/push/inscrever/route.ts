import { NextResponse } from "next/server";
import { falha } from "@/lib/http";
import { adicionarInscricao, inscricaoValida, pushConfigurado, removerInscricao } from "@/lib/push";

export async function POST(request: Request) {
  if (!pushConfigurado()) return falha("Notificações push não configuradas.", 503);
  const corpo = await request.json().catch(() => null);
  if (!inscricaoValida(corpo)) return falha("Inscrição inválida.", 400);
  try {
    await adicionarInscricao(corpo);
  } catch {
    return falha("Não foi possível registrar a inscrição.", 503);
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const corpo = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof corpo?.endpoint !== "string") return falha("Informe o endpoint.", 400);
  await removerInscricao(corpo.endpoint);
  return NextResponse.json({ ok: true });
}
