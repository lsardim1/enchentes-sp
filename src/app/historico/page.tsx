import type { Metadata } from "next";
import { HistoricoPainel } from "@/components/HistoricoPainel";

export const metadata: Metadata = { title: "Histórico — Enchentes SP" };

export default function PaginaHistorico() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold">Histórico de ocorrências</h1>
        <p className="text-sm text-muted">
          Registros do GeoSampa (Prefeitura de São Paulo) de alagamentos, inundações e deslizamentos, por subprefeitura. A
          camada abrange os registros carregados no ano corrente.
        </p>
      </header>
      <HistoricoPainel />
    </div>
  );
}
