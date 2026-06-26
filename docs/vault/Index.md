---
created: 2026-06-25
tags: index, project/sec-explorer
---

# SEC Explorer Vault

Public data arbitrate toolkit — monitoring free government data for financial alpha.

## Maps of Content

### Tools
- [[SEC Comment Letter Monitor]] — EDGAR CORRESP tracking
- [[Patent Expiration Monitor]] — Pharma patent cliffs

### Data Sources
- [[EDGAR]] — SEC filing system
- [[USPTO]] — Patent database
- [[FDA Orange Book]] — Drug approvals

### Patterns & Lessons
- [[EDGAR URL Construction]] — File path format gotchas
- [[Materiality Scoring]] — How we score SEC comment severity
- [[Filtering Patterns]] — Excluding noise (ETFs, funds, SPACs)

### Expansion
- [[Roadmap]] — Phase 2-4 data sources
- [[Monetization]] — How to turn this into revenue

## Daily Log

```dataview
TABLE status, summary
FROM "Daily"
SORT file.name DESC
LIMIT 7
```
