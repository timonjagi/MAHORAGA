/**
 * ApeWisdom gatherer — Reddit attention/mention data via the ApeWisdom API.
 *
 * IMPORTANT: Reddit's public JSON API was closed in May 2026 (403 for all
 * unauthenticated access). ApeWisdom aggregates Reddit mentions, but it exposes
 * NO directional sentiment — only mention counts, upvotes and rank momentum.
 *
 * This gatherer therefore emits ATTENTION-ONLY signals: sentiment is forced to
 * 0 (neutral) and the mention volume/momentum is carried in `volume`/`reason`.
 * Direction comes from the news gatherer + technicals confirmation downstream.
 *
 * When Reddit OAuth credentials become available, a `redditGatherer` with true
 * text sentiment can be re-enabled alongside this one (see docs).
 */

import type { Signal } from "../../../core/types";
import type { Gatherer, StrategyContext } from "../../types";
import { SOURCE_CONFIG } from "../config";

interface ApeWisdomResult {
  rank: number;
  ticker: string;
  name: string;
  mentions: number;
  upvotes: number;
  rank_24h_ago: number;
  mentions_24h_ago: number;
}

interface ApeWisdomResponse {
  count: number;
  pages: number;
  current_page: number;
  results: ApeWisdomResult[];
}

const FILTERS = ["wallstreetbets", "stocks", "investing", "options"] as const;

async function gatherApeWisdom(ctx: StrategyContext): Promise<Signal[]> {
  const signals: Signal[] = [];
  const seen = new Map<string, ApeWisdomResult>();
  const sourcesByTicker = new Map<string, Set<string>>();

  for (const filter of FILTERS) {
    try {
      const res = await fetch(`https://apewisdom.io/api/v1.0/filter/${filter}/page/1`, {
        headers: { Accept: "application/json", "User-Agent": "Mahoraga/2.0" },
      });
      if (!res.ok) {
        ctx.log("ApeWisdom", "fetch_failed", { filter, status: res.status });
        continue;
      }
      const data = (await res.json()) as ApeWisdomResponse;

      for (const r of data.results || []) {
        if (!r.ticker) continue;
        // Keep the highest-mention record seen for a ticker across filters.
        const existing = seen.get(r.ticker);
        if (!existing || r.mentions > existing.mentions) {
          seen.set(r.ticker, r);
        }
        if (!sourcesByTicker.has(r.ticker)) sourcesByTicker.set(r.ticker, new Set());
        sourcesByTicker.get(r.ticker)!.add(filter);
      }

      await ctx.sleep(500);
    } catch (error) {
      ctx.log("ApeWisdom", "error", { filter, message: String(error) });
    }
  }

  for (const [ticker, r] of seen) {
    // Require a minimum mention floor to avoid noise.
    if (r.mentions < 5) continue;

    const mentions24hAgo = r.mentions_24h_ago || 0;
    // Acceleration: how much today's chatter exceeds yesterday's.
    const acceleration = mentions24hAgo > 0 ? r.mentions / mentions24hAgo : r.mentions > 0 ? 2 : 1;
    const sources = Array.from(sourcesByTicker.get(ticker) ?? []);

    signals.push({
      symbol: r.ticker,
      source: "apewisdom",
      source_detail: `apewisdom_${sources.join("+")}`,
      // ATTENTION ONLY — never fabricate direction.
      sentiment: 0,
      raw_sentiment: 0,
      volume: r.mentions,
      upvotes: r.upvotes,
      mentions: r.mentions,
      freshness: 1.0,
      source_weight: SOURCE_CONFIG.weights.apewisdom,
      reason: `ApeWisdom: ${r.mentions} mentions (${mentions24hAgo} 24h ago, ${
        acceleration >= 1 ? "x" + acceleration.toFixed(1) : "cooling"
      }), ${r.upvotes} upvotes`,
      momentum: acceleration,
      timestamp: Date.now(),
    });
  }

  ctx.log("ApeWisdom", "gathered_signals", { count: signals.length });
  return signals;
}

export const apeWisdomGatherer: Gatherer = {
  name: "apewisdom",
  gather: gatherApeWisdom,
};
