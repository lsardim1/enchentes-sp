import { buscar } from "./cache";
import type { Clima } from "./types";

const URL_CLIMA =
  "https://api.open-meteo.com/v1/forecast?latitude=-23.55&longitude=-46.63" +
  "&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code" +
  "&minutely_15=precipitation" +
  "&hourly=precipitation_probability,precipitation" +
  "&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,weather_code" +
  "&timezone=America%2FSao_Paulo&forecast_days=3";

type Bruto = {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
  };
  minutely_15: { time: string[]; precipitation: number[] };
  hourly: { time: string[]; precipitation_probability: (number | null)[]; precipitation: number[] };
  daily: {
    time: string[];
    precipitation_sum: number[];
    precipitation_probability_max: (number | null)[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
};

export function normalizarClima(b: Bruto): Clima {
  const agora = b.current.time;
  const proximas = b.minutely_15.time
    .map((hora, i) => ({ hora, mm: b.minutely_15.precipitation[i] ?? 0 }))
    .filter((p) => p.hora >= agora)
    .slice(0, 8);
  // Horas cheias a partir da hora corrente (comparação lexicográfica de ISO local).
  const horaAtual = agora.slice(0, 13);
  const horas = b.hourly.time
    .map((hora, i) => ({
      hora,
      probabilidade: b.hourly.precipitation_probability[i] ?? null,
      mm: b.hourly.precipitation[i] ?? 0,
    }))
    .filter((h) => h.hora.slice(0, 13) >= horaAtual)
    .slice(0, 24);
  const dias = b.daily.time.map((data, i) => ({
    data,
    mm: b.daily.precipitation_sum[i] ?? 0,
    probabilidadeMax: b.daily.precipitation_probability_max[i] ?? null,
    tmax: b.daily.temperature_2m_max[i],
    tmin: b.daily.temperature_2m_min[i],
    codigo: b.daily.weather_code[i],
  }));
  return {
    atual: {
      quando: b.current.time,
      temperatura: b.current.temperature_2m,
      sensacao: b.current.apparent_temperature,
      umidade: b.current.relative_humidity_2m,
      chuvaMm: b.current.precipitation,
      codigo: b.current.weather_code,
    },
    proximas,
    horas,
    dias,
  };
}

export async function carregarClima(): Promise<Clima> {
  const resposta = await buscar(URL_CLIMA);
  return normalizarClima(await resposta.json());
}
