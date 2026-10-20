# Enchentes SP

Painel com dados públicos sobre chuva, alertas e alagamentos na cidade de São Paulo (Next.js 16 + TypeScript + Tailwind + Leaflet).

## Páginas
- `/` — alertas INMET/Defesa Civil em texto, temperatura atual, chuva nas próximas 2 h, 24 h e 3 dias, status do CGE e "risco no meu local".
- `/mapa` — alertas, alagamentos do CGE, radar de chuva (RainViewer), áreas de risco hidrológico, manchas de inundação (WMS), ocorrências 2026, busca por endereço e geolocalização.
- `/historico` — ocorrências do GeoSampa por subprefeitura e por mês.
- `/noticias` — boletins do CGE (RSS). `/seguranca` — telefones, legendas e dicas.

## Fontes (todas públicas, sem chave)
| Dado | Fonte |
|---|---|
| Clima/previsão | Open-Meteo (CC BY 4.0, uso não comercial) |
| Alertas | INMET `apiprevmet3.inmet.gov.br/avisos/ativos` (filtrado pelo IBGE 3550308) |
| Alagamentos em tempo real | CGE-SP, leitura da página HTML `alagamentos.jsp` (sem API oficial) + geocodificação Nominatim |
| Risco/ocorrências | GeoSampa WFS/WMS |
| Radar | RainViewer |

As rotas `/api/*` fazem proxy, normalização e cache em memória (e servem o último dado bom se a origem falhar).

## Executar
```
npm install
npm run dev          # desenvolvimento (service worker só em produção)
npm run build && npm start
npm test             # parsers e utilitários
```
No Windows com política de execução restrita, use `npm.cmd`.

## Push (opcional)
Copie `.env.example` para `.env.local` e gere chaves VAPID (`node -e "console.log(require('web-push').generateVAPIDKeys())"`).
O servidor verifica novos avisos a cada `PUSH_POLL_MINUTES` (ou via `GET /api/push/verificar` com `Authorization: Bearer $CRON_SECRET`).
As inscrições ficam em `.data/push.json` (troque por um banco para multi-instância).

## Limitações
- O parser do CGE depende do HTML da página; há testes com fixture, mas mudanças no site podem exigir ajuste.
- Pontos do CGE sem coordenadas oficiais são geocodificados por rua/bairro (aproximado; pontos da mesma via podem se sobrepor).
- Informativo: não substitui Defesa Civil (199) nem Bombeiros (193).
