/**
 * News gatherer — directional sentiment from Alpaca's market news feed.
 *
 * Alpaca's News API (Benzinga et al.) is included with the broker account and
 * provides recent headlines tagged with tickers. Unlike social attention data,
 * these headlines carry genuine directional information (analyst upgrades,
 * price-target changes, earnings, M&A), which is what a long-only strategy
 * needs to avoid buying into bearish chatter.
 *
 * Sentiment is derived from headline + summary keywords via `detectNewsSentiment`.
 */

import type { Signal } from "../../../core/types";
import { createAlpacaProviders } from "../../../providers/alpaca";
import type { Gatherer, StrategyContext } from "../../types";
import { SOURCE_CONFIG } from "../config";
import { calculateTimeDecay, detectNewsSentiment } from "../helpers/sentiment";

async function gatherNews(ctx: StrategyContext): Promise<Signal[]> {
  const alpaca = createAlpacaProviders(ctx.env);
  const signals: Signal[] = [];

  let articles;
  try {
    articles = await alpaca.marketData.getNews({ limit: 50 });
  } catch (error) {
    ctx.log("News", "error", { message: String(error) });
    return [];
  }

  // Aggregate headlines by symbol.
  const bySymbol = new Map<
    string,
    {
      count: number;
      sentimentSum: number;
      weightedSentimentSum: number;
      totalWeight: number;
      latest: number;
      headlines: string[];
    }
  >();

  for (const article of articles) {
    const text = `${article.headline} ${article.summary || ""}`.trim();
    const rawSentiment = detectNewsSentiment(text);
    const articleTime = new Date(article.created_at).getTime() / 1000;
    const timeDecay = calculateTimeDecay(articleTime);

    for (const symbol of article.symbols) {
      if (!symbol) continue;
      if (!bySymbol.has(symbol)) {
        bySymbol.set(symbol, {
          count: 0,
          sentimentSum: 0,
          weightedSentimentSum: 0,
          totalWeight: 0,
          latest: 0,
          headlines: [],
        });
      }
      const d = bySymbol.get(symbol)!;
      d.count++;
      d.sentimentSum += rawSentiment;
      // Only directional articles contribute to the weighted average; neutral
      // headlines add weight so a lone negative among many neutrals is diluted.
      d.weightedSentimentSum += rawSentiment * timeDecay;
      d.totalWeight += timeDecay;
      if (articleTime > d.latest) d.latest = articleTime;
      if (d.headlines.length < 3) d.headlines.push(article.headline);
    }
  }

  for (const [symbol, d] of bySymbol) {
    const avgSentiment = d.count > 0 ? d.sentimentSum / d.count : 0;
    const weighted = d.totalWeight > 0 ? d.weightedSentimentSum / d.totalWeight : avgSentiment;
    const freshness = calculateTimeDecay(d.latest);

    // Only emit directional news. Neutral headlines carry no trading signal and
    // would otherwise flood the candidate pool.
    if (avgSentiment === 0) continue;

    signals.push({
      symbol,
      source: "news",
      source_detail: "alpaca_news",
      sentiment: weighted,
      raw_sentiment: avgSentiment,
      volume: d.count,
      freshness,
      source_weight: SOURCE_CONFIG.weights.news,
      reason: `News(${d.count}): ${avgSentiment >= 0 ? "+" : ""}${avgSentiment.toFixed(2)} — ${d.headlines[0]}`,
      timestamp: Date.now(),
    });
  }

  ctx.log("News", "gathered_signals", { count: signals.length });
  return signals;
}

export const newsGatherer: Gatherer = {
  name: "news",
  gather: gatherNews,
};
