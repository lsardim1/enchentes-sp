import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adicionarInscricao, inscricaoValida, mensagemDoAlerta, removerInscricao } from "../src/lib/push";
import { distanciaMetros, ehCamada, cqlInterseccao } from "../src/lib/geosampa";
import { dentroDeSaoPaulo, numero } from "../src/lib/http";
import { comCache } from "../src/lib/cache";
import { agoraSaoPaulo, normalizarSubprefeitura, situacaoAlerta } from "../src/lib/formato";

describe("push", () => {
  const pasta = mkdtempSync(join(tmpdir(), "push-"));
  beforeAll(() => {
    process.env.PUSH_STORE = join(pasta, "push.json");
  });
  afterAll(() => rmSync(pasta, { recursive: true, force: true }));

  const sub = { endpoint: "https://push.example.com/abc", keys: { p256dh: "k", auth: "a" } };

  it("valida inscrições", () => {
    expect(inscricaoValida(sub)).toBe(true);
    expect(inscricaoValida({ ...sub, endpoint: "http://inseguro.example.com" })).toBe(false);
    expect(inscricaoValida({ endpoint: sub.endpoint })).toBe(false);
    expect(inscricaoValida(null)).toBe(false);
  });

  it("adiciona sem duplicar e remove", async () => {
    await adicionarInscricao(sub);
    await adicionarInscricao(sub);
    const { readFileSync } = await import("node:fs");
    const lido = () => JSON.parse(readFileSync(process.env.PUSH_STORE!, "utf8")).inscricoes.length;
    expect(lido()).toBe(1);
    await removerInscricao(sub.endpoint);
    expect(lido()).toBe(0);
  });

  it("monta a mensagem do alerta", () => {
    const m = mensagemDoAlerta({
      id: 7,
      titulo: "Tempestade",
      severidade: "Perigo",
      cor: "#f90",
      riscos: ["Chuva forte"],
      instrucoes: [],
      inicio: "",
      fim: "",
      geometria: null,
    });
    expect(m).toMatchObject({ title: "Tempestade — Perigo", body: "Chuva forte", tag: "inmet-7" });
  });
});

describe("utilitários", () => {
  it("allowlist de camadas GeoSampa", () => {
    expect(ehCamada("risco_hidrologico")).toBe(true);
    expect(ehCamada("mancha_inundacao_25")).toBe(false);
    expect(ehCamada("__proto__")).toBe(false);
    expect(ehCamada("constructor")).toBe(false);
  });

  it("monta CQL com SRID explícito", () => {
    expect(cqlInterseccao("ge_poligono", -23.5, -46.6)).toBe("INTERSECTS(ge_poligono,SRID=4326;POINT(-46.6 -23.5))");
  });

  it("calcula distância em metros", () => {
    const d = distanciaMetros(-23.55, -46.63, -23.55, -46.62);
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(1100);
  });

  it("valida coordenadas de São Paulo", () => {
    expect(dentroDeSaoPaulo(-23.55, -46.63)).toBe(true);
    expect(dentroDeSaoPaulo(10, 10)).toBe(false);
    expect(numero("abc")).toBeNull();
    expect(numero("")).toBeNull();
    expect(numero("-23.5")).toBe(-23.5);
  });
});

describe("formato", () => {
  it("classifica a situação do aviso pelo horário de São Paulo", () => {
    const a = { inicio: "2026-10-22 00:01", fim: "2026-10-22 23:59" };
    expect(situacaoAlerta(a, "2026-10-20 12:00")).toBe("previsto");
    expect(situacaoAlerta(a, "2026-10-22 08:00")).toBe("vigente");
    expect(situacaoAlerta(a, "2026-10-23 00:00")).toBe("encerrado");
  });

  it("agoraSaoPaulo devolve AAAA-MM-DD HH:mm no fuso de SP", () => {
    expect(agoraSaoPaulo(new Date("2026-10-20T15:05:00Z"))).toBe("2026-10-20 12:05");
  });

  it("unifica nomes de subprefeitura com caixa e prefixo diferentes", () => {
    const a = normalizarSubprefeitura("MP - SAO MIGUEL PAULISTA");
    const b = normalizarSubprefeitura("Sao Miguel Paulista");
    expect(a.chave).toBe(b.chave);
    expect(a.rotulo).toBe("Sao Miguel Paulista");
    expect(normalizarSubprefeitura("AF - ARICANDUVA/VILA FORMOSA").rotulo).toBe("Aricanduva/Vila Formosa");
    expect(normalizarSubprefeitura("JA - JACANA/TREMEMBE").chave).toBe("JACANA/TREMEMBE");
    expect(normalizarSubprefeitura(null).rotulo).toBe("Não Informada");
  });
});

describe("cache", () => {
  it("reaproveita valor, e serve o último dado bom (desatualizado) quando a origem falha", async () => {
    let chamadas = 0;
    const ok = await comCache("t1", 0, async () => {
      chamadas++;
      return "bom";
    });
    expect(ok.desatualizado).toBe(false);
    const falhou = await comCache("t1", 0, async () => {
      chamadas++;
      throw new Error("fora");
    });
    expect(falhou).toMatchObject({ data: "bom", desatualizado: true });
    expect(chamadas).toBe(2);
    await expect(
      comCache("t2", 0, async () => {
        throw new Error("sem cache");
      }),
    ).rejects.toThrow("sem cache");
  });
});
