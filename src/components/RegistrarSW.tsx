"use client";

import { useEffect } from "react";

// Registra o service worker (cache offline + push) apenas em produção ou com localhost seguro.
export function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
