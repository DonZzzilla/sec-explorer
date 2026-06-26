---
created: 2026-06-25
tags: tool, insider-trading, sec, form-4
---

# Insider Trading Monitor

Tracks CEO/CFO/Director buy/sell transactions from SEC Form 4 filings.

## How It Works

1. Scans EDGAR daily index for Form 4 filings
2. Downloads XML filings
3. Parses <nonDerivativeTransaction> blocks for shares, price, action
4. Scores signals based on owner type, buy/sell ratio, transaction size
5. Delivers HIGH/MEDIUM to Discord

## Configuration

- **Script:** `scripts/insider_trading_monitor.py`
- **Data format:** XML (not HTML text)
- **Cron:** Every 3h → Discord #youtube⏩💰

## Signal Scoring

| Signal | Score | Description |
|--------|-------|-------------|
| OFFICER_TRADE | +5 | CEO/CFO/COO/President |
| DIRECTOR_TRADE | +3 | Board member |
| PURE_BUY | +5 | Only buys, no sells |
| PURE_SELL | +3 | Only sells |
| NET_BUY | +3 | Buys > 2x sells |
| LARGE_BUY | +5 | >100K shares |
| MEDIUM_BUY | +3 | >10K shares |

## Key XML Tags

```xml
<issuerName>Company Name</issuerName>
<rptOwnerName>John Doe</rptOwnerName>
<isOfficer>1</isOfficer>
<isDirector>1</isDirector>
<transactionShares><value>145000</value></transactionShares>
<transactionPricePerShare><value>6.44</value></transactionPricePerShare>
<transactionAcquiredDisposedCode><value>A</value></transactionAcquiredDisposedCode>
```

## Why This Works

Insider buying is one of the most reliable bullish signals:
- Executives know their company's prospects better than anyone
- Cluster buying (3+ insiders) predicts future outperformance
- Form 4 filed within 2 business days = near real-time signal
- Academic research shows insider buy portfolios beat market 6-8% annually

## Patterns to Watch

- **Cluster buying:** Multiple insiders buying = strongest signal
- **Large purchases:** >10% of annual salary = high conviction
- **Buying before earnings:** Often predicts positive surprise
- **10b5-1 plans:** Pre-scheduled = less signal (check footnotes)
- **Selling before bad news:** Watch for unusual sell patterns
