import { XMLParser } from "fast-xml-parser";
import { buscar } from "./cache";
import type { Noticia } from "./types";

const URL_RSS = "https://www.cgesp.org/v3/feed_rss.jsp";

function textoSimples(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseRss(xml: string): Noticia[] {
  const doc = new XMLParser({ ignoreAttributes: true }).parse(xml);
  const bruto = doc?.rss?.channel?.item ?? [];
  const itens = Array.isArray(bruto) ? bruto : [bruto];
  return itens.map((i: Record<string, unknown>) => {
    const link = String(i.link ?? "");
    return {
      id: String(i.guid ?? link),
      titulo: String(i.title ?? ""),
      link: link.startsWith("http") ? link : `https://www.cgesp.org/v3/${link}`,
      data: String(i.pubDate ?? ""),
      resumo: textoSimples(String(i.description ?? "")).slice(0, 400),
    };
  });
}

export async function carregarNoticias(): Promise<Noticia[]> {
  const resposta = await buscar(URL_RSS);
  return parseRss(await resposta.text());
}
