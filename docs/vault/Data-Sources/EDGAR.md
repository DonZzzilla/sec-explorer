---
created: 2026-06-25
tags: data-source, sec, api, edgar
---

# EDGAR (SEC)

Securities and Exchange Commission's Electronic Data Gathering, Analysis, and Retrieval system.

## Key URLs

| Resource | URL |
|----------|-----|
| Daily Index | `https://www.sec.gov/Archives/edgar/daily-index/{YEAR}/QTR{N}/master.{YYYYMMDD}.idx` |
| Filing Detail | `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={CIK}&type={FORM}` |
| Full Text Search | `https://efts.sec.gov/LATEST/search-index` |
| Company Submissions | `https://data.sec.gov/submissions/CIK{cik}.json` |

## URL Construction (Gotcha!)

The SEC changed their file path format. The actual URL for a filing text is:

```
https://www.sec.gov/Archives/edgar/data/{CIK}/{ACCESSION_NO_DASHES}/{ACCESSION}.txt
```

Example:
- Index says: `edgar/data/1529864/0001193125-25-335305.txt`
- Actual URL: `https://www.sec.gov/Archives/edgar/data/1529864/000119312525335305/0001193125-25-335305.txt`
- The **folder name** has dashes stripped from the accession number

## Requirements

- **User-Agent header required** — format: `Name / email@example.com`
- **Rate limit:** ~10 requests/second
- **No API key needed** for public data

## Filing Types

| Type | Description | Signal |
|------|-------------|--------|
| CORRESP | SEC→company comment letters | 🔴 Material questions |
| UPLOAD | Company→SEC responses | ⚠️ Pushback/defensiveness |
| 10-K | Annual report | Full financial picture |
| 10-Q | Quarterly report | Trend detection |
| 8-K | Material events | M&A, restatements, exec changes |
| 4 | Insider trading | CEO/CFO buys/sells |
| DEF 14A | Proxy statement | Exec comp, board changes |
| S-1 | IPO registration | New market entrants |

## Daily Index Format

```
CIK|Company Name|Form Type|Date Filed|File Name
0001529864|Enova International, Inc.|CORRESP|20251229|edgar/data/1529864/0001193125-25-335305.txt
```

## API Alternatives

- **edgartools** (Python library): `pip install edgartools` — handles auth, parsing
- **sec-api.io** (paid): Full-text search, real-time feeds
- **EDGAR Online** (paid): XBRL parsing, fundamentals
