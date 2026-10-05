import { describe, expect, it } from "vitest";
import { classifySymbol, countGroupPositions } from "./groups";

describe("classifySymbol", () => {
  it("groups known Brazil tickers together", () => {
    expect(classifySymbol("EWZ")).toBe("brazil");
    expect(classifySymbol("VALE")).toBe("brazil");
    expect(classifySymbol("BMA")).toBe("brazil");
    expect(classifySymbol("PBR")).toBe("brazil");
  });

  it("groups known China tickers", () => {
    expect(classifySymbol("FXI")).toBe("china");
    expect(classifySymbol("BABA")).toBe("china");
  });

  it("is case-insensitive", () => {
    expect(classifySymbol("ewz")).toBe("brazil");
  });

  it("returns null for ungrouped tickers", () => {
    expect(classifySymbol("AAPL")).toBeNull();
    expect(classifySymbol("MSFT")).toBeNull();
  });

  it("returns null for crypto pairs", () => {
    expect(classifySymbol("BTC/USD")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(classifySymbol("")).toBeNull();
  });
});

describe("countGroupPositions", () => {
  it("counts positions that fall into a group", () => {
    const positions = [
      { symbol: "EWZ" },
      { symbol: "VALE" },
      { symbol: "AAPL" },
      { symbol: "FXI" },
    ];
    expect(countGroupPositions(positions, "brazil")).toBe(2);
    expect(countGroupPositions(positions, "china")).toBe(1);
    expect(countGroupPositions(positions, "japan")).toBe(0);
  });
});
