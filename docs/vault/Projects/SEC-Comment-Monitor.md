---
created: 2026-06-25
tags: tool, edgar, sec, cron, discord
---

# SEC Comment Letter Monitor

Scans SEC EDGAR every 3 hours for new comment letters between SEC and public companies.

## How It Works

1. Fetches EDGAR daily index (`master.YYYYMMDD.idx`)
2. Filters for CORRESP + UPLOAD filings
3. Excludes ETFs, Funds, Trusts, SPACs
4. Downloads filing text (parallel, 8 threads)
5. Extracts letter content (HTML → text)
6. Scores materiality via keywords + structural signals
7. Delerts HIGH/MEDIUM to Discord

## Configuration

- **Script:** `scripts/sec_comment_monitor.py`
- **State:** `~/.hermes/scripts/sec_comment_monitor_state.json`
- **Cron:** Every 3h → Discord #youtube⏩💰
- **User-Agent:** `ZeroSkills / contact@example.com`

## Materiality Keywords

| Level | Keywords | Score |
|-------|----------|-------|
| HIGH | going concern, fraud, misstatement, restatement, material weakness | +10 |
| MEDIUM | revenue recognition, derivative, hedging, fair value, valuation | +5 |
| LOW | disclosure, clarification, supplement | +1 |

## Signals

- SEC question patterns: +2 each (capped at 10)
- Long letters (>3000 chars): +3
- Multiple topics (3+ numbered): +5

## Output Example

```json
{
  "status": "found",
  "total_new": 45,
  "significant_count": 17,
  "filings": [
    {
      "company": "Super League Enterprise",
      "materiality": {"level": "HIGH", "score": 18},
      "edgar_url": "https://www.sec.gov/..."
    }
  ]
}
```
