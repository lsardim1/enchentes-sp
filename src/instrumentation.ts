export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const minutos = Number(process.env.PUSH_POLL_MINUTES ?? 0);
  if (!(minutos > 0) || !process.env.VAPID_PRIVATE_KEY) return;

  const { verificarNovosAlertas } = await import("./lib/push");
  const executar = () =>
    verificarNovosAlertas().catch((e) => console.error("[push] verificação falhou:", (e as Error).message));
  setTimeout(executar, 15_000);
  setInterval(executar, minutos * 60_000).unref?.();
}
