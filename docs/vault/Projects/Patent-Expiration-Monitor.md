---
created: 2026-06-25
tags: tool, patent, pharma, uspto, cron
---

# Patent Expiration Monitor

Tracks upcoming pharmaceutical patent expirations. When a drug patent expires, generic competitors enter and the brand-name stock often drops 20-40%.

## How It Works

1. Curated watchlist of 20 blockbuster drugs
2. Maps patent expiration windows to urgency tiers
3. Scores: CRITICAL (≤1yr), WATCH (≤2-3yrs), LONG (3+ yrs)
4. Maps to tickers for trading
5. Delivers to Discord every 3 hours

## Configuration

- **Script:** `scripts/patent_expiry_monitor.py`
- **Watchlist:** Embedded in script (easy to extend)
- **Cron:** Every 3h → Discord #youtube⏩💰

## Urgency Tiers

| Tier | Timeframe | Score | Action |
|------|-----------|-------|--------|
| 🔴 CRITICAL | ≤1 year | 8-10 | Immediate research |
| 🟡 WATCH | 2-3 years | 4-6 | Position building |
| ⚪ LONG | 3+ years | 2 | Monitor only |

## Current Critical Signals (June 2026)

- **Revlimid** (BMY) — already expiring
- **Ozempic/Wegovy** (NVO) — expiring now
- **Imbruvica, Calquence, Dupixent, Balversa** — within 1 year

## Data Sources

- FDA Orange Book (drug approvals/patents)
- USPTO (patent filings)
- Cortellis/EvaluatePharma (commercial intelligence)
