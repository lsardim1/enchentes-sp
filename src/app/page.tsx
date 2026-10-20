import { AlertasSecao } from "@/components/AlertasSecao";
import { ClimaSecao } from "@/components/ClimaSecao";
import { StatusCge } from "@/components/StatusCge";
import { RiscoMeuLocal } from "@/components/RiscoMeuLocal";

export default function Inicio() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold">Enchentes em São Paulo</h1>
        <p className="text-sm text-muted">Alertas oficiais, previsão de chuva e alagamentos em tempo quase real.</p>
      </header>
      <AlertasSecao />
      <ClimaSecao />
      <div className="grid gap-4 md:grid-cols-2">
        <StatusCge />
        <RiscoMeuLocal />
      </div>
    </div>
  );
}
