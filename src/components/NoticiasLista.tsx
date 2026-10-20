"use client";

import type { Fonte, Noticia } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { Carregando, Cartao, ErroBox, Frescor } from "./ui";

export function NoticiasLista() {
  const { dados, erro, carregando, recarregar } = useApi<Fonte<Noticia[]>>("/api/noticias", 10 * 60_000);
  return (
    <div className="flex flex-col gap-3">
      {carregando && !dados && <Carregando />}
      {erro && !dados && <ErroBox mensagem={erro} aoTentar={recarregar} />}
      {dados?.data.map((n) => (
        <Cartao key={n.id}>
          <h2 className="font-semibold">
            <a href={n.link} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              {n.titulo}
            </a>
          </h2>
          <p className="text-xs text-muted">{n.data}</p>
          <p className="mt-2 text-sm">{n.resumo}</p>
        </Cartao>
      ))}
      {dados && <Frescor fonte="CGE-SP (feed de notícias)" atualizadoEm={dados.atualizadoEm} desatualizado={dados.desatualizado} />}
    </div>
  );
}
