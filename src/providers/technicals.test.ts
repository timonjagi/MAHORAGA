import { describe, expect, it } from "vitest";
import { summarizeTechnicals } from "./technicals";
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
});
