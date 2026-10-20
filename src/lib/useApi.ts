"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type EstadoApi<T> = {
  dados: T | null;
  erro: string | null;
  carregando: boolean;
  recarregar: () => void;
};

// Busca uma rota interna e repete a cada `intervaloMs` (0 = uma única vez).
export function useApi<T>(url: string | null, intervaloMs = 0): EstadoApi<T> {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(Boolean(url));
  const [tick, setTick] = useState(0);
  const urlAnterior = useRef(url);

  useEffect(() => {
    if (!url) return;
    if (urlAnterior.current !== url) {
      urlAnterior.current = url;
      setCarregando(true);
    }
    const controle = new AbortController();
    let vivo = true;

    async function carregar() {
      try {
        const r = await fetch(url!, { signal: controle.signal });
        const corpo = await r.json();
        if (!vivo) return;
        if (!r.ok) throw new Error(corpo?.erro ?? `Erro ${r.status}`);
        setDados(corpo as T);
        setErro(null);
      } catch (e) {
        if (!vivo || (e as Error).name === "AbortError") return;
        setErro((e as Error).message || "Falha ao carregar.");
      } finally {
        if (vivo) setCarregando(false);
      }
    }

    void carregar();
    const id = intervaloMs > 0 ? setInterval(carregar, intervaloMs) : undefined;
    return () => {
      vivo = false;
      controle.abort();
      if (id) clearInterval(id);
    };
  }, [url, intervaloMs, tick]);

  const recarregar = useCallback(() => setTick((t) => t + 1), []);
  return { dados, erro, carregando, recarregar };
}
