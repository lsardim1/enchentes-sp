"use client";

import { useSyncExternalStore } from "react";

function assinar(aviso: () => void) {
  const obs = new MutationObserver(aviso);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

const lerTema = () => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

export function TemaToggle() {
  const tema = useSyncExternalStore(assinar, lerTema, () => "dark");

  function alternar() {
    const novo = tema === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = novo;
    try {
      localStorage.setItem("tema", novo);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="rounded-lg border border-line px-3 py-2 text-left text-sm hover:bg-bg"
    >
      {tema === "light" ? "🌙 Tema escuro" : "☀️ Tema claro"}
    </button>
  );
}
