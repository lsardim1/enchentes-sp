import { buscar } from "./cache";
import type { Coordenada, PontoAlagamento } from "./types";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
// Caixa do município de São Paulo (oeste,sul,leste,norte).
const VIEWBOX = "-46.83,-23.36,-46.36,-23.80";

const cacheCoordenadas = new Map<string, Coordenada | null>();
const pendentes = new Set<string>();

type Tarefa = {
  executar: () => Promise<unknown>;
  resolver: (valor: unknown) => void;
  rejeitar: (erro: unknown) => void;
};
const filaAlta: Tarefa[] = [];
const filaBaixa: Tarefa[] = [];
let drenando = false;

async function drenar() {
  if (drenando) return;
  drenando = true;
  try {
    for (let t = filaAlta.shift() ?? filaBaixa.shift(); t; t = filaAlta.shift() ?? filaBaixa.shift()) {
      try {
        t.resolver(await t.executar());
      } catch (erro) {
        t.rejeitar(erro);
      }
      await new Promise((r) => setTimeout(r, 1100));
    }
  } finally {
    drenando = false;
  }
}

// Política do Nominatim: no máximo 1 requisição por segundo. Buscas do usuário furam a fila do segundo plano.
function naVez<T>(tarefa: () => Promise<T>, alta = false): Promise<T> {
  return new Promise<T>((resolver, rejeitar) => {
    (alta ? filaAlta : filaBaixa).push({
      executar: tarefa,
      resolver: resolver as (v: unknown) => void,
      rejeitar,
    });
    void drenar();
  });
}

const ABREVIACOES: [RegExp, string][] = [
  [/^AV\b\.?/i, "Avenida"],
  [/^R\b\.?/i, "Rua"],
  [/^AL\b\.?/i, "Alameda"],
  [/^PC\b\.?/i, "Praça"],
  [/^PTE\b\.?/i, "Ponte"],
  [/^VD\b\.?/i, "Viaduto"],
  [/^TUN\b\.?/i, "Túnel"],
  [/^EST\b\.?/i, "Estrada"],
  [/^LG\b\.?/i, "Largo"],
  [/^TV\b\.?/i, "Travessa"],
  [/^MAR\b\.?/i, "Marginal"],
  [/^PAS\b\.?/i, "Passagem"],
];

export function expandirVia(via: string): string {
  let v = via.trim();
  for (const [re, nome] of ABREVIACOES) {
    if (re.test(v)) {
      v = v.replace(re, nome);
      break;
    }
  }
  return v.replace(/\bDR\b\.?/gi, "Doutor").replace(/\bPDE\b\.?/gi, "Padre").replace(/\bGAL\b\.?/gi, "General");
}

async function consultar(q: string): Promise<Coordenada | null> {
  const url = `${NOMINATIM}?format=jsonv2&limit=1&countrycodes=br&viewbox=${VIEWBOX}&bounded=1&q=${encodeURIComponent(q)}`;
  const lista = (await (await buscar(url, { headers: { "Accept-Language": "pt-BR" } })).json()) as {
    lat: string;
    lon: string;
    display_name: string;
  }[];
  const r = lista[0];
  return r ? { lat: Number(r.lat), lng: Number(r.lon), nome: r.display_name } : null;
}

export function buscarEndereco(q: string, limite = 5): Promise<Coordenada[]> {
  const url = `${NOMINATIM}?format=jsonv2&limit=${limite}&countrycodes=br&viewbox=${VIEWBOX}&bounded=1&q=${encodeURIComponent(q + ", São Paulo")}`;
  return naVez(async () => {
    const lista = (await (await buscar(url, { headers: { "Accept-Language": "pt-BR" } })).json()) as {
      lat: string;
      lon: string;
      display_name: string;
    }[];
    return lista.map((r) => ({ lat: Number(r.lat), lng: Number(r.lon), nome: r.display_name }));
  }, true);
}

function chavePonto(p: Pick<PontoAlagamento, "via" | "bairro">) {
  return `${p.via}|${p.bairro}`.toUpperCase();
}

async function processar(p: PontoAlagamento) {
  const chave = chavePonto(p);
  try {
    const via = expandirVia(p.via);
    const resultado = await naVez(async () => {
      return (await consultar(`${via}, ${p.bairro}, São Paulo`)) ?? (await consultar(`${via}, São Paulo`));
    });
    cacheCoordenadas.set(chave, resultado);
  } catch {
    // falha transitória: não cacheia para tentar de novo depois
  } finally {
    pendentes.delete(chave);
  }
}

// Aplica coordenadas já resolvidas e agenda em segundo plano a geocodificação das demais.
export function aplicarCoordenadas(pontos: PontoAlagamento[]): PontoAlagamento[] {
  const faltando = new Map<string, PontoAlagamento>();
  const saida = pontos.map((p) => {
    const chave = chavePonto(p);
    const c = cacheCoordenadas.get(chave);
    if (c === undefined) {
      if (!pendentes.has(chave)) faltando.set(chave, p);
      return p;
    }
    return c ? { ...p, lat: c.lat, lng: c.lng } : p;
  });
  for (const [chave, p] of faltando) {
    pendentes.add(chave);
    void processar(p);
  }
  return saida;
}

export function __limparCacheGeocode() {
  cacheCoordenadas.clear();
  pendentes.clear();
}
