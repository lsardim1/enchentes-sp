import { comCache } from "./cache";
import { carregarAlagamentos } from "./cge";
import { aplicarCoordenadas } from "./geocode";
import { CAMADAS, cqlCaixa, cqlInterseccao, distanciaMetros, pontoDe, wfs } from "./geosampa";
import { carregarAlertas } from "./inmet";
import { situacaoAlerta } from "./formato";
import type { RiscoLocal } from "./types";

const RAIO_M = 500;
const GRAU = 0.0055;

type PropsMancha = { qt_tempo_retorno: number; qt_profundidade_maxima: number | null };
type PropsRisco = {
  nm_area_risco_hidrologico: string;
  tx_grau_risco_hidrologico: string;
  tx_tipo_processo: string;
};

export async function calcularRiscoLocal(lat: number, lng: number): Promise<RiscoLocal> {
  const camadasManchas = ["mancha_inundacao_5", "mancha_inundacao_25", "mancha_inundacao_100"];
  const [alertas, manchasFc, riscoFc, alag, inund, cge] = await Promise.all([
    comCache("alertas", 5 * 60_000, carregarAlertas).then((f) => f.data).catch(() => []),
    Promise.all(
      camadasManchas.map((c) =>
        wfs<PropsMancha>(c, {
          cql: cqlInterseccao("ge_poligono", lat, lng),
          propriedades: ["qt_tempo_retorno", "qt_profundidade_maxima"],
        }).catch(() => ({ features: [] })),
      ),
    ),
    wfs<PropsRisco>("risco_hidrologico", {
      cql: cqlInterseccao(CAMADAS.risco_hidrologico, lat, lng),
    }).catch(() => ({ features: [] })),
    wfs("risco_ocorrencia_alagamento", { cql: cqlCaixa("ge_ponto", lat, lng, GRAU) }).catch(() => ({
      features: [],
    })),
    wfs("risco_ocorrencia_inundacao", { cql: cqlCaixa("ge_ponto", lat, lng, GRAU) }).catch(() => ({
      features: [],
    })),
    comCache("alagamentos", 3 * 60_000, async () => {
      const a = await carregarAlagamentos();
      return { ...a, pontos: aplicarCoordenadas(a.pontos) };
    })
      .then((f) => f.data.pontos)
      .catch(() => []),
  ]);

  const manchas = manchasFc.flatMap((fc) =>
    fc.features.slice(0, 1).map((f) => ({
      tempoRetorno: f.properties.qt_tempo_retorno,
      profundidadeMax: f.properties.qt_profundidade_maxima,
    })),
  );
  const area = riscoFc.features[0]?.properties;
  const areaRisco = area
    ? {
        nome: area.nm_area_risco_hidrologico,
        grau: area.tx_grau_risco_hidrologico,
        processo: area.tx_tipo_processo,
      }
    : null;

  const ocorrenciasProximas = [...alag.features, ...inund.features].filter((f) => {
    const p = pontoDe(f);
    return p ? distanciaMetros(lat, lng, p[1], p[0]) <= RAIO_M : false;
  }).length;

  const alagamentosCge = cge.filter(
    (p) =>
      p.status.startsWith("ativo") &&
      p.lat !== null &&
      p.lng !== null &&
      distanciaMetros(lat, lng, p.lat, p.lng) <= RAIO_M,
  ).length;

  const vigentes = alertas.filter((a) => situacaoAlerta(a) === "vigente");
  const previstos = alertas.filter((a) => situacaoAlerta(a) === "previsto");
  const motivos: string[] = [];
  const temAlerta = vigentes.length > 0;
  const alertaGrave = vigentes.some((a) => /perigo$|grande perigo/i.test(a.severidade.trim()));
  const grauAlto = /R[34]/i.test(areaRisco?.grau ?? "");
  if (alagamentosCge) motivos.push(`${alagamentosCge} ponto(s) de alagamento ativo(s) a menos de ${RAIO_M} m (CGE)`);
  if (manchas.length) motivos.push(`Local em mancha de inundação (tempo de retorno de ${manchas[0].tempoRetorno} anos)`);
  if (areaRisco) motivos.push(`Área de risco hidrológico ${areaRisco.grau} (${areaRisco.nome})`);
  if (ocorrenciasProximas) motivos.push(`${ocorrenciasProximas} ocorrência(s) de alagamento/inundação em 2026 num raio de ${RAIO_M} m`);
  if (temAlerta) motivos.push(`${vigentes.length} aviso(s) do INMET em vigor para a cidade`);
  if (previstos.length) motivos.push(`${previstos.length} aviso(s) do INMET previsto(s) para os próximos dias`);

  let nivel: RiscoLocal["nivel"] = "baixo";
  const exposto = manchas.length > 0 || !!areaRisco || ocorrenciasProximas > 0;
  if (alagamentosCge > 0 || grauAlto || (alertaGrave && exposto) || manchas.some((m) => m.tempoRetorno <= 5)) {
    nivel = "alto";
  } else if (temAlerta || exposto) {
    nivel = "medio";
  }

  return { nivel, motivos, alertas: vigentes, manchas, areaRisco, ocorrenciasProximas, alagamentosCge };
}
