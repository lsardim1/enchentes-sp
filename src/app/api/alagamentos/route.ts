import { comCache } from "@/lib/cache";
import { carregarAlagamentos, dataBr } from "@/lib/cge";
import { aplicarCoordenadas } from "@/lib/geocode";
import { falha, jsonCache } from "@/lib/http";

export async function GET(request: Request) {
  const informada = new URL(request.url).searchParams.get("data");
  if (informada && !/^\d{2}\/\d{2}\/\d{4}$/.test(informada)) {
    return falha("Parâmetro data inválido (use dd/mm/aaaa).", 400);
  }
  const data = informada ?? dataBr();
  try {
    const fonte = await comCache(`alagamentos:${data}`, 3 * 60_000, () => carregarAlagamentos(data));
    // As coordenadas são aplicadas fora do cache: a geocodificação avança em segundo plano.
    const pontos = aplicarCoordenadas(fonte.data.pontos);
    return jsonCache({ ...fonte, data: { ...fonte.data, pontos } }, 30);
  } catch (erro) {
    return falha("Não foi possível obter os alagamentos do CGE agora.", 502, erro);
  }
}
