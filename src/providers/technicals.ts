import type { Bar } from "./types";

export interface TechnicalIndicators {
  symbol: string;
  timestamp: string;
  price: number;
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
  ema_12: number | null;
  ema_26: number | null;
  rsi_14: number | null;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  } | null;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    width: number;
  } | null;
  atr_14: number | null;
  volume_sma_20: number | null;
  relative_volume: number | null;
  supertrend: { value: number; direction: "bullish" | "bearish" } | null;
  adx: { adx: number; plus_di: number; minus_di: number } | null;
}

export interface Signal {
  type: string;
  direction: "bullish" | "bearish" | "neutral";
  strength: number;
  description: string;
}

export function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function calculateEMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i]! - ema) * multiplier + ema;
  }

  return ema;
}

export function calculateRSI(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) return null;

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i]! - prices[i - 1]!);
  }

  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? -c : 0));

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]!) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]!) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } | null {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);

  if (ema12 === null || ema26 === null) return null;

  const macdLine = ema12 - ema26;

  const macdValues: number[] = [];
  let tempEma12 = prices.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
  let tempEma26 = prices.slice(0, 26).reduce((a, b) => a + b, 0) / 26;

  for (let i = 26; i < prices.length; i++) {
    tempEma12 = (prices[i]! - tempEma12) * (2 / 13) + tempEma12;
    tempEma26 = (prices[i]! - tempEma26) * (2 / 27) + tempEma26;
    macdValues.push(tempEma12 - tempEma26);
  }

  if (macdValues.length < 9) return null;

  let signal = macdValues.slice(0, 9).reduce((a, b) => a + b, 0) / 9;
  for (let i = 9; i < macdValues.length; i++) {
    signal = (macdValues[i]! - signal) * (2 / 10) + signal;
  }

  return {
    macd: macdLine,
    signal,
    histogram: macdLine - signal,
  };
}

export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number; middle: number; lower: number; width: number } | null {
  if (prices.length < period) return null;

  const slice = prices.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;

  const squaredDiffs = slice.map((p) => (p - middle) ** 2);
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(variance);

  const upper = middle + stdDev * std;
  const lower = middle - stdDev * std;

  return {
    upper,
    middle,
    lower,
    width: (upper - lower) / middle,
  };
}

export function calculateATR(bars: Bar[], period: number = 14): number | null {
  if (bars.length < period + 1) return null;

  const trueRanges: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const current = bars[i]!;
    const prev = bars[i - 1]!;
    const tr = Math.max(current.h - current.l, Math.abs(current.h - prev.c), Math.abs(current.l - prev.c));
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) return null;

  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]!) / period;
  }

  return atr;
}

/**
 * SuperTrend — ATR-band trend indicator (port of the Pine f_supertrend used by
 * the Trinity ATR strategy). Returns the current band value and direction.
 * direction "bullish" = price above the lower band (Pine dir == -1).
 */
export function computeSuperTrend(
  bars: Bar[],
  period: number = 14,
  multiplier: number = 3
): { value: number; direction: "bullish" | "bearish" } | null {
  if (bars.length < period + 2) return null;

  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const cur = bars[i]!;
    const prev = bars[i - 1]!;
    trs.push(Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c)));
  }

  // Wilder-smoothed ATR series, starting at bar index 1 of `bars`.
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const atrAtBar: number[] = [atr]; // atrAtBar[k] is ATR at bar k + 1
  for (let k = period; k < trs.length; k++) {
    atr = (atr * (period - 1) + trs[k]!) / period;
    atrAtBar.push(atr);
  }

  // Faithful port of the Pine f_supertrend loop. Pine's `up` is the lower
  // band, `dn` the upper band; dir == -1 means bullish (band below price).
  let prevUp = Number.NaN;
  let prevDn = Number.NaN;
  let dir = 1;
  let value = Number.NaN;

  for (let k = 0; k < atrAtBar.length; k++) {
    const bar = bars[k + 1]!;
    const hl2 = (bar.h + bar.l) / 2;
    let up = hl2 - multiplier * atrAtBar[k]!;
    let dn = hl2 + multiplier * atrAtBar[k]!;

    if (!Number.isNaN(prevUp)) {
      const prevClose = bars[k]!.c;
      up = prevClose > prevUp ? Math.max(up, prevUp) : up;
      dn = prevClose < prevDn ? Math.min(dn, prevDn) : dn;
      dir = bar.c > prevDn ? -1 : bar.c < prevUp ? 1 : dir;
    } else if (bar.c > dn) {
      dir = -1;
    } else if (bar.c < up) {
      dir = 1;
    }

    value = dir === -1 ? up : dn;
    prevUp = up;
    prevDn = dn;
  }

  if (Number.isNaN(value)) return null;
  return { value, direction: dir === -1 ? "bullish" : "bearish" };
}

/**
 * ADX + directional indicators (Wilder). adx_bullish context comes from the
 * caller comparing plus_di vs minus_di.
 */
