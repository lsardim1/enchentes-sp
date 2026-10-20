import type { Metadata } from "next";
import { NoticiasLista } from "@/components/NoticiasLista";

export const metadata: Metadata = { title: "Notícias CGE — Enchentes SP" };

export default function PaginaNoticias() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold">Boletins do CGE</h1>
        <p className="text-sm text-muted">Notícias do Centro de Gerenciamento de Emergências Climáticas.</p>
      </header>
      <NoticiasLista />
    </div>
  );
}
