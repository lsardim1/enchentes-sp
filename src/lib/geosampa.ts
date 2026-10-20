import type { Feature, FeatureCollection, Geometry } from "geojson";
import { buscar } from "./cache";

const BASE = "http://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/ows";

// Somente camadas conhecidas passam pelo proxy; as manchas (488 mil feições) ficam no WMS.
export const CAMADAS = {
  risco_hidrologico: "ge_poligono",
  area_risco_geologico: "ge_poligono",
  area_inundavel: "ge_poligono",
  risco_ocorrencia_alagamento: "ge_ponto",
  risco_ocorrencia_inundacao: "ge_ponto",
  risco_ocorrencia_deslizamento: "ge_ponto",
} as const;

export type Camada = keyof typeof CAMADAS;

export function ehCamada(nome: string): nome is Camada {
  return Object.hasOwn(CAMADAS, nome);
}

type Opcoes = { cql?: string; propriedades?: string[]; max?: number };

export async function wfs<P = Record<string, unknown>>(
  camada: string,
  { cql, propriedades, max }: Opcoes = {},
): Promise<FeatureCollection<Geometry, P>> {
  const params = new URLSearchParams({
    service: "WFS",
    version: "1.0.0",
    request: "GetFeature",
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    typeName: `geoportal:${camada}`,
  });
  if (cql) params.set("cql_filter", cql);
  if (propriedades?.length) params.set("propertyName", propriedades.join(","));
  if (max) params.set("maxFeatures", String(max));
  const resposta = await buscar(`${BASE}?${params}`, {}, 60000);
  return (await resposta.json()) as FeatureCollection<Geometry, P>;
}

// O prefixo SRID=4326 é necessário: sem ele o GeoServer interpreta o ponto no CRS nativo (metros).
export function cqlInterseccao(geom: string, lat: number, lng: number) {
  return `INTERSECTS(${geom},SRID=4326;POINT(${lng} ${lat}))`;
}

export function cqlCaixa(geom: string, lat: number, lng: number, grau: number) {
  return `BBOX(${geom},${lng - grau},${lat - grau},${lng + grau},${lat + grau},'EPSG:4326')`;
}

export function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function pontoDe(f: Feature<Geometry>): [number, number] | null {
  return f.geometry?.type === "Point" ? (f.geometry.coordinates as [number, number]) : null;
}
