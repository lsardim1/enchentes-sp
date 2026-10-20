"use client";

import type { Feature, FeatureCollection, Geometry } from "geojson";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Pane,
  Popup,
  TileLayer,
  Tooltip,
  WMSTileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { Alagamentos, Alerta, Coordenada, Fonte, RiscoLocal } from "@/lib/types";
import { CORES_STATUS, ROTULO_STATUS } from "@/lib/formato";
import { useApi } from "@/lib/useApi";
import { consultarRisco, obterPosicao, RiscoResultado } from "./RiscoMeuLocal";
import { Frescor } from "./ui";

const CENTRO: [number, number] = [-23.5505, -46.6333];
const WMS = "https://wms.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wms";

type CamadaId =
  | "alertas"
  | "alagamentos"
  | "risco"
  | "ocorrencias"
  | "manchas"
  | "radar";

const COR_GRAU: Record<string, string> = { R1: "#22c55e", R2: "#eab308", R3: "#f97316", R4: "#dc2626" };

type Pino = { lat: number; lng: number; rotulo: string };

function Controlador({ alvo, aoClicar }: { alvo: Pino | null; aoClicar: (lat: number, lng: number) => void }) {
  const mapa = useMap();
  useEffect(() => {
    if (alvo) mapa.flyTo([alvo.lat, alvo.lng], Math.max(mapa.getZoom(), 14), { duration: 0.8 });
  }, [alvo, mapa]);
  useMapEvents({ click: (e) => aoClicar(e.latlng.lat, e.latlng.lng) });
  return null;
}

type FramesRadar = { host: string; past: { time: number; path: string }[] };

function Radar({ ativo, aoMudarQuadro }: { ativo: boolean; aoMudarQuadro: (rotulo: string, tocando: boolean, alternar: () => void) => void }) {
  const { dados } = useApi<{ host: string; radar: { past: { time: number; path: string }[] } }>(
    ativo ? "https://api.rainviewer.com/public/weather-maps.json" : null,
    5 * 60_000,
  );
  const quadros = useMemo<FramesRadar | null>(
    () => (dados ? { host: dados.host, past: dados.radar.past } : null),
    [dados],
  );
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(true);
  // O índice parte do quadro mais recente e avança com o passo da animação.
  const total = quadros?.past.length ?? 0;
  const indice = total ? (total - 1 + passo) % total : 0;

  useEffect(() => {
    if (!ativo || !tocando || !total) return;
    const id = setInterval(() => setPasso((p) => p + 1), 700);
    return () => clearInterval(id);
  }, [ativo, tocando, total]);

  useEffect(() => {
    if (!quadros || !ativo) return;
    const q = quadros.past[indice];
    if (!q) return;
    const hora = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(q.time * 1000));
    aoMudarQuadro(hora, tocando, () => setTocando((t) => !t));
  }, [indice, tocando, quadros, ativo]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ativo || !quadros) return null;
  return (
    <Pane name="radar" style={{ zIndex: 450 }}>
      {quadros.past.map((q, i) => (
        <TileLayer
          key={q.path}
          url={`${quadros.host}${q.path}/256/{z}/{x}/{y}/2/1_1.png`}
          opacity={i === indice ? 0.65 : 0}
          maxNativeZoom={7}
          maxZoom={18}
          attribution='Radar © <a href="https://www.rainviewer.com">RainViewer</a>'
        />
      ))}
    </Pane>
  );
}

