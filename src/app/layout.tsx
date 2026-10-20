import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Rodape } from "@/components/Rodape";
import { RegistrarSW } from "@/components/RegistrarSW";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Enchentes SP — alertas, chuva e alagamentos",
  description:
    "Painel com dados públicos de chuva, alertas da Defesa Civil/INMET, alagamentos do CGE e áreas de risco da cidade de São Paulo.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icone.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0b1320",
};

// Aplica o tema salvo antes da hidratação para evitar flash.
const scriptTema = `try{var t=localStorage.getItem('tema')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning className={`${geist.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-full font-sans">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <RegistrarSW />
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <main id="conteudo" className="flex-1">
              {children}
            </main>
            <Rodape />
          </div>
        </div>
      </body>
    </html>
  );
}
