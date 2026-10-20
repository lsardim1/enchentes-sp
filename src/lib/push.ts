import { promises as fs } from "node:fs";
import path from "node:path";
import webpush from "web-push";
import { comCache } from "./cache";
import { carregarAlertas } from "./inmet";
import type { Alerta } from "./types";

export type Inscricao = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type Armazem = { inscricoes: Inscricao[]; notificados: number[] | null };

const MAX_INSCRICOES = 5000;
const arquivo = () =>
  path.resolve(/*turbopackIgnore: true*/ process.env.PUSH_STORE ?? path.join(".data", "push.json"));

let trava: Promise<unknown> = Promise.resolve();

// Serializa leituras/escritas do arquivo dentro do processo.
function exclusivo<T>(tarefa: () => Promise<T>): Promise<T> {
  const r = trava.then(tarefa, tarefa);
  trava = r.catch(() => undefined);
  return r;
}

async function ler(): Promise<Armazem> {
  try {
    const bruto = JSON.parse(await fs.readFile(arquivo(), "utf8")) as Partial<Armazem>;
    return { inscricoes: bruto.inscricoes ?? [], notificados: bruto.notificados ?? null };
  } catch {
    return { inscricoes: [], notificados: null };
  }
}

async function gravar(a: Armazem) {
  await fs.mkdir(path.dirname(arquivo()), { recursive: true });
  await fs.writeFile(arquivo(), JSON.stringify(a), "utf8");
}

export function inscricaoValida(v: unknown): v is Inscricao {
  if (!v || typeof v !== "object") return false;
  const { endpoint, keys } = v as Partial<Inscricao>;
  if (typeof endpoint !== "string" || endpoint.length > 600) return false;
  try {
    if (new URL(endpoint).protocol !== "https:") return false;
  } catch {
    return false;
  }
  return typeof keys?.p256dh === "string" && typeof keys?.auth === "string" && keys.p256dh.length < 200 && keys.auth.length < 100;
}

export function pushConfigurado() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configurar() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:contato@example.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

export function adicionarInscricao(i: Inscricao) {
  return exclusivo(async () => {
    const a = await ler();
    if (!a.inscricoes.some((x) => x.endpoint === i.endpoint)) {
      if (a.inscricoes.length >= MAX_INSCRICOES) throw new Error("limite de inscrições atingido");
      a.inscricoes.push({ endpoint: i.endpoint, keys: { p256dh: i.keys.p256dh, auth: i.keys.auth } });
      await gravar(a);
    }
  });
}

export function removerInscricao(endpoint: string) {
  return exclusivo(async () => {
    const a = await ler();
    const restantes = a.inscricoes.filter((x) => x.endpoint !== endpoint);
    if (restantes.length !== a.inscricoes.length) await gravar({ ...a, inscricoes: restantes });
  });
}

export function mensagemDoAlerta(a: Alerta) {
  return {
    title: `${a.titulo} — ${a.severidade}`,
    body: a.riscos[0] ?? "Aviso meteorológico vigente para a cidade de São Paulo.",
    url: "/",
    tag: `inmet-${a.id}`,
  };
}

export type ResultadoVerificacao = { novos: number; enviados: number; removidos: number; baseline: boolean };

// Compara os avisos atuais com os já notificados e envia push para os novos.
// Na primeira execução apenas registra o estado atual (sem notificar avisos antigos).
export function verificarNovosAlertas(): Promise<ResultadoVerificacao> {
  return exclusivo(async () => {
    const { data: alertas } = await comCache("alertas", 60_000, carregarAlertas);
    const a = await ler();
    const ids = alertas.map((x) => x.id);

    if (a.notificados === null) {
      await gravar({ ...a, notificados: ids });
      return { novos: 0, enviados: 0, removidos: 0, baseline: true };
    }

    const novos = alertas.filter((x) => !a.notificados!.includes(x.id));
    let enviados = 0;
    const mortos = new Set<string>();

    if (novos.length && a.inscricoes.length && pushConfigurado()) {
      configurar();
      for (const alerta of novos) {
        const carga = JSON.stringify(mensagemDoAlerta(alerta));
        await Promise.all(
          a.inscricoes.map(async (i) => {
            try {
              await webpush.sendNotification(i, carga, { TTL: 3600 });
              enviados++;
            } catch (e) {
              const status = (e as { statusCode?: number }).statusCode;
              if (status === 404 || status === 410) mortos.add(i.endpoint);
            }
          }),
        );
      }
    }

    await gravar({
      inscricoes: a.inscricoes.filter((i) => !mortos.has(i.endpoint)),
      notificados: [...new Set([...a.notificados, ...ids])].slice(-500),
    });
    return { novos: novos.length, enviados, removidos: mortos.size, baseline: false };
  });
}
