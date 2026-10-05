import { describe, expect, it } from "vitest";
import { detectNewsSentiment } from "./sentiment";

describe("detectNewsSentiment", () => {
  it("scores upgrades and beats as bullish", () => {
    expect(detectNewsSentiment("TD Cowen Upgrades Cboe Global Markets to Buy")).toBeGreaterThan(0);
    expect(detectNewsSentiment("Nvidia beats earnings expectations, raises guidance")).toBeGreaterThan(0);
  });

  it("scores downgrades and misses as bearish", () => {
    expect(detectNewsSentiment("Wells Fargo Downgrades Ford to Underperform")).toBeLessThan(0);
    expect(detectNewsSentiment("Company misses revenue estimates, cuts outlook")).toBeLessThan(0);
  });

  it("returns 0 for neutral headlines", () => {
    expect(detectNewsSentiment("Iran Interior Minister Heads To Doha For Talks")).toBe(0);
    expect(detectNewsSentiment("Company to present at upcoming conference")).toBe(0);
  });

  it("uses word boundaries to avoid false positives", () => {
    // "low" must not match "slow"; "gain" must not match "again".
    expect(detectNewsSentiment("Production is slow this quarter")).toBe(0);
    expect(detectNewsSentiment("The company will report again next week")).toBe(0);
  });

  it("is case-insensitive", () => {
    expect(detectNewsSentiment("STOCK SURGES ON RECORD PROFIT")).toBeGreaterThan(0);
  });
});
