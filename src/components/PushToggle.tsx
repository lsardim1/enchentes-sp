"use client";

import { useEffect, useState } from "react";

type Estado = "carregando" | "indisponivel" | "desligado" | "ligado" | "bloqueado";

function paraUint8(base64: string) {
  const preenchido = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const bin = atob(preenchido.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function PushToggle() {
  const [estado, setEstado] = useState<Estado>("carregando");

  useEffect(() => {
    async function iniciar() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setEstado("indisponivel");
      }
      const chave = await fetch("/api/push/chave").then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!chave?.chave) return setEstado("indisponivel");
      if (Notification.permission === "denied") return setEstado("bloqueado");
      const reg = await navigator.serviceWorker.ready;
      setEstado((await reg.pushManager.getSubscription()) ? "ligado" : "desligado");
    }
    void iniciar();
  }, []);

  async function ligar() {
    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") return setEstado("bloqueado");
    const { chave } = await (await fetch("/api/push/chave")).json();
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: paraUint8(chave),
    });
    const r = await fetch("/api/push/inscrever", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    setEstado(r.ok ? "ligado" : "desligado");
  }

  async function desligar() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/inscrever", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    setEstado("desligado");
  }

  if (estado === "carregando" || estado === "indisponivel") return null;
  if (estado === "bloqueado") {
    return <p className="text-xs text-muted">🔕 Notificações bloqueadas no navegador.</p>;
  }
  return (
    <button
      type="button"
      onClick={() => void (estado === "ligado" ? desligar() : ligar())}
      className="rounded-lg border border-line px-3 py-2 text-left text-sm hover:bg-bg"
    >
      {estado === "ligado" ? "🔔 Alertas push ligados" : "🔕 Ativar alertas push"}
    </button>
  );
}
