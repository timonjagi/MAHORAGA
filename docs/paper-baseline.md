# Mahoraga Paper-Trading Baseline — 2026-10-05

Captured before a multi-day paper-trading evaluation. Compare P&L and
behavior against this snapshot after a few days.

## Account (Alpaca paper)
- Status: ACTIVE
- Equity: $99,805.92  (started $100,000.00 → -$194.08 / -0.19%)
- Cash: $84,831.45
- Long market value: $14,974.47
- Last equity: $100,000

## Open positions (3/5)
| Symbol | Qty | Mkt value | Unrealized P&L |
|--------|-----|-----------|----------------|
| AMD  | 7.91  | $4,988.29 | -$11.70 (-0.23%) |
| QCOM | 27.44 | $4,975.30 | -$24.69 (-0.49%) |
| VOO  | 7.03  | $5,011.44 | +$11.45 (+0.23%) |

## Agent configuration
- enabled: true
- LLM: google/gemini-3.5-flash-lite (ai-sdk)
- max_positions: 5
- max_positions_per_group: 2
- require_buy_verdict: false  (relaxed mode)
- position_size_pct_of_cash: 25 (capped at max_position_value $5,000)

## Signals & cost
- Active signals: 148 (news ~95, apewisdom ~63, sec, stocktwits)
- Researched symbols: 52
- LLM cost to date: $0.33 (514 calls, 228,618 in / 101,620 out tokens)

## What to watch over the next few days
1. Net P&L vs $100,000 (and vs LLM cost).
2. Whether the relaxed gate opens sensible long-only positions
   (technicals-confirmed WAIT picks) vs. churn.
3. Stale-position exits (stale_position_enabled).
4. Group concentration staying ≤ 2 per correlated group.
5. Whether any position is opened against a bearish technical trend
   (should be impossible now).
6. Realized vs unrealized P&L split and turnover.

## Known limitations (paper phase)
- Signals thin for true direction: Reddit is attention-only (OAuth closed);
  StockTwits Cloudflare-blocked; crypto needs crypto_enabled.
- Cost display only knows a few models; Gemini rates are approximated.
- Technicals reject crypto in relaxed mode (by design).
