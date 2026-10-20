"use client";

import dynamic from "next/dynamic";

const MapaClient = dynamic(() => import("./MapaClient"), {
  ssr: false,
  loading: () => (
    <p role="status" className="p-6 text-sm text-muted">
      Carregando mapa…
    </p>
  ),
});

export function MapaCarregador() {
  return <MapaClient />;
}
