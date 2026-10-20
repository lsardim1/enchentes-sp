"use client";

import type { Clima, Fonte } from "@/lib/types";
import {
  classificarChuva,
  descreverTempo,
  formatarDiaSemana,
  formatarHora,
} from "@/lib/formato";
import { useApi } from "@/lib/useApi";
import { Carregando, Cartao, ErroBox, Frescor } from "./ui";

function resumoProximas(c: Clima) {
  const max = Math.max(0, ...c.proximas.map((p) => p.mm));
  const total = c.proximas.reduce((s, p) => s + p.mm, 0);
  if (max === 0) return "Sem previsão de chuva nas próximas 2 horas.";
  const primeira = c.proximas.find((p) => p.mm > 0);
  return `Previsão de ${classificarChuva(max)} nas próximas 2 horas (${total.toFixed(1)} mm no total, a partir das ${formatarHora(primeira!.hora)}).`;
}

export function ClimaSecao() {
  const { dados, erro, carregando, recarregar } = useApi<Fonte<Clima>>("/api/clima", 10 * 60_000);
  const c = dados?.data;
  const tempo = c ? descreverTempo(c.atual.codigo) : null;
  const maxBarra = c ? Math.max(0.5, ...c.proximas.map((p) => p.mm)) : 1;

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Cartao titulo="🌡️ Agora em São Paulo" className="xl:col-span-1">
        {carregando && !c && <Carregando />}
        {erro && !c && <ErroBox mensagem={erro} aoTentar={recarregar} />}
        {c && tempo && (
          <>
            <div className="flex items-center gap-4">
              <span className="text-5xl" aria-hidden>
                {tempo.icone}
              </span>
              <div>
                <p className="text-4xl font-bold">{Math.round(c.atual.temperatura)}°C</p>
                <p className="text-sm text-muted">{tempo.texto}</p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-muted">Sensação</dt>
                <dd className="font-medium">{Math.round(c.atual.sensacao)}°C</dd>
              </div>
              <div>
                <dt className="text-muted">Umidade</dt>
                <dd className="font-medium">{c.atual.umidade}%</dd>
              </div>
              <div>
                <dt className="text-muted">Chuva agora</dt>
                <dd className="font-medium">{c.atual.chuvaMm.toFixed(1)} mm</dd>
              </div>
            </dl>
            <div className="mt-3">
              <Frescor fonte="Open-Meteo" atualizadoEm={dados.atualizadoEm} desatualizado={dados.desatualizado} />
            </div>
          </>
        )}
      </Cartao>

      <Cartao titulo="🌧️ Chuva nas próximas 2 horas" className="xl:col-span-2">
        {c ? (
          <>
            <p className="mb-3 text-sm font-medium">{resumoProximas(c)}</p>
            <ul className="flex h-28 items-end gap-2" aria-label="Precipitação prevista a cada 15 minutos">
              {c.proximas.map((p) => (
                <li key={p.hora} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] text-muted">{p.mm.toFixed(1)}</span>
                  <div
                    className="w-full rounded-t bg-accent"
                    style={{ height: `${Math.max(3, (p.mm / maxBarra) * 70)}px`, opacity: p.mm > 0 ? 1 : 0.3 }}
                    title={`${p.mm.toFixed(1)} mm às ${formatarHora(p.hora)}`}
                  />
                  <span className="text-[10px] text-muted">{formatarHora(p.hora)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted">mm a cada 15 minutos</p>
          </>
        ) : (
          <Carregando />
        )}
      </Cartao>

      {c && (
        <>
          <Cartao titulo="⏱️ Próximas 24 horas (probabilidade de chuva)" className="xl:col-span-2">
            <ul className="flex gap-2 overflow-x-auto pb-2" aria-label="Previsão horária">
              {c.horas.map((h) => (
                <li key={h.hora} className="flex min-w-14 flex-col items-center rounded-lg bg-bg px-2 py-2 text-center text-xs">
                  <span className="text-muted">{formatarHora(h.hora)}</span>
                  <span className="mt-1 text-sm font-semibold">{h.probabilidade ?? "—"}%</span>
                  <span className="text-muted">{h.mm.toFixed(1)} mm</span>
                </li>
              ))}
            </ul>
          </Cartao>
          <Cartao titulo="📅 Próximos dias" className="xl:col-span-1">
            <ul className="flex flex-col gap-2 text-sm">
              {c.dias.map((d) => (
                <li key={d.data} className="flex items-center justify-between gap-2">
                  <span className="w-24 capitalize">{formatarDiaSemana(d.data)}</span>
                  <span aria-hidden>{descreverTempo(d.codigo).icone}</span>
                  <span>
                    {Math.round(d.tmin)}° / {Math.round(d.tmax)}°
                  </span>
                  <span className="text-muted">
                    {d.probabilidadeMax ?? "—"}% · {d.mm.toFixed(1)} mm
                  </span>
                </li>
              ))}
            </ul>
          </Cartao>
        </>
      )}
    </div>
  );
}
