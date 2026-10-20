import type { Metadata } from "next";
import { MapaCarregador } from "@/components/MapaCarregador";

export const metadata: Metadata = { title: "Mapa — Enchentes SP" };

export default function PaginaMapa() {
  return <MapaCarregador />;
}
