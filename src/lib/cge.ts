import * as cheerio from "cheerio";
import { buscar } from "./cache";
import type { Alagamentos, PontoAlagamento, StatusPonto } from "./types";

const URL_CGE = "https://www.cgesp.org/v3/alagamentos.jsp";

function limpar(texto: string) {
  return texto.replace(/\s+/g, " ").trim();
}

function statusDe(classe: string | undefined, titulo: string | undefined): StatusPonto | null {
  const m = /^(in)?ativo-(in)?transitavel$/.exec((classe ?? "").split(/\s+/)[0] ?? "");
  if (m) return m[0] as StatusPonto;
  // Plano B: o título do ícone traz o mesmo estado ("Ativo Intransitável").
  const t = (titulo ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/, "-");
  return /^(in)?ativo-(in)?transitavel$/.test(t) ? (t as StatusPonto) : null;
}

// O CGE não tem API: extrai pontos do HTML (zonas > bairros > pontos).
export function parseAlagamentos(html: string, data: string): Alagamentos {
  const $ = cheerio.load(html);
  const pontos: PontoAlagamento[] = [];
  let zona = "";

  $(".col-alagamentos .content")
    .first()
    .children()
    .each((_, el) => {
      const $el = $(el);
      if ($el.is("h1.tit-bairros")) {
        zona = limpar($el.text());
        return;
      }
      if (!$el.is("table.tb-pontos-de-alagamentos")) return;
      const bairro = limpar($el.find("td.bairro").first().text());
      $el.find(".ponto-de-alagamento").each((i, ponto) => {
        const $p = $(ponto);
        const primeiro = $p.find("li").first();
        const status = statusDe(primeiro.attr("class"), primeiro.attr("title"));
        if (!status) return;
        const local = $p.find("li.col-local").first();
        const [horario = "", via = ""] = local
          .html()
          ?.split(/<br\s*\/?>/i)
          .map((t) => limpar(cheerio.load(t).text())) ?? [];
        const detalhe = $p.find("li.arial-descr-alag").not(".col-local").first();
        const [sentidoTxt = "", refTxt = ""] = detalhe
          .html()
          ?.split(/<br\s*\/?>/i)
          .map((t) => limpar(cheerio.load(t).text())) ?? [];
        pontos.push({
          id: `${data}|${bairro}|${via}|${horario}|${i}`,
          zona,
          bairro,
          via,
          horario,
          sentido: sentidoTxt.replace(/^Sentido:\s*/i, ""),
          referencia: refTxt.replace(/^Refer[êe]ncia:\s*/i, ""),
          status,
          lat: null,
          lng: null,
        });
      });
    });

  const ativos = pontos.filter((p) => p.status.startsWith("ativo")).length;
  return { data, pontos, resumo: { ativos, inativos: pontos.length - ativos } };
}

export function dataBr(d = new Date()): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  return partes;
}

export async function carregarAlagamentos(data = dataBr()): Promise<Alagamentos> {
  const url = `${URL_CGE}?dataBusca=${encodeURIComponent(data)}&enviaBusca=Buscar`;
  const resposta = await buscar(url);
  return parseAlagamentos(await resposta.text(), data);
}
