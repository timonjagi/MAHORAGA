import { describe, expect, it } from "vitest";
import { computeADX, computeSuperTrend, summarizeTechnicals } from "./technicals";
import type { Bar } from "./types";

function makeBars(prices: number[]): Bar[] {
  return prices.map((c, i) => ({
    t: new Date(2024, 0, i + 1).toISOString(),
    o: c,
    h: c * 1.01,
    l: c * 0.99,
    c,
    v: 1_000_000 + i * 1000,
    n: 1000,
    vw: c,
  }));
}

describe("summarizeTechnicals", () => {
  it("returns null with too few bars", () => {
    expect(summarizeTechnicals("XYZ", makeBars([1, 2, 3]))).toBeNull();
  });

  it("reads an uptrend as bullish", () => {
    const prices = Array.from({ length: 60 }, (_, i) => 100 + i * 1.0);
    const summary = summarizeTechnicals("UP", makeBars(prices));
    expect(summary).not.toBeNull();
    expect(summary!.trend).toBe("up");
    expect(summary!.above_sma50).toBe(true);
    expect(summary!.direction).toBe("bullish");
  });

  it("reads a downtrend as bearish", () => {
    const prices = Array.from({ length: 60 }, (_, i) => 200 - i * 1.5);
    const summary = summarizeTechnicals("DOWN", makeBars(prices));
    expect(summary).not.toBeNull();
    expect(summary!.trend).toBe("down");
    expect(summary!.above_sma50).toBe(false);
    expect(summary!.direction).toBe("bearish");
  });

  it("populates indicator fields and notes", () => {
    const prices = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    const summary = summarizeTechnicals("MIX", makeBars(prices));
    expect(summary).not.toBeNull();
    expect(summary!.rsi_14).not.toBeNull();
    expect(Array.isArray(summary!.notes)).toBe(true);
  });

  it("exposes supertrend and ADX fields", () => {
    const up = Array.from({ length: 60 }, (_, i) => 100 + i * 1.0);
    const summary = summarizeTechnicals("UP2", makeBars(up));
    expect(summary).not.toBeNull();
    expect(summary!.supertrend_direction).toBe("bullish");
    expect(summary!.adx_14).not.toBeNull();
    expect(summary!.adx_uptrend).toBe(true);

    const down = Array.from({ length: 60 }, (_, i) => 200 - i * 1.5);
    const summaryDown = summarizeTechnicals("DOWN2", makeBars(down));
    expect(summaryDown!.supertrend_direction).toBe("bearish");
    expect(summaryDown!.adx_uptrend).toBe(false);
  });
});

describe("computeSuperTrend", () => {
  it("returns null with too few bars", () => {
    expect(computeSuperTrend(makeBars([1, 2, 3]))).toBeNull();
  });

  it("is bullish in a steady uptrend and bearish in a steady downtrend", () => {
    const up = computeSuperTrend(makeBars(Array.from({ length: 60 }, (_, i) => 100 + i)));
    expect(up?.direction).toBe("bullish");
    expect(up?.value).toBeLessThan(160);

    const down = computeSuperTrend(makeBars(Array.from({ length: 60 }, (_, i) => 200 - i)));
    expect(down?.direction).toBe("bearish");
    expect(down?.value).toBeGreaterThan(140);
  });

  it("reflects a reversal on the most recent bar (not a stale value)", () => {
    // Steady uptrend, then a sharp final-bar gap down through the lower band.
    const prices = Array.from({ length: 59 }, (_, i) => 100 + i * 0.5);
    prices.push(60); // violent reversal bar
    const st = computeSuperTrend(makeBars(prices));
    expect(st?.direction).toBe("bearish");
  });
});

describe("computeADX", () => {
  it("returns null with too few bars", () => {
    expect(computeADX(makeBars(Array.from({ length: 10 }, () => 100)))).toBeNull();
  });

  it("shows a strong uptrend with +DI above -DI", () => {
    const bars = Array.from({ length: 60 }, (_, i) => 100 + i * 1.5).map((c, i) => ({
      t: new Date(2024, 0, i + 1).toISOString(),
      o: c,
      h: c * 1.02,
      l: c * 0.99,
      c,
      v: 1_000_000,
      n: 1000,
      vw: c,
    }));
    const adx = computeADX(bars);
    expect(adx).not.toBeNull();
    expect(adx!.adx).toBeGreaterThan(20);
    expect(adx!.plus_di).toBeGreaterThan(adx!.minus_di);
  });
});
