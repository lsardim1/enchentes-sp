import type { Fonte } from "./types";

type Entrada = { valor: unknown; em: number };

const store = new Map<string, Entrada>();
const emVoo = new Map<string, Promise<unknown>>();

// Cache em memória com TTL; se a origem falhar, devolve o último dado bom marcado como desatualizado.
export async function comCache<T>(
  chave: string,
  ttlMs: number,
  carregar: () => Promise<T>,
): Promise<Fonte<T>> {
  const atual = store.get(chave);
  if (atual && Date.now() - atual.em < ttlMs) {
    return {
      data: atual.valor as T,
      atualizadoEm: new Date(atual.em).toISOString(),
      desatualizado: false,
    };
  }

  let promessa = emVoo.get(chave) as Promise<T> | undefined;
  if (!promessa) {
    promessa = carregar().finally(() => emVoo.delete(chave));
    emVoo.set(chave, promessa);
  }

  try {
    const valor = await promessa;
    const em = Date.now();
    store.set(chave, { valor, em });
    return { data: valor, atualizadoEm: new Date(em).toISOString(), desatualizado: false };
  } catch (erro) {
    if (atual) {
      return {
        data: atual.valor as T,
        atualizadoEm: new Date(atual.em).toISOString(),
        desatualizado: true,
      };
    }
    throw erro;
  }
}

export async function buscar(url: string, init: RequestInit = {}, timeoutMs = 20000) {
  const resposta = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": "enchentes-sp/1.0 (painel publico)", ...init.headers },
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${url}`);
  return resposta;
}
