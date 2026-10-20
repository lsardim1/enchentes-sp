export function Rodape() {
  return (
    <footer className="border-t border-line px-4 py-4 text-xs text-muted lg:px-8">
      <p>
        Informativo — não substitui os canais oficiais. Em emergência, ligue 199 (Defesa Civil) ou 193 (Bombeiros).
      </p>
      <p className="mt-1">
        Fontes:{" "}
        <a className="underline" href="https://www.inmet.gov.br" target="_blank" rel="noreferrer">
          INMET
        </a>
        ,{" "}
        <a className="underline" href="https://www.cgesp.org" target="_blank" rel="noreferrer">
          CGE-SP
        </a>
        ,{" "}
        <a className="underline" href="https://geosampa.prefeitura.sp.gov.br" target="_blank" rel="noreferrer">
          GeoSampa
        </a>
        ,{" "}
        <a className="underline" href="https://open-meteo.com" target="_blank" rel="noreferrer">
          Open-Meteo
        </a>{" "}
        (CC BY 4.0),{" "}
        <a className="underline" href="https://www.rainviewer.com" target="_blank" rel="noreferrer">
          RainViewer
        </a>
        , © colaboradores do{" "}
        <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>
        .
      </p>
    </footer>
  );
}
