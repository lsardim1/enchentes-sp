"use client";

import type { FeatureCollection, Geometry } from "geojson";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Fonte } from "@/lib/types";
import { normalizarSubprefeitura } from "@/lib/formato";
import { useApi } from "@/lib/useApi";
import { Carregando, Cartao, ErroBox, Frescor } from "./ui";

type Props = {
  nm_subprefeitura: string | null;
  dt_ocorrencia: string | null;
  dc_tipo_ocorrencia: string;
};
type Colecao = Fonte<FeatureCollection<Geometry, Props>>;

type Tipo = "todos" | "alagamento" | "inundacao" | "deslizamento";

function mesDe(data: string | null) {
  return data ? data.slice(0, 7) : null;
}

export function HistoricoPainel() {
  const alag = useApi<Colecao>("/api/geosampa/risco_ocorrencia_alagamento");
  const inund = useApi<Colecao>("/api/geosampa/risco_ocorrencia_inundacao");
  const desl = useApi<Colecao>("/api/geosampa/risco_ocorrencia_deslizamento");
  const [tipo, setTipo] = useState<Tipo>("alagamento");
  const [sub, setSub] = useState("");

  const registros = useMemo(() => {
    const fontes: [Tipo, Colecao | null][] = [
      ["alagamento", alag.dados],
      ["inundacao", inund.dados],
      ["deslizamento", desl.dados],
    ];
    return fontes.flatMap(([t, c]) =>
      (c?.data.features ?? []).map((f) => {
        const s = normalizarSubprefeitura(f.properties.nm_subprefeitura);
        return { tipo: t, sub: s.chave, rotulo: s.rotulo, mes: mesDe(f.properties.dt_ocorrencia) };
      }),
    );
  }, [alag.dados, inund.dados, desl.dados]);

  const filtrados = registros.filter((r) => (tipo === "todos" || r.tipo === tipo) && (!sub || r.sub === sub));
  const subprefeituras = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of registros) m.set(r.sub, r.rotulo);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [registros]);

  const porSub = useMemo(() => {
    const m = new Map<string, { nome: string; total: number }>();
    for (const r of registros.filter((x) => tipo === "todos" || x.tipo === tipo)) {
      const atual = m.get(r.sub) ?? { nome: r.rotulo, total: 0 };
      atual.total++;
      m.set(r.sub, atual);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [registros, tipo]);

  const porMes = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filtrados) if (r.mes) m.set(r.mes, (m.get(r.mes) ?? 0) + 1);
    return [...m.entries()].sort().map(([mes, total]) => ({ mes, total }));
  }, [filtrados]);

  const carregando = (alag.carregando || inund.carregando || desl.carregando) && registros.length === 0;
  const erro = alag.erro || inund.erro || desl.erro;
  const ref = alag.dados ?? inund.dados ?? desl.dados;

  return (
    <div className="flex flex-col gap-4">
      <Cartao>
        <div className="flex flex-wrap items-end gap-4 text-sm">
          <label className="flex flex-col gap-1">
            Tipo de ocorrência
            <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)} className="rounded border border-line bg-bg px-2 py-1.5">
              <option value="alagamento">Alagamento</option>
              <option value="inundacao">Inundação</option>
              <option value="deslizamento">Deslizamento</option>
              <option value="todos">Todos</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Subprefeitura
            <select value={sub} onChange={(e) => setSub(e.target.value)} className="rounded border border-line bg-bg px-2 py-1.5">
              <option value="">Todas</option>
              {subprefeituras.map(([chave, rotulo]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
          <p className="ml-auto text-lg font-semibold">{filtrados.length} ocorrência(s)</p>
        </div>
      </Cartao>

      {carregando && <Carregando texto="Carregando ocorrências do GeoSampa…" />}
      {erro && registros.length === 0 && <ErroBox mensagem={erro} />}

      {registros.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Cartao titulo="Ocorrências por subprefeitura">
            <div className="h-[28rem]" role="img" aria-label="Gráfico de barras de ocorrências por subprefeitura">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porSub.slice(0, 15)} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis type="number" allowDecimals={false} stroke="var(--muted)" />
                  <YAxis type="category" dataKey="nome" width={150} tick={{ fontSize: 11 }} stroke="var(--muted)" />
                  <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)" }} />
                  <Bar dataKey="total" name="Ocorrências" fill="var(--accent)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-xs text-muted">15 subprefeituras com mais registros.</p>
          </Cartao>
          <Cartao titulo="Ocorrências por mês">
            <div className="h-[28rem]" role="img" aria-label="Gráfico de barras de ocorrências por mês">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="mes" stroke="var(--muted)" />
                  <YAxis allowDecimals={false} stroke="var(--muted)" />
                  <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)" }} />
                  <Bar dataKey="total" name="Ocorrências" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Cartao>
        </div>
      )}

      {ref && <Frescor fonte="GeoSampa (ocorrências SIGRC, camadas risco_ocorrencia_*)" atualizadoEm={ref.atualizadoEm} desatualizado={ref.desatualizado} />}
    </div>
  );
}
