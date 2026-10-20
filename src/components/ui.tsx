import { formatarAtualizacao } from "@/lib/formato";

export function Frescor({
  atualizadoEm,
  desatualizado,
  fonte,
}: {
  atualizadoEm?: string;
  desatualizado?: boolean;
  fonte: string;
}) {
  return (
    <p className="text-xs text-muted">
      Fonte: {fonte}
      {atualizadoEm ? ` · atualizado às ${formatarAtualizacao(atualizadoEm)}` : ""}
      {desatualizado ? (
        <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 font-medium text-amber-600 dark:text-amber-400">
          fonte indisponível — exibindo último dado
        </span>
      ) : null}
    </p>
  );
}

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <p role="status" className="text-sm text-muted">
      {texto}
    </p>
  );
}

export function ErroBox({ mensagem, aoTentar }: { mensagem: string; aoTentar?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
      <p>{mensagem}</p>
      {aoTentar ? (
        <button type="button" onClick={aoTentar} className="mt-2 underline">
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}

export function Cartao({
  titulo,
  children,
  className = "",
}: {
  titulo?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-panel p-4 ${className}`}>
      {titulo ? <h2 className="mb-3 text-base font-semibold">{titulo}</h2> : null}
      {children}
    </section>
  );
}
