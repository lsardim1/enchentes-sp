"use client";

import type { Alerta, Fonte } from "@/lib/types";
import { formatarDataHora, situacaoAlerta } from "@/lib/formato";
import { useApi } from "@/lib/useApi";
import { Carregando, Cartao, ErroBox, Frescor } from "./ui";

export function AlertaCard({ alerta }: { alerta: Alerta }) {
  const situacao = situacaoAlerta(alerta);
  return (
    <article className="rounded-lg border border-line bg-bg p-3" style={{ borderLeft: `6px solid ${alerta.cor}` }}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          {alerta.titulo} <span className="font-normal text-muted">— {alerta.severidade}</span>
          <span
            className={`ml-2 rounded px-1.5 py-0.5 text-xs font-medium ${
              situacao === "vigente" ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-sky-500/15 text-sky-700 dark:text-sky-300"
            }`}
          >
            {situacao === "vigente" ? "Em vigor" : "Previsto"}
          </span>
        </h3>
        <p className="text-xs text-muted">
          {formatarDataHora(alerta.inicio)} até {formatarDataHora(alerta.fim)}
        </p>
      </header>
      {alerta.riscos.map((r) => (
        <p key={r} className="mt-2 text-sm">
          {r}
        </p>
      ))}
      {alerta.instrucoes.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-accent">O que fazer</summary>
          <ul className="mt-1 list-disc pl-5">
            {alerta.instrucoes.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

export function AlertasSecao() {
  const { dados, erro, carregando, recarregar } = useApi<Fonte<Alerta[]>>("/api/alertas", 5 * 60_000);
  return (
    <Cartao titulo="⚠️ Alertas da Defesa Civil / INMET para São Paulo">
      {carregando && !dados && <Carregando />}
      {erro && !dados && <ErroBox mensagem={erro} aoTentar={recarregar} />}
      {dados &&
        (dados.data.length === 0 ? (
          <p className="text-sm">✅ Nenhum aviso meteorológico vigente para a capital neste momento.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {dados.data.map((a) => (
              <AlertaCard key={a.id} alerta={a} />
            ))}
          </div>
        ))}
      {dados && <div className="mt-3"><Frescor fonte="INMET (Defesa Civil)" atualizadoEm={dados.atualizadoEm} desatualizado={dados.desatualizado} /></div>}
    </Cartao>
  );
}