export default function MapaClient() {
  const [ativas, setAtivas] = useState<Record<CamadaId, boolean>>({
    alertas: true,
    alagamentos: true,
    risco: false,
    ocorrencias: false,
    manchas: false,
    radar: true,
  });
  const [tr, setTr] = useState<5 | 25 | 100>(25);
  const [pino, setPino] = useState<Pino | null>(null);
  const [risco, setRisco] = useState<RiscoLocal | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<Coordenada[]>([]);
  const [radar, setRadar] = useState<{ rotulo: string; tocando: boolean; alternar: () => void } | null>(null);
  const [painelAberto, setPainelAberto] = useState(true);

  const alertas = useApi<Fonte<Alerta[]>>("/api/alertas", 5 * 60_000);
  const alagamentos = useApi<Fonte<Alagamentos>>("/api/alagamentos", 60_000);
  const riscoGeo = useApi<Fonte<FeatureCollection<Geometry, Record<string, unknown>>>>(
    ativas.risco ? "/api/geosampa/risco_hidrologico" : null,
  );
  const ocAlag = useApi<Fonte<FeatureCollection<Geometry, Record<string, unknown>>>>(
    ativas.ocorrencias ? "/api/geosampa/risco_ocorrencia_alagamento" : null,
  );
  const ocInund = useApi<Fonte<FeatureCollection<Geometry, Record<string, unknown>>>>(
    ativas.ocorrencias ? "/api/geosampa/risco_ocorrencia_inundacao" : null,
  );

  const alertasGeo = useMemo<FeatureCollection | null>(() => {
    const lista = alertas.dados?.data.filter((a) => a.geometria) ?? [];
    if (!lista.length) return null;
    return {
      type: "FeatureCollection",
      features: lista.map((a) => ({
        type: "Feature",
        geometry: a.geometria as Geometry,
        properties: { cor: a.cor, titulo: a.titulo },
      })),
    };
  }, [alertas.dados]);

  const pontos = alagamentos.dados?.data.pontos ?? [];
  const localizados = pontos.filter((p) => p.lat !== null && p.lng !== null);

  async function aoEscolherLocal(lat: number, lng: number, rotulo: string) {
    setPino({ lat, lng, rotulo });
    setRisco(null);
    setMensagem(null);
    setConsultando(true);
    try {
      setRisco(await consultarRisco(lat, lng));
    } catch (e) {
      setMensagem((e as Error).message);
    } finally {
      setConsultando(false);
    }
  }

  async function pesquisar(e: React.FormEvent) {
    e.preventDefault();
    if (busca.trim().length < 3) return;
    setMensagem(null);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(busca.trim())}`);
      const corpo = await r.json();
      if (!r.ok) throw new Error(corpo?.erro ?? "Falha na busca.");
      setResultados(corpo as Coordenada[]);
      if ((corpo as Coordenada[]).length === 0) setMensagem("Nenhum endereço encontrado na cidade de São Paulo.");
    } catch (err) {
      setMensagem((err as Error).message);
    }
  }

  async function meuLocal() {
    setMensagem(null);
    try {
      const pos = await obterPosicao();
      await aoEscolherLocal(pos.coords.latitude, pos.coords.longitude, "Meu local");
    } catch (e) {
      setMensagem((e as Error).message);
    }
  }

  const alternar = (id: CamadaId) => setAtivas((a) => ({ ...a, [id]: !a[id] }));
  const itens: [CamadaId, string][] = [
    ["alertas", "Alertas INMET (áreas)"],
    ["alagamentos", "Alagamentos CGE"],
    ["radar", "Radar de chuva"],
    ["risco", "Áreas de risco hidrológico"],
    ["manchas", "Manchas de inundação"],
    ["ocorrencias", "Ocorrências 2026 (GeoSampa)"],
  ];

  return (
    <div className="relative h-[calc(100dvh-57px)] lg:h-screen">
      <MapContainer center={CENTRO} zoom={11} minZoom={9} maxZoom={18} className="z-0" scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Controlador alvo={pino} aoClicar={(lat, lng) => void aoEscolherLocal(lat, lng, "Ponto no mapa")} />

        {ativas.alertas && alertasGeo && (
          <Pane name="alertas" style={{ zIndex: 380 }}>
            <GeoJSON
              key={alertas.dados?.atualizadoEm}
              data={alertasGeo}
              interactive={false}
              style={(f) => ({
                color: String(f?.properties?.cor ?? "#eab308"),
                weight: 2,
                fillColor: String(f?.properties?.cor ?? "#eab308"),
                fillOpacity: 0.04,
              })}
            />
          </Pane>
        )}

        {ativas.manchas && (
          <WMSTileLayer
            key={tr}
            url={WMS}
            layers={`geoportal:mancha_inundacao_${tr}`}
            format="image/png"
            transparent
            minZoom={13}
            opacity={0.7}
            attribution="Manchas de inundação © GeoSampa/PMSP"
          />
        )}

        {ativas.risco && riscoGeo.dados && (
          <GeoJSON
            key={riscoGeo.dados.atualizadoEm}
            data={riscoGeo.dados.data}
            style={(f) => {
              const cor = COR_GRAU[String(f?.properties?.tx_grau_risco_hidrologico)] ?? "#6b7280";
              return { color: cor, weight: 1, fillColor: cor, fillOpacity: 0.45 };
            }}
            onEachFeature={(f: Feature, layer: L.Layer) => {
              const p = f.properties as Record<string, string>;
              layer.bindTooltip(
                `${p.nm_area_risco_hidrologico} — grau ${p.tx_grau_risco_hidrologico} (${p.tx_tipo_processo})`,
              );
            }}
          />
        )}

        <Radar ativo={ativas.radar} aoMudarQuadro={(rotulo, tocando, alt) => setRadar({ rotulo, tocando, alternar: alt })} />

        {ativas.ocorrencias &&
          [
            { fonte: ocAlag.dados, cor: "#2563eb", nome: "Alagamento" },
            { fonte: ocInund.dados, cor: "#7c3aed", nome: "Inundação" },
          ].flatMap(({ fonte, cor, nome }) =>
            (fonte?.data.features ?? []).map((f) => {
              if (f.geometry.type !== "Point") return null;
              const [lng, lat] = f.geometry.coordinates;
              const p = f.properties as Record<string, string>;
              return (
                <CircleMarker
                  key={`${nome}-${p.cd_identificador}`}
                  center={[lat, lng]}
                  radius={5}
                  pathOptions={{ color: cor, fillColor: cor, fillOpacity: 0.7, weight: 1 }}
                >
                  <Tooltip>
                    {nome} em {String(p.dt_ocorrencia ?? "").slice(0, 10)} — {p.nm_subprefeitura}
                  </Tooltip>
                </CircleMarker>
              );
            }),
          )}

        {ativas.alagamentos &&
          localizados.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat as number, p.lng as number]}
              radius={p.status.startsWith("ativo") ? 10 : 7}
              pathOptions={{
                color: "#111827",
                weight: 1,
                fillColor: CORES_STATUS[p.status],
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <strong>{p.via}</strong>
                <br />
                {p.bairro} — {p.zona}
                <br />
                {ROTULO_STATUS[p.status]}
                <br />
                {p.horario}
                <br />
                Sentido: {p.sentido} · Ref.: {p.referencia}
              </Popup>
            </CircleMarker>
          ))}

        {pino && (
          <CircleMarker
            center={[pino.lat, pino.lng]}
            radius={9}
            pathOptions={{ color: "#fff", weight: 3, fillColor: "#0ea5e9", fillOpacity: 1 }}
          >
            <Tooltip permanent direction="top">
              {pino.rotulo}
            </Tooltip>
          </CircleMarker>
        )}
      </MapContainer>

      <div className="pointer-events-none absolute inset-0 z-[1000] p-3">
        <div className="pointer-events-auto max-h-full w-full overflow-y-auto rounded-xl border border-line bg-panel/95 p-3 text-sm shadow-lg backdrop-blur sm:w-80">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold">Mapa de alagamentos</h1>
            <button
              type="button"
              aria-expanded={painelAberto}
              onClick={() => setPainelAberto((v) => !v)}
              className="rounded border border-line px-2 py-0.5 text-xs"
            >
              {painelAberto ? "Recolher" : "Painel"}
            </button>
          </div>

          {painelAberto && (
            <div className="mt-3 flex flex-col gap-3">
              <form onSubmit={pesquisar} className="flex gap-2" role="search">
                <label className="sr-only" htmlFor="busca-endereco">
                  Buscar endereço ou bairro
                </label>
                <input
                  id="busca-endereco"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Endereço ou bairro…"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2"
                />
                <button type="submit" className="rounded-lg bg-accent px-3 py-2 font-medium text-accent-fg">
                  Buscar
                </button>
              </form>
              <button
                type="button"
                onClick={() => void meuLocal()}
                className="rounded-lg border border-line px-3 py-2 text-left hover:bg-bg"
              >
                📍 Usar minha localização
              </button>

              {resultados.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {resultados.map((r) => (
                    <li key={`${r.lat},${r.lng}`}>
                      <button
                        type="button"
                        className="w-full rounded border border-line px-2 py-1 text-left text-xs hover:bg-bg"
                        onClick={() => {
                          setResultados([]);
                          void aoEscolherLocal(r.lat, r.lng, r.nome.split(",").slice(0, 2).join(","));
                        }}
                      >
                        {r.nome}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {mensagem && (
                <p role="alert" className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
                  {mensagem}
                </p>
              )}
              {consultando && <p role="status">Consultando risco do local…</p>}
              {risco && <RiscoResultado risco={risco} rotulo={pino?.rotulo} />}
              {!risco && !consultando && (
                <p className="text-xs text-muted">Clique em qualquer ponto do mapa para ver o risco do local.</p>
              )}

              <fieldset className="flex flex-col gap-1">
                <legend className="mb-1 font-medium">Camadas</legend>
                {itens.map(([id, rotulo]) => (
                  <label key={id} className="flex items-center gap-2">
                    <input type="checkbox" checked={ativas[id]} onChange={() => alternar(id)} />
                    {rotulo}
                  </label>
                ))}
                {ativas.manchas && (
                  <div className="ml-6 text-xs">
                    <label>
                      Tempo de retorno:{" "}
                      <select
                        value={tr}
                        onChange={(e) => setTr(Number(e.target.value) as 5 | 25 | 100)}
                        className="rounded border border-line bg-bg px-1 py-0.5"
                      >
                        <option value={5}>5 anos (mais frequente)</option>
                        <option value={25}>25 anos</option>
                        <option value={100}>100 anos (mais raro)</option>
                      </select>
                    </label>
                    <p className="mt-1 text-muted">Aproxime o mapa (zoom 13+) para ver as manchas.</p>
                  </div>
                )}
                {ativas.radar && radar && (
                  <p className="ml-6 text-xs text-muted">
                    Radar às {radar.rotulo}{" "}
                    <button type="button" onClick={radar.alternar} className="underline">
                      {radar.tocando ? "pausar" : "reproduzir"}
                    </button>
                  </p>
                )}
              </fieldset>

              <div className="text-xs">
                <p className="mb-1 font-medium">Alagamentos CGE</p>
                <ul className="flex flex-col gap-0.5">
                  {Object.entries(ROTULO_STATUS).map(([k, v]) => (
                    <li key={k} className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full border border-black/40" style={{ background: CORES_STATUS[k] }} />
                      {v}
                    </li>
                  ))}
                </ul>
                {ativas.risco && (
                  <p className="mt-2">
                    Risco hidrológico:{" "}
                    {Object.entries(COR_GRAU).map(([g, c]) => (
                      <span key={g} className="mr-2 whitespace-nowrap">
                        <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} /> {g}
                      </span>
                    ))}
                  </p>
                )}
              </div>

              <div className="text-xs text-muted">
                <p>
                  {alagamentos.dados
                    ? `${pontos.length} ponto(s) do CGE hoje; ${localizados.length} localizado(s) no mapa.`
                    : alagamentos.erro
                      ? "CGE indisponível no momento."
                      : "Carregando CGE…"}
                  {pontos.length > localizados.length ? " A localização das ruas é resolvida aos poucos." : ""}
                </p>
                {alertas.dados && (
                  <p>
                    {alertas.dados.data.length} aviso(s) INMET em vigor ou previsto(s) para a capital
                    {alertas.dados.data.length ? " (veja o texto na página inicial)" : ""}.
                  </p>
                )}
                {alagamentos.dados && (
                  <Frescor fonte="CGE-SP" atualizadoEm={alagamentos.dados.atualizadoEm} desatualizado={alagamentos.dados.desatualizado} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
