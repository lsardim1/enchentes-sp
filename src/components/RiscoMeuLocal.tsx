"use client";

import { useState } from "react";
import type { Fonte, RiscoLocal } from "@/lib/types";
import { Cartao, ErroBox } from "./ui";

const NIVEIS = {
  alto: { rotulo: "Risco alto", cor: "#dc2626", icone: "🔴" },
  medio: { rotulo: "Risco moderado", cor: "#f59e0b", icone: "🟠" },
  baixo: { rotulo: "Risco baixo", cor: "#16a34a", icone: "🟢" },
} as const;

export function RiscoResultado({ risco, rotulo }: { risco: RiscoLocal; rotulo?: string }) {
  const n = NIVEIS[risco.nivel];
  return (
    <div className="rounded-lg border border-line bg-bg p-3 text-sm" style={{ borderLeft: `6px solid ${n.cor}` }}>
      <p className="font-semibold">
        {n.icone} {n.rotulo}
        {rotulo ? <span className="font-normal text-muted"> — {rotulo}</span> : null}
      </p>
      {risco.motivos.length > 0 ? (
        <ul className="mt-1 list-disc pl-5">
          {risco.motivos.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1">Sem avisos vigentes, mancha de inundação, área de risco ou ocorrências recentes neste ponto.</p>
      )}
      <p className="mt-2 text-xs text-muted">
        Indicativo baseado em dados públicos (INMET, CGE e GeoSampa). Não substitui orientação da Defesa Civil.
      </p>
    </div>
  );
}

export async function consultarRisco(lat: number, lng: number): Promise<RiscoLocal> {
  const r = await fetch(`/api/risco-local?lat=${lat}&lng=${lng}`);
  const corpo = await r.json();
  if (!r.ok) throw new Error(corpo?.erro ?? "Falha ao consultar o risco.");
  return (corpo as Fonte<RiscoLocal>).data;
}

export function obterPosicao(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocalização indisponível neste navegador."));
    navigator.geolocation.getCurrentPosition(resolve, (e) =>
      reject(new Error(e.code === e.PERMISSION_DENIED ? "Permissão de localização negada." : "Não foi possível obter sua localização.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

export function RiscoMeuLocal() {
  const [risco, setRisco] = useState<RiscoLocal | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function consultar() {
    setCarregando(true);
    setErro(null);
    try {
      const pos = await obterPosicao();
      setRisco(await consultarRisco(pos.coords.latitude, pos.coords.longitude));
    } catch (e) {
      setRisco(null);
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Cartao titulo="📍 Risco no meu local">
      <p className="mb-3 text-sm text-muted">
        Cruza os avisos do INMET, manchas de inundação, áreas de risco e alagamentos próximos.
      </p>
      <button
        type="button"
        onClick={() => void consultar()}
        disabled={carregando}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60"
      >
        {carregando ? "Consultando…" : "Usar minha localização"}
      </button>
      <div className="mt-3">
        {erro && <ErroBox mensagem={erro} />}
        {risco && <RiscoResultado risco={risco} />}
      </div>
    </Cartao>
  );
}
