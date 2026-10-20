import { comCache } from "@/lib/cache";
import { dentroDeSaoPaulo, falha, jsonCache, numero } from "@/lib/http";
import { calcularRiscoLocal } from "@/lib/risco";

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const lat = numero(p.get("lat"));
  const lng = numero(p.get("lng"));
  if (lat === null || lng === null) return falha("Informe lat e lng.", 400);
  if (!dentroDeSaoPaulo(lat, lng)) return falha("Local fora da cidade de São Paulo.", 422);
  try {
    // Arredondar a ~100 m aumenta o reaproveitamento do cache.
    const la = Math.round(lat * 1000) / 1000;
    const ln = Math.round(lng * 1000) / 1000;
    const fonte = await comCache(`risco:${la},${ln}`, 5 * 60_000, () => calcularRiscoLocal(la, ln));
    return jsonCache(fonte, 60);
  } catch (erro) {
    return falha("Não foi possível calcular o risco deste local agora.", 502, erro);
  }
}
