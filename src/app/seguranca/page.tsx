import type { Metadata } from "next";
import { Cartao } from "@/components/ui";

export const metadata: Metadata = { title: "Segurança — Enchentes SP" };

const TELEFONES = [
  ["199", "Defesa Civil"],
  ["193", "Corpo de Bombeiros"],
  ["190", "Polícia Militar"],
  ["192", "SAMU"],
  ["156", "Prefeitura de São Paulo (limpeza de bueiros, queda de árvores etc.)"],
  ["(11) 3396-6739", "CGE — Centro de Gerenciamento de Emergências (24 h)"],
];

const SEVERIDADES = [
  ["#FFFE00", "Perigo Potencial", "Baixo risco de danos; fique atento."],
  ["#FF9900", "Perigo", "Risco moderado de danos e de interrupção de serviços."],
  ["#FF0000", "Grande Perigo", "Risco extremo; siga as orientações da Defesa Civil."],
];

const DICAS = [
  "Não atravesse ruas alagadas a pé ou de carro: 30 cm de água já podem arrastar um veículo.",
  "Evite áreas próximas a córregos e encostas durante chuvas fortes.",
  "Desligue aparelhos da tomada e, se a água subir, o quadro de energia.",
  "Não se abrigue debaixo de árvores nem perto de placas e torres durante ventania ou raios.",
  "Guarde documentos e medicamentos em local alto e em sacos plásticos.",
  "Em áreas de risco, receba alertas da Defesa Civil por SMS: envie seu CEP para 40199.",
  "Acompanhe o CGE e a Defesa Civil para orientações oficiais.",
];

export default function PaginaSeguranca() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold">Segurança e telefones úteis</h1>
        <p className="text-sm text-muted">Em caso de risco à vida, ligue imediatamente.</p>
      </header>

      <Cartao titulo="📞 Telefones de emergência">
        <ul className="grid gap-2 sm:grid-cols-2">
          {TELEFONES.map(([numero, nome]) => (
            <li key={numero} className="rounded-lg bg-bg p-3">
              <a href={`tel:${numero.replace(/[^\d]/g, "")}`} className="text-xl font-bold text-accent">
                {numero}
              </a>
              <p className="text-sm text-muted">{nome}</p>
            </li>
          ))}
        </ul>
      </Cartao>

      <Cartao titulo="🎨 Cores dos avisos do INMET">
        <ul className="flex flex-col gap-2 text-sm">
          {SEVERIDADES.map(([cor, nome, desc]) => (
            <li key={nome} className="flex items-center gap-3">
              <span className="inline-block h-4 w-4 rounded border border-black/30" style={{ background: cor }} aria-hidden />
              <span>
                <strong>{nome}</strong> — {desc}
              </span>
            </li>
          ))}
        </ul>
      </Cartao>

      <Cartao titulo="🚧 Classificação dos alagamentos (CGE)">
        <ul className="list-disc pl-5 text-sm">
          <li>
            <strong>Transitável:</strong> via com água acumulada, mas com passagem possível com cuidado.
          </li>
          <li>
            <strong>Intransitável:</strong> via interditada pela água; procure rota alternativa.
          </li>
          <li>
            <strong>Ativo/Encerrado:</strong> indica se o ponto ainda está alagado no momento da consulta.
          </li>
        </ul>
        <p className="mt-2 text-sm">
          <a className="text-accent underline" href="https://www.cgesp.org/v3/alagamentos-classificacao.jsp" target="_blank" rel="noreferrer">
            Entenda a classificação no site do CGE
          </a>
        </p>
      </Cartao>

      <Cartao titulo="🛟 Dicas de segurança">
        <ul className="list-disc pl-5 text-sm">
          {DICAS.map((d) => (
            <li key={d} className="mb-1">
              {d}
            </li>
          ))}
        </ul>
      </Cartao>

      <Cartao titulo="🔗 Links oficiais">
        <ul className="list-disc pl-5 text-sm text-accent">
          <li>
            <a className="underline" href="https://www.cgesp.org" target="_blank" rel="noreferrer">
              CGE-SP
            </a>
          </li>
          <li>
            <a className="underline" href="https://alertas2.inmet.gov.br" target="_blank" rel="noreferrer">
              INMET — Avisos
            </a>
          </li>
          <li>
            <a className="underline" href="https://www.defesacivil.sp.gov.br" target="_blank" rel="noreferrer">
              Defesa Civil do Estado de SP
            </a>
          </li>
          <li>
            <a className="underline" href="https://geosampa.prefeitura.sp.gov.br" target="_blank" rel="noreferrer">
              GeoSampa
            </a>
          </li>
        </ul>
      </Cartao>
    </div>
  );
}