export function computeADX(
  bars: Bar[],
  period: number = 14
): { adx: number; plus_di: number; minus_di: number } | null {
  if (bars.length < period * 2 + 1) return null;

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const cur = bars[i]!;
    const prev = bars[i - 1]!;
    const upMove = cur.h - prev.h;
    const downMove = prev.l - cur.l;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trs.push(Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c)));
  }

  const wilder = (arr: number[]): number[] => {
    const out: number[] = [];
    let sum = arr.slice(0, period).reduce((a, b) => a + b, 0);
    out.push(sum);
    for (let i = period; i < arr.length; i++) {
      sum = sum - sum / period + arr[i]!;
      out.push(sum);
    }
    return out;
  };

  const sPlus = wilder(plusDM);
  const sMinus = wilder(minusDM);
  const sTR = wilder(trs);

  const dxs: number[] = [];
  let lastPlusDI = 0;
  let lastMinusDI = 0;
  for (let i = 0; i < sTR.length; i++) {
    const plusDI = sTR[i]! > 0 ? (100 * sPlus[i]!) / sTR[i]! : 0;
    const minusDI = sTR[i]! > 0 ? (100 * sMinus[i]!) / sTR[i]! : 0;
    lastPlusDI = plusDI;
    lastMinusDI = minusDI;
    const sum = plusDI + minusDI;
    dxs.push(sum > 0 ? (100 * Math.abs(plusDI - minusDI)) / sum : 0);
  }

  if (dxs.length < period) return null;
  let adx = dxs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dxs.length; i++) {
    adx = (adx * (period - 1) + dxs[i]!) / period;
  }

  return { adx, plus_di: lastPlusDI, minus_di: lastMinusDI };
}

export function computeTechnicals(symbol: string, bars: Bar[]): TechnicalIndicators {
  const closes = bars.map((b) => b.c);
  const volumes = bars.map((b) => b.v);
  const currentPrice = closes[closes.length - 1] ?? 0;
  const currentVolume = volumes[volumes.length - 1] ?? 0;

  const volumeSma = calculateSMA(volumes, 20);
  const relativeVolume = volumeSma && volumeSma > 0 ? currentVolume / volumeSma : null;

  return {
    symbol,
    timestamp: bars[bars.length - 1]?.t ?? new Date().toISOString(),
    price: currentPrice,
    sma_20: calculateSMA(closes, 20),
    sma_50: calculateSMA(closes, 50),
    sma_200: calculateSMA(closes, 200),
    ema_12: calculateEMA(closes, 12),
    ema_26: calculateEMA(closes, 26),
    rsi_14: calculateRSI(closes, 14),
    macd: calculateMACD(closes),
    bollinger: calculateBollingerBands(closes, 20, 2),
    atr_14: calculateATR(bars, 14),
    volume_sma_20: volumeSma,
    relative_volume: relativeVolume,
    supertrend: computeSuperTrend(bars, 14, 3),
    adx: computeADX(bars, 14),
  };
}

export function detectSignals(technicals: TechnicalIndicators): Signal[] {
  const signals: Signal[] = [];

  if (technicals.rsi_14 !== null) {
    if (technicals.rsi_14 < 30) {
      signals.push({
        type: "rsi_oversold",
        direction: "bullish",
        strength: (30 - technicals.rsi_14) / 30,
        description: `RSI at ${technicals.rsi_14.toFixed(1)} - oversold territory`,
      });
    } else if (technicals.rsi_14 > 70) {
      signals.push({
        type: "rsi_overbought",
        direction: "bearish",
        strength: (technicals.rsi_14 - 70) / 30,
        description: `RSI at ${technicals.rsi_14.toFixed(1)} - overbought territory`,
      });
    }
  }

  if (technicals.macd !== null) {
    if (technicals.macd.histogram > 0 && technicals.macd.macd > technicals.macd.signal) {
      signals.push({
        type: "macd_bullish",
        direction: "bullish",
        strength: Math.min(1, Math.abs(technicals.macd.histogram) * 10),
        description: "MACD above signal line with positive histogram",
      });
    } else if (technicals.macd.histogram < 0 && technicals.macd.macd < technicals.macd.signal) {
      signals.push({
        type: "macd_bearish",
        direction: "bearish",
        strength: Math.min(1, Math.abs(technicals.macd.histogram) * 10),
        description: "MACD below signal line with negative histogram",
      });
    }
  }

  if (technicals.bollinger !== null) {
    const bbPosition =
      (technicals.price - technicals.bollinger.lower) / (technicals.bollinger.upper - technicals.bollinger.lower);

    if (bbPosition < 0.1) {
      signals.push({
        type: "bb_lower_touch",
        direction: "bullish",
        strength: 1 - bbPosition * 10,
        description: "Price near lower Bollinger Band",
      });
    } else if (bbPosition > 0.9) {
      signals.push({
        type: "bb_upper_touch",
        direction: "bearish",
        strength: (bbPosition - 0.9) * 10,
        description: "Price near upper Bollinger Band",
      });
    }
  }

  if (technicals.sma_20 !== null && technicals.sma_50 !== null) {
    const crossoverStrength = Math.abs(technicals.sma_20 - technicals.sma_50) / technicals.price;

    if (technicals.sma_20 > technicals.sma_50) {
      signals.push({
        type: "golden_cross_active",
        direction: "bullish",
        strength: Math.min(1, crossoverStrength * 20),
        description: "20 SMA above 50 SMA (bullish trend)",
      });
    } else {
      signals.push({
        type: "death_cross_active",
        direction: "bearish",
        strength: Math.min(1, crossoverStrength * 20),
        description: "20 SMA below 50 SMA (bearish trend)",
      });
    }
  }

  if (technicals.supertrend !== null) {
    signals.push({
      type: technicals.supertrend.direction === "bullish" ? "supertrend_bullish" : "supertrend_bearish",
      direction: technicals.supertrend.direction,
      strength: 0.5,
      description: `SuperTrend(14,3) is ${technicals.supertrend.direction} (band ${technicals.supertrend.value.toFixed(2)})`,
    });
  }

  if (technicals.adx !== null) {
    const adxBullishTrend = technicals.adx.adx >= 20 && technicals.adx.plus_di > technicals.adx.minus_di;
    const adxBearishTrend = technicals.adx.adx >= 20 && technicals.adx.minus_di > technicals.adx.plus_di;
    if (adxBullishTrend) {
      signals.push({
        type: "adx_uptrend",
        direction: "bullish",
        strength: Math.min(1, technicals.adx.adx / 50),
        description: `ADX ${technicals.adx.adx.toFixed(1)} with +DI > -DI (confirmed uptrend)`,
      });
    } else if (adxBearishTrend) {
      signals.push({
        type: "adx_downtrend",
        direction: "bearish",
        strength: Math.min(1, technicals.adx.adx / 50),
        description: `ADX ${technicals.adx.adx.toFixed(1)} with -DI > +DI (confirmed downtrend)`,
      });
    }
  }

  if (technicals.relative_volume !== null && technicals.relative_volume > 2) {
    signals.push({
      type: "high_volume",
      direction: "neutral",
      strength: Math.min(1, (technicals.relative_volume - 1) / 4),
      description: `Volume ${technicals.relative_volume.toFixed(1)}x average`,
    });
  }

  return signals;
}

