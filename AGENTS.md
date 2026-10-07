# AGENTS.md

Autonomous LLM trading agent on Cloudflare Workers (Durable Object) + a separate React dashboard. Two independent npm packages: **root** (worker) and **dashboard/**.

## Commands (root)

```bash
npm run typecheck     # tsc --noEmit (src/ only, NOT dashboard)
npm run test:run      # vitest run; only src/**/*.test.ts
npm test              # vitest watch
npm run check         # biome lint+format+imports (what CI runs)
npm run check:fix     # autofix
npm run build         # tsc (worker build; wrangler also runs this on deploy)
npm run dev           # wrangler dev on :8787
npm run deploy        # wrangler deploy
```

Run one test: `npx vitest run src/providers/llm/ai-sdk.test.ts`
Run one test by name: `npx vitest run -t "uses custom max_tokens"`

Local DB: `npm run db:migrate` (local) / `npm run db:migrate:remote`. Migrations live in `migrations/`.

## Dashboard (separate package)

```bash
cd dashboard
npm run dev:remote   # vite against the deployed worker (MAHORAGA_API_URL)
npm run dev          # vite against a local worker on :8787
npm run deploy       # build + wrangler pages deploy
```

- Root `tsconfig`/`vitest`/`biome` **do not cover `dashboard/`**. It has no tests; verify it with `npm run build` there.
- Dashboard calls relative `/api/*`; Vite proxies to `/agent/*` in dev. On Pages, `dashboard/functions/api/[[path]].ts` reverse-proxies (the worker sends **no CORS headers**, so a same-origin proxy is mandatory).
- **Put the dashboard API token in `dashboard/.env.development.local`, never `.env.local`.** Vite loads `.env.local` in production builds too, which bakes `VITE_MAHORAGA_API_TOKEN` into the public JS bundle.

## Config precedence (major gotcha)

The running agent prefers its **persisted Durable Object state** over env vars and secrets. In `initializeLLM()`:

```
provider = state.config.llm_provider || env.LLM_PROVIDER
model    = state.config.llm_model    || env.LLM_MODEL
```

`DEFAULT_CONFIG` in `src/strategy/default/config.ts` hardcodes `llm_provider`/`llm_model`, so `state.config` always wins — setting `LLM_MODEL`/`LLM_PROVIDER` (or editing `wrangler.jsonc`) does **not** change a live agent. To actually change behavior:

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"llm_model":"google/gemini-3.5-flash-lite"}' \
  https://<worker>/agent/config
```

After `wrangler deploy`, **warm Durable Objects keep running old code for minutes.** Logs may show old behavior before the new version takes over; don't assume a deploy failed.

## Deployment / repo config

- `wrangler.jsonc` is **gitignored** (only `wrangler.example.jsonc` is tracked). Don't commit real resource IDs; agents editing it won't see dirty state.
- `.dev.vars` (local secrets) and `dashboard/.env*.local` are gitignored.
- CI (`.github/workflows/ci.yml`): on push to `main` it runs typecheck → tests → `biome check`, then **auto-deploys to Cloudflare** (needs `CLOUDFLARE_API_TOKEN`). Pushing is deploying.
- Workers cap **~50 outbound subrequests per invocation**. Gatherers fan out (StockTwits loops symbols, SEC, news); keep per-gatherer fetch counts small or you get "Too many subrequests".

## Architecture

- `src/index.ts` — Worker entry. Routes `/health`, `/mcp`, `/agent/*`; `/agent/*` forwards to the harness DO. Auth = Bearer `MAHORAGA_API_TOKEN`.
- `src/durable-objects/mahoraga-harness.ts` — **the orchestrator**: 30s `alarm()` loop, data gathering, research, analyst cycle, premarket, position exits, HTTP handlers. Most trading logic lives here.
- `src/strategy/` — pluggable strategy. `types.ts` is the contract; `index.ts` selects the active strategy (one-line swap); `default/` is the shipped one. Core delegates gatherers/prompts/rules to it.
- `src/strategy/default/rules/` — `entries.ts`, `exits.ts`, `staleness.ts`, `options.ts`, `crypto-trading.ts`.
- `src/providers/llm/` — `factory.ts` picks provider from `LLM_PROVIDER` (`openai-raw` | `ai-sdk` | `cloudflare-gateway`). See README for provider keys.
- `src/policy/`, `src/core/policy-broker.ts` — risk engine; **all** orders go through it (kill switch, position/loss limits). Strategies cannot bypass.
- `src/mcp/agent.ts` — MCP server tools.

## Trading-logic notes an agent will get wrong

- **Only `BUY` research verdicts are safe to act on.** The batch analyst LLM can originate trades for symbols research never saw. All buy paths (signal research, analyst LLM, pre-market) must pass `checkBuyGate` in the harness. Keep it that way.
- `require_buy_verdict` config: `false` (default/relaxed) lets `WAIT`/unresearched picks through **only if technicals confirm** (bullish direction / uptrend); `SKIP` always blocks. `max_positions_per_group` caps correlated country/commodity exposure (`helpers/groups.ts`).
- **AI SDK JSON mode is enforced in `src/providers/llm/ai-sdk.ts`** via `defaultSettingsMiddleware` when `response_format=json_object`. If you bypass that provider, you lose JSON mode and get fenced/prose output. Token budgets are generous (research 1024, analyst 2048) because reasoning models otherwise truncate JSON — don't lower them casually.
- **Reddit is attention-only.** The `redditGatherer` is intentionally **not wired** (unauthenticated `.json` is 403; OAuth is approval-gated). ApeWisdom supplies Reddit mention volume with `sentiment` forced to `0`. Direction comes from the `news` gatherer (Alpaca news, free with broker keys) + technicals. Don't fabricate direction from mention counts — mention volume is ~50/50 on direction.
- `trackLLMCost` has a small hardcoded pricing table; unknown models fall back to gpt-4o rates. Cost display is approximate.
- Uppercase tickers are validated against Alpaca before trading; crypto pairs use `BASE/USD` form.

## Conventions

- Biome: 2-space, double quotes, semicolons, 120 cols. `noExplicitAny` and `noNonNullAssertion` are off.
- `tsconfig` is strict with `noUncheckedIndexedAccess` — index access yields `T | undefined`.
- Never commit secrets or real IDs from `.dev.vars` / `wrangler.jsonc`.
