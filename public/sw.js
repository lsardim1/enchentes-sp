const VERSAO = "enchentes-v1";
const ESTATICO = `${VERSAO}-estatico`;
const DADOS = `${VERSAO}-dados`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

async function redeComFallback(request, nomeCache) {
  const cache = await caches.open(nomeCache);
  try {
    const resposta = await fetch(request);
    if (resposta.ok) cache.put(request, resposta.clone());
    return resposta;
  } catch (erro) {
    const guardada = await cache.match(request);
    if (guardada) return guardada;
    throw erro;
  }
}

async function cacheDepoisRede(request) {
  const cache = await caches.open(ESTATICO);
  const guardada = await cache.match(request);
  if (guardada) return guardada;
  const resposta = await fetch(request);
  if (resposta.ok) cache.put(request, resposta.clone());
  return resposta;
}

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/push")) return;
  if (url.pathname.startsWith("/api/")) {
    evento.respondWith(redeComFallback(request, DADOS));
  } else if (url.pathname.startsWith("/_next/static/") || url.pathname === "/icone.svg") {
    evento.respondWith(cacheDepoisRede(request));
  } else if (request.mode === "navigate") {
    evento.respondWith(redeComFallback(request, DADOS));
  }
});

self.addEventListener("push", (evento) => {
  let dados = { title: "Alerta de chuva — São Paulo", body: "Novo aviso meteorológico.", url: "/" };
  try {
    dados = { ...dados, ...evento.data.json() };
  } catch {}
  evento.waitUntil(
    self.registration.showNotification(dados.title, {
      body: dados.body,
      icon: "/icone.svg",
      badge: "/icone.svg",
      tag: dados.tag,
      data: { url: dados.url },
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const alvo = evento.notification.data?.url ?? "/";
  evento.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const j of janelas) {
        if ("focus" in j) {
          await j.focus();
          if ("navigate" in j) await j.navigate(alvo);
          return;
        }
      }
      await self.clients.openWindow(alvo);
    })(),
  );
});
