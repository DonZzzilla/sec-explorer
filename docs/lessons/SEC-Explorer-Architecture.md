---
created: 2026-06-25
tags: project/sec-explorer, lesson/automation, data-source/edgar
---

# SEC Explorer — Lessons & Architecture

## Overview
Public data arbitrage toolkit: monitor free government/institutional data feeds for actionable financial signals that usually require $10K+/year terminals.

## Tools Built

### 1. SEC Comment Letter Monitor
- **Data:** SEC EDGAR Daily Index (CORRESP + UPLOAD filings)
- **Frequency:** Every 3 hours
- **Key signals:** Going concern, material weakness, fraud, revenue recognition, non-compliance, restatement, related party
- **Architecture:** Download daily index → filter ETF/fund spam → parallel download filings → content analysis → materiality score → Discord alert

### 2. Patent Expiration Monitor
- **Data:** Curated watchlist (USPTO + FDA Orange Book)
- **Frequency:** Every 3 hours
- **Key signals:** Patent cliffs, generic entry timelines, blockbuster drug exclusivity
- **Architecture:** Static watchlist + expiration scoring → urgency tiers → ticker mapping → Discord alert

## Patterns Discovered

### EDGAR Daily Index Format
- URL: `https://www.sec.gov/Archives/edgar/daily-index/{YEAR}/QTR{N}/master.{YYYYMMDD}.idx`
- Format: `CIK|Company|FormType|Date|FilePath`
- Actual file URL: `https://www.sec.gov/Archives/edgar/data/{CIK}/{ACCESSION_NO_DASHES}/{ACCESSION}.txt`
- SEC requires `User-Agent: Name / email` header
- Daily files only available for business days (weekends = no file)

### SEC Comment Letter Pipeline
1. Download daily `.idx` file (parse, skip header lines)
2. Filter for CORRESP (SEC→company) + UPLOAD (company→SEC)
3. Exclude: ETFs, Funds, Trusts, SPACs, REITs, BDCs, MLPs
4. Extract letter content (HTML→text conversion)
5. Score materiality via keywords + structural signals
6. Threshold: only alert on MEDIUM (5+) or HIGH (15+)

### Materiality Scoring Formula
- HIGH keywords (going concern, fraud, misstatement): +10
- MEDIUM keywords (valuation, derivative, hedging): +5
- SEC question patterns ("We note", "Please explain"): +2 each
- Long letters (>3000 chars): +3
- Multiple numbered topics (3+): +5

## Lessons Learned

### URL Construction Gotcha
The SEC changed their file path format:
- **Wrong:** `/Archives/edgar/data/{CIK}/{ACCESSION}.txt`
- **Right:** `/Archives/edgar/data/{CIK}/{ACCESSION_NO_DASHES}/{ACCESSION}.txt`
- The folder name has dashes stripped from the accession number

### Deduplication Strategy
- Store processed accession numbers in state file
- Keep last 500 (sorted, sliced)
- JSON state at `~/.hermes/scripts/sec_monitor_state.json`

### Performance
- Download 20-25 filings per run (more = timeouts)
- Use `ThreadPoolExecutor(max_workers=8)` for parallel downloads
- Filter BEFORE downloading (save bandwidth + time)

### Filtering Patterns
```python
EXCLUDE_PATTERNS = [
    'ETF Trust', 'Fund Trust', 'Series Trust',
    'PROSHARES', 'Vanguard', 'iShares', 'SPDR',
    'Business Development Company', 'BDC',
    'SPAC', 'Acquisition Corp',
]
```

## Expansion Ideas

### Phase 2 — Data Sources
- [ ] **FDA Orange Book API** — real-time drug approval/expiration data
- [ ] **USPTO Patent API** — auto-expand patent watchlist via CPC codes
- [ ] **10-K/10-Q Section 1A** (Risk Factors) — extract changes year-over-year
- [ ] **Insider Trading (Form 4)** — CEO/CFO buy/sell patterns
- [ ] **8-K Filings** — material event detection (M&A, restatements, executive changes)
- [ ] **Proxy Statements** — executive compensation trends, board changes
- [ ] **Industry Data:** 13F (institutional holdings), NCRAs (credit ratings)

### Phase 3 — Monetization Path
- **Free tier:** Weekly digest (SEC + Patent alerts)
- **Paid tier:** Real-time Discord alerts + portfolio tracking
- **Premium tier:** API access + custom watchlists
- **Public page:** Summary stats, methodology docs, testimonials

### Phase 4 — UI/UX
- Obsidian vault: daily-auto-generated reports → knowledge graph
- Web dashboard: real-time feed of flagged filings
- Mobile: push notifications for HIGH alerts
