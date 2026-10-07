/**
 * Research prompt builders — signal and position analysis.
 *
 * These return PromptTemplate objects. The core harness makes the LLM call.
 */

import type { Position } from "../../../core/types";
import type { PromptTemplate, ResearchPositionPromptBuilder, ResearchSignalPromptBuilder } from "../../types";

/**
 * Signal research prompt — evaluate whether to BUY a symbol based on
 * social sentiment and price data.
 */
export const researchSignalPrompt: ResearchSignalPromptBuilder = (
  symbol: string,
  sentiment: number,
  sources: string[],
  price: number,
  _ctx,
  technicals
): PromptTemplate => {
  const attentionOnly = sources.every((s) => s.startsWith("apewisdom"));

  const techBlock = technicals
    ? `
TECHNICALS (daily):
- Trend: ${technicals.trend} (20/50 SMA)
- Direction read: ${technicals.direction}
- RSI(14): ${technicals.rsi_14 !== null ? technicals.rsi_14.toFixed(1) : "n/a"}
- MACD histogram: ${technicals.macd_histogram !== null ? technicals.macd_histogram.toFixed(3) : "n/a"}
- Price vs 50-SMA: ${technicals.above_sma50 === null ? "n/a" : technicals.above_sma50 ? "above" : "below"}
- Relative volume: ${technicals.relative_volume !== null ? technicals.relative_volume.toFixed(2) + "x" : "n/a"}
- SuperTrend(14,3): ${technicals.supertrend_direction ?? "n/a"}
- ADX(14): ${technicals.adx_14 !== null ? technicals.adx_14.toFixed(1) : "n/a"}${technicals.adx_uptrend === true ? " (confirming uptrend)" : technicals.adx_uptrend === false ? " (confirming downtrend)" : ""}
- Active signals: ${technicals.notes.join("; ") || "none"}`
    : "\nTECHNICALS: unavailable";

  const sentimentBlock = attentionOnly
    ? `SENTIMENT: NONE — this is an ATTENTION signal (${sources.join(", ")} mention volume only).
No directional sentiment is available. You MUST rely on the technicals and news to decide direction.`
    : `SENTIMENT: ${(sentiment * 100).toFixed(0)}% bullish (sources: ${sources.join(", ")})`;

  return {
    system: "You are a stock research analyst for a LONG-ONLY account. Be skeptical of hype. Output valid JSON only.",
    user: `Should we BUY this stock? You may only go long.

SYMBOL: ${symbol}
${sentimentBlock}

CURRENT DATA:
- Price: $${price}
${techBlock}

Rules:
- Only recommend BUY when direction is supported. For attention-only signals (no sentiment),
  require a bullish technical trend or clearly positive news.
- Do NOT buy into a bearish technical trend (price below 50-SMA with falling MACD) just because
  social attention is high — high attention can mark a crowded top.
- If technicals and sentiment conflict, prefer SKIP or WAIT.

Evaluate if this is a good long entry. Consider: Is the sentiment justified? Is it too late (already pumped)? Any red flags?

JSON response:
{
  "verdict": "BUY|SKIP|WAIT",
  "confidence": 0.0-1.0,
  "entry_quality": "excellent|good|fair|poor",
  "reasoning": "brief reason",
  "red_flags": ["any concerns"],
  "catalysts": ["positive factors"]
}`,
    maxTokens: 1024,
  };
};

/**
 * Position research prompt — risk assessment for a held position.
 */
export const researchPositionPrompt: ResearchPositionPromptBuilder = (
  symbol: string,
  position: Position,
  plPct: number
): PromptTemplate => ({
  system: "You are a position risk analyst. Be concise. Output valid JSON only.",
  user: `Analyze this position for risk and opportunity:

POSITION: ${symbol}
- Shares: ${position.qty}
- Market Value: $${position.market_value.toFixed(2)}
- P&L: $${position.unrealized_pl.toFixed(2)} (${plPct.toFixed(1)}%)
- Current Price: $${position.current_price}

Provide a brief risk assessment and recommendation (HOLD, SELL, or ADD). JSON format:
{
  "recommendation": "HOLD|SELL|ADD",
  "risk_level": "low|medium|high",
  "reasoning": "brief reason",
  "key_factors": ["factor1", "factor2"]
}`,
  maxTokens: 800,
});
