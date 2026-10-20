import { comCache } from "@/lib/cache";
import { ehCamada, wfs } from "@/lib/geosampa";
import { falha, jsonCache } from "@/lib/http";

export async function GET(_request: Request, ctx: { params: Promise<{ camada: string }> }) {
  const { camada } = await ctx.params;
  if (!ehCamada(camada)) return falha("Camada não permitida.", 404);
  try {
    const fonte = await comCache(`geosampa:${camada}`, 6 * 3600_000, () => wfs(camada));
    return jsonCache(fonte, 3600);
  } catch (erro) {
    return falha("Não foi possível obter a camada do GeoSampa agora.", 502, erro);
  }
}
