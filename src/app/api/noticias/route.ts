import { comCache } from "@/lib/cache";
import { falha, jsonCache } from "@/lib/http";
import { carregarNoticias } from "@/lib/noticias";

export async function GET() {
  try {
    const fonte = await comCache("noticias", 10 * 60_000, carregarNoticias);
    return jsonCache(fonte, 120);
  } catch (erro) {
    return falha("Não foi possível obter as notícias do CGE agora.", 502, erro);
  }
}
