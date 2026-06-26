---
created: 2026-06-25
tags: pattern, filtering, sec
---

# Filtering Patterns

Patterns for separating signal from noise in government data feeds.

## ETF/Fund Exclusion

Most SEC correspondence is routine fund/ETF paperwork. Filter these out:

```python
EXCLUDE_PATTERNS = [
    # ETF providers
    'PROSHARES', 'Vanguard', 'iShares', 'SPDR', 'Shares Trust',
    'Grayscale', 'Bitwise', 'WisdomTree', 'Invesco', 'VanEck',
    'ALPS', 'Global X',
    # Fund structures
    'ETF Trust', 'Fund Trust', 'Funds Trust', 'Investment Trust',
    'Series Trust', 'Trust II', 'Trust III', 'Trust IV',
    'Mutual Fund', 'Closed-End Fund', 'Interval Fund',
    # Asset managers
    'Franklin Templeton', 'J\\.P\\. Morgan', 'RBC Funds',
    'Calamos', 'Hartford Funds', 'Northern Lights',
    'EA Series', 'Investment Managers', 'Tortoise Capital',
    'Valkyrie', 'Vela Funds',
    # Other non-operating
    'Business Development Company', 'BDC',
    'Real Estate Investment Trust', 'REIT',
    'Master Limited Partnership', 'MLP',
    'SPAC', 'Acquisition Corp', 'Capital Acquisition',
]
```

## Materiality Keyword Scoring

```python
MATERIALITY_KEYWORDS = {
    "HIGH": [
        "going concern", "material weakness", "internal controls",
        "fraud", "misstatement", "restatement", "irregularities",
        "related party", "insider trading", "revenue recognition",
        "bill and hold", "channel stuffing", "round-trip",
        "off-balance sheet", "variable interest entity",
        "SEC investigation", "subpoena", "Wells notice",
        "delisting", "non-compliance",
    ],
    "MEDIUM": [
        "segment reporting", "pro forma", "non-GAAP",
        "fair value", "valuation", "concentration",
        "derivative", "hedging", "stock-based compensation",
        "capitalization", "expense classification",
        "subsequent events", "contingent liabilities",
    ],
}
```

## SEC Question Patterns

```python
QUESTION_PATTERNS = [
    r'[Ww]e (?:note|question|ask|request|believe)',
    r'please (?:explain|clarify|advise|describe|confirm)',
    r'[Ww]e (?:do not|did not) understand',
    r'[P]rovide us with',
    r'[Ww]e (?:may|will) have (?:further|additional) comments',
]
```
