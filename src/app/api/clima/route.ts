import { comCache } from "@/lib/cache";
import { carregarClima } from "@/lib/clima";
import { falha, jsonCache } from "@/lib/http";

export async function GET() {
  try {
    const fonte = await comCache("clima", 10 * 60_000, carregarClima);
    return jsonCache(fonte, 120);
  } catch (erro) {
    return falha("Não foi possível obter a previsão do tempo agora.", 502, erro);
  }
}
