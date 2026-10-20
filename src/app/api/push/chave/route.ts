import { NextResponse } from "next/server";
import { falha } from "@/lib/http";
import { pushConfigurado } from "@/lib/push";

export async function GET() {
  if (!pushConfigurado()) return falha("Notificações push não configuradas.", 503);
  return NextResponse.json({ chave: process.env.VAPID_PUBLIC_KEY });
}
