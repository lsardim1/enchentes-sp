import type { Geometry } from "geojson";

export type Fonte<T> = {
  data: T;
  atualizadoEm: string;
  desatualizado: boolean;
};

export type Alerta = {
  id: number;
  titulo: string;
  severidade: string;
  cor: string;
  riscos: string[];
  instrucoes: string[];
  inicio: string;
  fim: string;
  geometria: Geometry | null;
};

export type Clima = {
  atual: {
    quando: string;
    temperatura: number;
    sensacao: number;
    umidade: number;
    chuvaMm: number;
    codigo: number;
  };
  proximas: { hora: string; mm: number }[];
  horas: { hora: string; probabilidade: number | null; mm: number }[];
  dias: {
    data: string;
    mm: number;
    probabilidadeMax: number | null;
    tmax: number;
    tmin: number;
    codigo: number;
  }[];
};

export type StatusPonto =
  | "ativo-transitavel"
  | "ativo-intransitavel"
  | "inativo-transitavel"
  | "inativo-intransitavel";

export type PontoAlagamento = {
  id: string;
  zona: string;
  bairro: string;
  via: string;
  horario: string;
  sentido: string;
  referencia: string;
  status: StatusPonto;
  lat: number | null;
  lng: number | null;
};

export type Alagamentos = {
  data: string;
  pontos: PontoAlagamento[];
  resumo: { ativos: number; inativos: number };
};

export type Coordenada = { lat: number; lng: number; nome: string };

export type Noticia = {
  id: string;
  titulo: string;
  link: string;
  data: string;
  resumo: string;
};

export type RiscoLocal = {
  nivel: "alto" | "medio" | "baixo";
  motivos: string[];
  alertas: Alerta[];
  manchas: { tempoRetorno: number; profundidadeMax: number | null }[];
  areaRisco: { nome: string; grau: string; processo: string } | null;
  ocorrenciasProximas: number;
  alagamentosCge: number;
};
