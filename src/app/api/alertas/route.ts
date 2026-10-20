import { comCache } from "@/lib/cache";
import { falha, jsonCache } from "@/lib/http";
import { carregarAlertas } from "@/lib/inmet";

export async function GET() {
  try {
    const fonte = await comCache("alertas", 5 * 60_000, carregarAlertas);
    return jsonCache(fonte, 60);
  } catch (erro) {
    return falha("Não foi possível obter os avisos do INMET agora.", 502, erro);
  }
}
