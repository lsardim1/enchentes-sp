import { NextResponse } from "next/server";

export function jsonCache<T>(corpo: T, segundos: number) {
  return NextResponse.json(corpo, {
    headers: { "Cache-Control": `public, s-maxage=${segundos}, stale-while-revalidate=${segundos * 2}` },
  });
}

export function falha(mensagem: string, status = 502, causa?: unknown) {
  if (causa) console.error(`[api] ${mensagem}`, causa instanceof Error ? `${causa.message} ${String(causa.cause ?? "")}` : causa);
  return NextResponse.json({ erro: mensagem }, { status });
}

export function numero(valor: string | null) {
  if (valor === null || valor.trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

// Retângulo aproximado da cidade de São Paulo; entradas fora dele são rejeitadas.
export function dentroDeSaoPaulo(lat: number, lng: number) {
  return lat >= -24.0 && lat <= -23.35 && lng >= -46.9 && lng <= -46.3;
}
