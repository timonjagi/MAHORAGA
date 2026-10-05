/**
 * Portfolio concentration groups.
 *
 * A long-only book can still take one concentrated macro bet through many
 * tickers (e.g. a "Brazil rally" headline → EWZ + VALE + BMA + PBR). Grouping
 * correlated tickers lets the entry gate cap positions per group.
 *
 * Strategy: a curated static map of well-known country/region funds and the
 * common ADRs that track them, plus tight commodity themes (gold, oil). Tickers
 * not in the map return null and are only bounded by the global max_positions.
 *
 * This is intentionally conservative and easy to extend.
 */

const GROUP_MEMBERS: Record<string, string[]> = {
  // ── Countries / regions ──────────────────────────────────────────────
  brazil: [
    "EWZ", "EWZS", "BMA", "VALE", "PBR", "PBR.A", "ITUB", "BBD", "ERJ",
    "GGB", "SBS", "CIG", "ABEV", "BAK", "BRFS", "CBD", "ELP", "TIMB", "UGP",
    "SUZ", "CSAN", "VIV", "INTR", "NU",
  ],
  china: [
    "FXI", "MCHI", "KWEB", "CQQQ", "ASHR", "BABA", "JD", "PDD", "NIO",
    "XPEV", "LI", "BIDU", "TCOM", "BILI", "YUMC", "BEKE", "TME", "NTES",
    "EDU", "ZH", "VIPS", "TAL", "GDS", "WB",
  ],
  japan: ["EWJ", "DXJ", "JPXN", "TM", "SONY", "MUFG", "SMFG", "MFG", "HMC", "NMR"],
  india: ["INDA", "SMIN", "EPI", "WIT", "INFY", "IBN", "HDB", "TTM", "RDY"],
  korea: ["EWY", "KORU", "PKX", "KB", "SHG"],
  taiwan: ["EWT", "TSM", "UMC", "ASX"],
  mexico: ["EWW", "FMX", "KOF", "CX", "TV", "BIMBO"],
  germany: ["EWG", "DAX", "SAP", "SIEGY", "BAYRY", "DB"],
  uk: ["EWU", "BP", "SHEL", "AZN", "HSBC", "UL", "DEO", "RIO", "BCS", "LYG", "GSK"],
  canada: ["EWC", "SU", "CNQ", "ENB", "TD", "RY", "BNS", "BMO", "CNI", "CP", "SHOP", "MFC"],
  australia: ["EWA", "BHP", "RIO", "VALE", "FMX"],
  argentina: ["ARGT", "GGAL", "YPF", "BMA", "SUPV", "TGS", "CRESY", "EDN", "PAM", "TEO"],

  // ── Commodity themes ─────────────────────────────────────────────────
  gold: [
    "GLD", "IAU", "GLDM", "GDX", "GDXJ", "SIL", "SLV", "SIVR", "NEM", "GOLD",
    "AEM", "FNV", "WPM", "KGC", "AU", "GFI", "HMY", "PAAS", "AG", "HL",
  ],
  oil_gas: [
    "USO", "BNO", "XLE", "XOP", "OIH", "XOM", "CVX", "COP", "SLB", "OXY",
    "MPC", "PSX", "VLO", "EOG", "PXD", "DVN", "HAL", "BKR", "FSLR", "KMI",
  ],
};

// Reverse index: symbol → group.
const SYMBOL_TO_GROUP: Map<string, string> = new Map();
for (const [group, symbols] of Object.entries(GROUP_MEMBERS)) {
  for (const sym of symbols) {
    // First mapping wins so a ticker appearing in two lists stays deterministic.
    if (!SYMBOL_TO_GROUP.has(sym)) SYMBOL_TO_GROUP.set(sym, group);
  }
}

/**
 * Classify a ticker into a concentration group, or null when ungrouped.
 * Crypto pairs (containing "/") are ungrouped.
 */
export function classifySymbol(symbol: string): string | null {
  if (!symbol || symbol.includes("/")) return null;
  return SYMBOL_TO_GROUP.get(symbol.toUpperCase()) ?? null;
}

/**
 * Count how many positions already fall into the given group.
 */
export function countGroupPositions(
  positions: Array<{ symbol: string }>,
  group: string
): number {
  let count = 0;
  for (const p of positions) {
    if (classifySymbol(p.symbol) === group) count++;
  }
  return count;
}
