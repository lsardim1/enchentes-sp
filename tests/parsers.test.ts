import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseAlagamentos } from "../src/lib/cge";
import { expandirVia } from "../src/lib/geocode";
import { normalizarAvisos } from "../src/lib/inmet";
import { normalizarClima } from "../src/lib/clima";
import { parseRss } from "../src/lib/noticias";

describe("CGE", () => {
  const html = readFileSync(join(__dirname, "fixtures", "cge-alagamentos.html"), "utf8");
  const r = parseAlagamentos(html, "14/01/2026");

  it("extrai zonas, bairros e pontos", () => {
    expect(r.pontos.length).toBeGreaterThan(5);
    const primeiro = r.pontos[0];
    expect(primeiro.zona).toBe("Zona Oeste");
    expect(primeiro.bairro).toBe("Butantã");
    expect(primeiro.via).toBe("AV LINEU DE PAULA MACHADO");
    expect(primeiro.horario).toBe("De 17:53 a 19:49");
    expect(primeiro.sentido).toBe("USP/JOQUEI");
    expect(primeiro.referencia).toBe("AV LOPES DE AZEVEDO");
    expect(primeiro.status).toBe("inativo-intransitavel");
  });

  it("distingue transitável de intransitável e conta inativos", () => {
    expect(r.pontos.some((p) => p.status === "inativo-transitavel")).toBe(true);
    expect(r.resumo.ativos + r.resumo.inativos).toBe(r.pontos.length);
  });

  it("reconhece pontos ativos pelo título quando a classe CSS é desconhecida", () => {
    const html = `<div class="col-alagamentos"><div class="content"><h1 class="tit-bairros">Zona Sul</h1>
      <table class="tb-pontos-de-alagamentos"><tr><td class="bairro">Santo Amaro</td></tr>
      <tr><td><div class="ponto-de-alagamento"><ul><li class="outra" title="Ativo Intransitável"></li>
      <li class="arial-descr-alag col-local">De 10:00 a 11:00<br/>AV TESTE</li>
      <li class="arial-descr-alag">Sentido: AMBOS<br/>Referência: R X</li></ul></div></td></tr></table></div></div>`;
    const r = parseAlagamentos(html, "20/10/2026");
    expect(r.pontos[0]).toMatchObject({ status: "ativo-intransitavel", bairro: "Santo Amaro", via: "AV TESTE" });
    expect(r.resumo.ativos).toBe(1);
  });

  it("retorna vazio quando não há registros", () => {
    const vazio = '<div class="col-alagamentos"><div class="content"><h2>Não há registros</h2></div></div>';
    expect(parseAlagamentos(vazio, "20/10/2026").pontos).toEqual([]);
  });
});

describe("INMET", () => {
  const aviso = (id: number, geocodes: string) => ({
    id,
    descricao: "Tempestade",
    severidade: "Perigo Potencial",
    aviso_cor: "#FFFE00",
    riscos: [" Chuva forte "],
    instrucoes: null,
    inicio: "2026-10-22 00:01",
    fim: "2026-10-22 23:59",
    poligono: '{"type":"Polygon","coordinates":[[[-46.123456,-23.123456],[-46.2,-23.2],[-46.3,-23.1],[-46.123456,-23.123456]]]}',
    geocodes,
  });

  it("filtra apenas avisos que cobrem a capital e remove duplicados", () => {
    const alertas = normalizarAvisos({
      hoje: [aviso(1, "1,3550308,2"), aviso(2, "35503080,99")],
      futuro: [aviso(1, "3550308")],
    });
    expect(alertas.map((a) => a.id)).toEqual([1]);
    expect(alertas[0].riscos).toEqual(["Chuva forte"]);
    expect(alertas[0].instrucoes).toEqual([]);
    expect(alertas[0].geometria).toMatchObject({ type: "Polygon" });
  });

  it("arredonda coordenadas do polígono", () => {
    const [a] = normalizarAvisos({ hoje: [aviso(1, "3550308")] });
    const g = a.geometria as { coordinates: number[][][] };
    expect(g.coordinates[0][0]).toEqual([-46.123, -23.123]);
  });
});

describe("Clima", () => {
  it("normaliza próximas 2h, horas e dias", () => {
    const c = normalizarClima({
      current: {
        time: "2026-10-20T11:30",
        temperature_2m: 21.7,
        apparent_temperature: 23,
        relative_humidity_2m: 60,
        precipitation: 0,
        weather_code: 3,
      },
      minutely_15: {
        time: ["2026-10-20T11:15", "2026-10-20T11:30", "2026-10-20T11:45"],
        precipitation: [1, 2, 3],
      },
      hourly: {
        time: ["2026-10-20T10:00", "2026-10-20T11:00", "2026-10-20T12:00"],
        precipitation_probability: [10, 20, null],
        precipitation: [0, 0.1, 0.2],
      },
      daily: {
        time: ["2026-10-20"],
        precipitation_sum: [1.5],
        precipitation_probability_max: [40],
        temperature_2m_max: [28],
        temperature_2m_min: [16],
        weather_code: [61],
      },
    });
    expect(c.proximas.map((p) => p.mm)).toEqual([2, 3]);
    expect(c.horas.map((h) => h.hora)).toEqual(["2026-10-20T11:00", "2026-10-20T12:00"]);
    expect(c.horas[1].probabilidade).toBeNull();
    expect(c.dias[0]).toMatchObject({ mm: 1.5, tmax: 28 });
  });
});

describe("Notícias RSS", () => {
  it("converte itens e completa links relativos", () => {
    const xml = `<rss><channel><item><guid>1</guid><pubDate>Ter, 20 out 2026</pubDate><title>T</title><link>noticia.jsp?id=1</link><description>&lt;p&gt;Olá &amp;nbsp; mundo&lt;/p&gt;</description></item></channel></rss>`;
    const [n] = parseRss(xml);
    expect(n.link).toBe("https://www.cgesp.org/v3/noticia.jsp?id=1");
    expect(n.resumo).toContain("Olá");
    expect(n.resumo).not.toContain("<");
  });
});

describe("Geocodificação", () => {
  it("expande abreviações de logradouros", () => {
    expect(expandirVia("AV DRA RUTH CARDOSO")).toBe("Avenida DRA RUTH CARDOSO");
    expect(expandirVia("R SERGIO PAULO FREDDI")).toBe("Rua SERGIO PAULO FREDDI");
    expect(expandirVia("PTE EUSEBIO MATOSO")).toBe("Ponte EUSEBIO MATOSO");
  });
});
