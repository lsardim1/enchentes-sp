import { comCache } from "@/lib/cache";
import { buscarEndereco } from "@/lib/geocode";
import { falha, jsonCache } from "@/lib/http";

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 3 || q.length > 120) return falha("Informe de 3 a 120 caracteres.", 400);
  try {
    const fonte = await comCache(`geocode:${q.toLowerCase()}`, 24 * 3600_000, () => buscarEndereco(q));
    return jsonCache(fonte.data, 3600);
  } catch (erro) {
    return falha("Busca de endereço indisponível no momento.", 502, erro);
  }
}
