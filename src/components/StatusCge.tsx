"use client";

import Link from "next/link";
import type { Alagamentos, Fonte } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { Carregando, Cartao, ErroBox, Frescor } from "./ui";

export function StatusCge() {
  const { dados, erro, carregando, recarregar } = useApi<Fonte<Alagamentos>>("/api/alagamentos", 3 * 60_000);
  const a = dados?.data;
  const intransitaveis = a?.pontos.filter((p) => p.status === "ativo-intransitavel").length ?? 0;
  return (
    <Cartao titulo="🚧 Alagamentos agora (CGE)">
      {carregando && !a && <Carregando />}
      {erro && !a && <ErroBox mensagem={erro} aoTentar={recarregar} />}
      {a && (
        <>
          {a.resumo.ativos === 0 ? (
            <p className="text-sm">
              ✅ Nenhum ponto de alagamento ativo registrado pelo CGE hoje
              {a.resumo.inativos > 0 ? ` (${a.resumo.inativos} já encerrado(s))` : ""}.
            </p>
          ) : (
            <p className="text-sm">
              🔴 <strong>{a.resumo.ativos}</strong> ponto(s) ativo(s), sendo <strong>{intransitaveis}</strong> intransitável(is).
            </p>
          )}
          <p className="mt-2 text-sm">
            <Link href="/mapa" className="text-accent underline">
              Ver no mapa →
            </Link>
          </p>
          <div className="mt-3">
            <Frescor fonte="CGE-SP (leitura da página oficial)" atualizadoEm={dados.atualizadoEm} desatualizado={dados.desatualizado} />
          </div>
        </>
      )}
    </Cartao>
  );
}
