import type { Geometry } from "geojson";
import { buscar } from "./cache";
import type { Alerta } from "./types";

export const IBGE_SAO_PAULO = "3550308";
const URL_AVISOS = "https://apiprevmet3.inmet.gov.br/avisos/ativos";

type AvisoInmet = {
  id: number;
  descricao: string;
  severidade: string;
  aviso_cor: string;
  riscos: string | string[] | null;
  instrucoes: string | string[] | null;
  inicio: string;
  fim: string;
  poligono: string | null;
  geocodes: string | null;
};

function arredondar(coords: unknown): unknown {
  if (Array.isArray(coords)) {
    return typeof coords[0] === "number"
      ? coords.map((n) => Math.round((n as number) * 1000) / 1000)
      : coords.map(arredondar);
  }
  return coords;
}

function lerGeometria(texto: string | null): Geometry | null {
  if (!texto) return null;
  try {
    const g = JSON.parse(texto) as Geometry;
    if ("coordinates" in g) {
      return { ...g, coordinates: arredondar(g.coordinates) } as Geometry;
    }
    return g;
  } catch {
    return null;
  }
}

function lista(valor: string | string[] | null): string[] {
  const itens = Array.isArray(valor) ? valor : valor ? [valor] : [];
  return itens.map((t) => String(t).trim()).filter(Boolean);
}

export function normalizarAvisos(
  bruto: { hoje?: AvisoInmet[]; futuro?: AvisoInmet[] },
  ibge = IBGE_SAO_PAULO,
): Alerta[] {
  const todos = [...(bruto.hoje ?? []), ...(bruto.futuro ?? [])];
  const vistos = new Set<number>();
  const alertas: Alerta[] = [];
  for (const a of todos) {
    if (vistos.has(a.id)) continue;
    if (!(a.geocodes ?? "").split(",").includes(ibge)) continue;
    vistos.add(a.id);
    alertas.push({
      id: a.id,
      titulo: a.descricao,
      severidade: a.severidade,
      cor: a.aviso_cor,
      riscos: lista(a.riscos),
      instrucoes: lista(a.instrucoes),
      inicio: a.inicio,
      fim: a.fim,
      geometria: lerGeometria(a.poligono),
    });
  }
  return alertas.sort((x, y) => x.inicio.localeCompare(y.inicio));
}

export async function carregarAlertas(): Promise<Alerta[]> {
  const resposta = await buscar(URL_AVISOS, {}, 30000);
  return normalizarAvisos(await resposta.json());
}
