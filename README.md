# SEC Explorer — Public Data Arbitrage Tools

> "The wealthy know about these information sources. Now so do you. The difference is automation."

A collection of monitoring tools that mine publicly available government and institutional data for actionable financial signals — running on a Raspberry Pi, costing nothing.

## Tools

### 1. SEC Comment Letter Monitor (`sec_comment_monitor.py`)

**What it does:** Scans the SEC's EDGAR database every 3 hours for new comment letters between the SEC and public companies. When the SEC questions a company's financials, it's a leading indicator of problems.

**Signals it catches:**
- Going concern warnings
- Material weakness in internal controls
- Revenue recognition questions
- Related party transaction concerns
- Non-compliance flags
- Restatement inquiries

**Data source:** SEC EDGAR Daily Index (free, public, updated every 10 minutes)

**Output:** JSON report with materiality scoring (HIGH/MEDIUM/LOW)

### 2. Patent Expiration Monitor (`patent_expiry_monitor.py`)

**What it does:** Tracks upcoming pharmaceutical patent expirations. When a drug patent expires, generic competitors enter and the brand-name stock often drops 20-40%.

**Signals it catches:**
- Patents expiring within 1 year (CRITICAL)
- Patents expiring within 2-3 years (WATCH)
- Key blockbuster drugs losing exclusivity

**Data source:** Curated watchlist + USPTO/Google Patents

**Output:** JSON report with urgency scoring and ticker mapping

## Architecture

```
EDGAR Daily Index ──→ sec_comment_monitor.py ──→ JSON ──→ Discord/Telegram
USPTO/Google Patents ──→ patent_expiry_monitor.py ──→ JSON ──→ Discord/Telegram
```

Both tools run as Hermes cron jobs every 3 hours. No API keys needed — all data is public.

## Setup

```bash
# Install dependencies
pip3 install --break-system-packages requests feedparser

# SEC monitor (requires User-Agent)
python3 -c "import edgar; edgar.set_identity('Your Name / your@email.com')"
python3 sec_comment_monitor.py

# Patent monitor
python3 patent_expiry_monitor.py
```

## Why This Works

The information is **free and public** but:
1. **Volume:** Thousands of filings daily — no human can read them all
2. **Format:** Buried in EDGAR's arcane index files
3. **Timing:** SEC comment letters often precede stock drops by weeks/months
4. **Access:** Hedge funds pay $100K+/year for terminals that do this — we do it for free

## Disclaimer

This is for educational and research purposes. Nothing here is financial advice. Do your own due diligence before making investment decisions.

## Backup & Source Control

All tools are backed up to a private GitHub repository and synced via Hermes backup cron.