/**
 * Build a compact, LLM-friendly technical summary from raw bars.
 * Returns null when there aren't enough bars to compute anything meaningful.
 */
export function summarizeTechnicals(
  symbol: string,
  bars: Bar[]
): {
  direction: "bullish" | "bearish" | "neutral";
  trend: "up" | "down" | "sideways" | "unknown";
  rsi_14: number | null;
  macd_histogram: number | null;
  above_sma50: boolean | null;
  relative_volume: number | null;
  supertrend_direction: "bullish" | "bearish" | null;
  adx_14: number | null;
  /** true when ADX >= 20 and +DI > -DI (confirmed uptrend); false when ADX >= 20
   * and -DI > +DI (confirmed downtrend); null when ADX unavailable/weak. */
  adx_uptrend: boolean | null;
  notes: string[];
} | null {
  if (bars.length < 20) return null;

  const t = computeTechnicals(symbol, bars);
  const signals = detectSignals(t);

  let bull = 0;
  let bear = 0;
  for (const s of signals) {
    if (s.direction === "bullish") bull += s.strength;
    else if (s.direction === "bearish") bear += s.strength;
  }
  const direction: "bullish" | "bearish" | "neutral" =
    bull - bear > 0.15 ? "bullish" : bear - bull > 0.15 ? "bearish" : "neutral";

  let trend: "up" | "down" | "sideways" | "unknown" = "unknown";
  if (t.sma_20 !== null && t.sma_50 !== null) {
    const spread = (t.sma_20 - t.sma_50) / t.price;
    trend = spread > 0.01 ? "up" : spread < -0.01 ? "down" : "sideways";
  }

  const aboveSma50 = t.sma_50 !== null ? t.price > t.sma_50 : null;

  let adxUptrend: boolean | null = null;
  if (t.adx !== null && t.adx.adx >= 20) {
    adxUptrend = t.adx.plus_di > t.adx.minus_di;
  }

  const notes = signals.slice(0, 4).map((s) => s.description);
  if (t.relative_volume !== null) {
    notes.push(`Relative volume ${t.relative_volume.toFixed(2)}x`);
  }
  if (t.supertrend !== null) {
    notes.push(`SuperTrend ${t.supertrend.direction}`);
  }
  if (t.adx !== null) {
    notes.push(`ADX ${t.adx.adx.toFixed(1)} (+DI ${t.adx.plus_di.toFixed(0)} / -DI ${t.adx.minus_di.toFixed(0)})`);
  }

  return {
    direction,
    trend,
    rsi_14: t.rsi_14,
    macd_histogram: t.macd?.histogram ?? null,
    above_sma50: aboveSma50,
    relative_volume: t.relative_volume,
    supertrend_direction: t.supertrend?.direction ?? null,
    adx_14: t.adx?.adx ?? null,
    adx_uptrend: adxUptrend,
    notes,
  };
}
