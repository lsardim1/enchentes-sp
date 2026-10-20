export function formatarDataHora(iso: string) {
  // Aceita "2026-10-22 00:01" (INMET) e "2026-10-20T11:30" (Open-Meteo), ambos já em horário local.
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]} ${m[4]}:${m[5]}`;
}

export function formatarHora(iso: string) {
  return iso.slice(11, 16);
}

export function formatarDiaSemana(data: string) {
  const [a, m, d] = data.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(
    new Date(Date.UTC(a, m - 1, d)),
  );
}

// "AAAA-MM-DD HH:mm" no horário de São Paulo, comparável com os campos inicio/fim do INMET.
export function agoraSaoPaulo(d = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

export type SituacaoAlerta = "vigente" | "previsto" | "encerrado";

export function situacaoAlerta(a: { inicio: string; fim: string }, agora = agoraSaoPaulo()): SituacaoAlerta {
  if (a.fim < agora) return "encerrado";
  return a.inicio > agora ? "previsto" : "vigente";
}

// Normaliza nomes de subprefeitura (a fonte mistura caixa alta e baixa, com prefixo de sigla).
export function normalizarSubprefeitura(nome: string | null): { chave: string; rotulo: string } {
  const semSigla = (nome ?? "Não informada").replace(/^[A-Z]{2}\s*-\s*/, "").trim();
  const chave = semSigla
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
  const menores = new Set(["DE", "DA", "DO", "DAS", "DOS", "E"]);
  const rotulo = semSigla
    .toLowerCase()
    .replace(/(^|[\s/])(\p{L})(\p{L}*)/gu, (_m, sep: string, a: string, resto: string) => {
      const palavra = a + resto;
      return sep + (menores.has(palavra.toUpperCase()) && sep === " " ? palavra : a.toUpperCase() + resto);
    });
  return { chave, rotulo };
}

export function formatarAtualizacao(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

const CODIGOS: Record<number, [string, string]> = {
  0: ["☀️", "Céu limpo"],
  1: ["🌤️", "Predominantemente limpo"],
  2: ["⛅", "Parcialmente nublado"],
  3: ["☁️", "Nublado"],
  45: ["🌫️", "Neblina"],
  48: ["🌫️", "Neblina com geada"],
  51: ["🌦️", "Garoa fraca"],
  53: ["🌦️", "Garoa"],
  55: ["🌦️", "Garoa intensa"],
  61: ["🌧️", "Chuva fraca"],
  63: ["🌧️", "Chuva moderada"],
  65: ["🌧️", "Chuva forte"],
  80: ["🌦️", "Pancadas fracas"],
  81: ["🌧️", "Pancadas moderadas"],
  82: ["⛈️", "Pancadas fortes"],
  95: ["⛈️", "Tempestade"],
  96: ["⛈️", "Tempestade com granizo"],
  99: ["⛈️", "Tempestade com granizo forte"],
};

export function descreverTempo(codigo: number): { icone: string; texto: string } {
  const [icone, texto] = CODIGOS[codigo] ?? ["🌡️", "Condição variável"];
  return { icone, texto };
}

export function classificarChuva(mmPor15min: number) {
  const porHora = mmPor15min * 4;
  if (porHora <= 0) return "sem chuva";
  if (porHora < 2.5) return "chuva fraca";
  if (porHora < 10) return "chuva moderada";
  if (porHora < 50) return "chuva forte";
  return "chuva muito forte";
}

export const CORES_STATUS: Record<string, string> = {
  "ativo-intransitavel": "#dc2626",
  "ativo-transitavel": "#f59e0b",
  "inativo-intransitavel": "#9ca3af",
  "inativo-transitavel": "#d1d5db",
};

export const ROTULO_STATUS: Record<string, string> = {
  "ativo-intransitavel": "Ativo — intransitável",
  "ativo-transitavel": "Ativo — transitável",
  "inativo-intransitavel": "Encerrado — foi intransitável",
  "inativo-transitavel": "Encerrado — transitável",
};
