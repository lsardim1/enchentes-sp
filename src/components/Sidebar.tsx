"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PushToggle } from "./PushToggle";
import { TemaToggle } from "./TemaToggle";

const ITENS = [
  { href: "/", rotulo: "Início", icone: "🏠" },
  { href: "/mapa", rotulo: "Mapa", icone: "🗺️" },
  { href: "/historico", rotulo: "Histórico", icone: "📊" },
  { href: "/noticias", rotulo: "Notícias CGE", icone: "📰" },
  { href: "/seguranca", rotulo: "Segurança", icone: "🛟" },
];

export function Sidebar() {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[2000] focus:m-2 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
      >
        Ir para o conteúdo
      </a>
      <header className="sticky top-0 z-[1100] flex items-center justify-between border-b border-line bg-panel px-4 py-3 lg:hidden">
        <span className="font-semibold">🌧️ Enchentes SP</span>
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls="menu-lateral"
          onClick={() => setAberto((v) => !v)}
          className="rounded border border-line px-3 py-1.5 text-sm"
        >
          {aberto ? "Fechar" : "Menu"}
        </button>
      </header>

      <aside
        id="menu-lateral"
        className={`${aberto ? "flex" : "hidden"} z-[1050] w-full shrink-0 flex-col gap-4 border-b border-line bg-panel p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:border-b-0 lg:border-r`}
      >
        <div className="hidden lg:block">
          <p className="text-lg font-bold">🌧️ Enchentes SP</p>
          <p className="text-xs text-muted">Chuva, alertas e alagamentos na capital</p>
        </div>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {ITENS.map((i) => {
            const ativo = i.href === "/" ? caminho === "/" : caminho.startsWith(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                onClick={() => setAberto(false)}
                aria-current={ativo ? "page" : undefined}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  ativo ? "bg-accent font-semibold text-accent-fg" : "hover:bg-bg"
                }`}
              >
                <span aria-hidden>{i.icone}</span>
                {i.rotulo}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <PushToggle />
          <TemaToggle />
          <p className="text-xs text-muted">
            Emergência: Defesa Civil <strong>199</strong> · Bombeiros <strong>193</strong>
          </p>
        </div>
      </aside>
    </>
  );
}
