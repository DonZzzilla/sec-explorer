#!/usr/bin/env python3
"""
Insider Trading Monitor (Form 4)

Tracks CEO/CFO/Director buy/sell transactions on company stock.
Insider buying is one of the most reliable bullish signals —
executives know their company's prospects better than anyone.

Data source: SEC EDGAR Form 4 filings (updated within 2 business days)

Key insight:
- Cluster buying (3+ insiders buying) → strong bullish signal
- Selling before bad news → leading indicator
- Large purchases (>10% of salary) → high conviction
- 10b5-1 plans → pre-scheduled (less signal)
"""

import requests
import re
import json
import os
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

# ── Configuration ──────────────────────────────────────────────────────────
STATE_FILE = os.path.expanduser("~/.hermes/scripts/insider_monitor_state.json")
USER_AGENT = "ZeroSkills / contact@example.com"
REPORT_DIR = os.path.expanduser("~/.hermes/cron/output")

# High-interest tickers to monitor (customizable)
WATCHLIST_TICKERS = [
    # Tech
    "AAPL", "MSFT", "GOOGL", "META", "NVDA", "AMD", "TSLA", "PLTR",
    # Healthcare
    "ABBV", "LLY", "NVO", "UNH", "JNJ", "PFE", "ABT", "DHR",
    # Finance
    "BRK.B", "JPM", "V", "MA", "BAC", "GS", "MS",
    # Consumer
    "AMZN", "COST", "WMT", "HD", "TGT", "MCD",
    # Energy
    "XOM", "CVX", "COP", "SLB",
    # Defense/Space
    "LMT", "RTX", "NOC", "BA", "LDOS",
    # Small caps with high insider ownership
    "SOVRN", "BCRX", "KRYS", "RIVN", "LCID",
]

# Known insider-friendly companies (high insider ownership)
INSIDER_HEAVY = [
    "MRNA", "COIN", "PLTR", "HOOD", "RBLX", "SNOW", "CRWD", "NET",
    "ZS", "OKTA", "TTWO", "BIIB", "GILD", "REGN", "VRTX",
]


def fetch_daily_index(date: datetime):
    """Fetch EDGAR daily index."""
    year = date.year
    quarter = (date.month - 1) // 3 + 1
    date_str = date.strftime('%Y%m%d')
    url = f"https://www.sec.gov/Archives/edgar/daily-index/{year}/QTR{quarter}/master.{date_str}.idx"
    headers = {'User-Agent': USER_AGENT}
    resp = requests.get(url, headers=headers, timeout=30)
    if resp.status_code == 200:
        return resp.text
    return None


def parse_index_for_form4(index_text: str):
    """Parse daily index for Form 4 filings matching our watchlist."""
    filings = []
    for line in index_text.split('\n'):
        if line.startswith('CIK') or line.startswith('---') or not line.strip():
            continue
        parts = line.split('|')
        if len(parts) >= 5:
            cik = parts[0].strip()
            company = parts[1].strip()
            form_type = parts[2].strip()
            filing_date = parts[3].strip()
            file_path = parts[4].strip()

            if form_type == '4':
                filings.append({
                    'cik': cik,
                    'company': company,
                    'date': filing_date,
                    'file_path': file_path,
                })
    return filings


def fetch_form4_text(filing: dict):
    """Fetch Form 4 filing text from EDGAR."""
    file_path = filing['file_path']
    parts = file_path.rsplit('/', 1)
    filename = parts[-1]
    accession = filename.replace('.txt', '')
    folder_no_dashes = accession.replace('-', '')
    cik_folder = parts[0].split('/')[-1] if len(parts) > 1 else parts[0]
    url = f"https://www.sec.gov/Archives/edgar/data/{cik_folder}/{folder_no_dashes}/{filename}"

    headers = {'User-Agent': USER_AGENT}
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code == 200:
            return resp.text
    except Exception:
        pass
    return None


def parse_form4(raw_text: str) -> dict:
    """Parse a Form 4 filing (XML format) to extract transaction details."""
    result = {
        'issuer': '',
        'reporting_owner': '',
        'owner_type': '',
        'transactions': [],
        'shares_owned_after': 0,
    }

    # Extract issuer
    issuer_match = re.search(r'<issuerName>([^<]+)</issuerName>', raw_text)
    if issuer_match:
        result['issuer'] = issuer_match.group(1).strip()

    # Extract reporting owner
    owner_match = re.search(r'<rptOwnerName>([^<]+)</rptOwnerName>', raw_text)
    if owner_match:
        result['reporting_owner'] = owner_match.group(1).strip()

    # Determine owner type
    if '<isDirector>1</isDirector>' in raw_text or '<isDirector>true</isDirector>' in raw_text:
        result['owner_type'] = 'DIRECTOR'
    elif '<isOfficer>1</isOfficer>' in raw_text or '<isOfficer>true</isOfficer>' in raw_text:
        result['owner_type'] = 'OFFICER'
    elif '<isTenPercentOwner>1</isTenPercentOwner>' in raw_text:
        result['owner_type'] = '10% OWNER'
    else:
        result['owner_type'] = 'OTHER'

    # Extract transactions from XML
    # Pattern: <nonDerivativeTransaction>...<value>SHARES</value>...<value>PRICE</value>...<transactionAcquiredDisposedCode><value>A/D</value>
    tx_blocks = re.findall(r'<nonDerivativeTransaction>(.*?)</nonDerivativeTransaction>', raw_text, re.DOTALL)
    for block in tx_blocks:
        shares_match = re.search(r'<transactionShares>\s*<value>([\d,]+)</value>', block)
        price_match = re.search(r'<transactionPricePerShare>\s*<value>([\d,.]+)</value>', block)
        action_match = re.search(r'<transactionAcquiredDisposedCode>\s*<value>([AD])</value>', block)
        date_match = re.search(r'<transactionDate>\s*<value>(\d{4}-\d{2}-\d{2})</value>', block)
        owned_match = re.search(r'<sharesOwnedFollowingTransaction>\s*<value>([\d,]+)</value>', block)
        title_match = re.search(r'<securityTitle>\s*<value>([^<]+)</value>', block)

        tx = {
            'action': 'BUY' if action_match and action_match.group(1) == 'A' else 'SELL',
            'date': date_match.group(1) if date_match else '',
            'shares': shares_match.group(1).replace(',', '') if shares_match else '0',
            'price': price_match.group(1) if price_match else '0',
            'owned_after': owned_match.group(1).replace(',', '') if owned_match else '0',
            'security': title_match.group(1) if title_match else '',
        }
        result['transactions'].append(tx)

    return result


def score_insider_signal(parsed: dict) -> dict:
    """Score an insider trading event."""
    score = 0
    signals = []

    if not parsed['transactions']:
        return {'score': 0, 'level': 'LOW', 'signals': []}

    total_buy = 0
    total_sell = 0
    for tx in parsed['transactions']:
        shares = int(tx['shares']) if tx['shares'].isdigit() else 0
        if tx['action'] == 'BUY':
            total_buy += shares
        else:
            total_sell += shares

    # Owner type weight
    owner_type = parsed.get('owner_type', '')
    if owner_type == 'OFFICER':
        score += 5
        signals.append('OFFICER_TRADE')
    elif owner_type == 'DIRECTOR':
        score += 3
        signals.append('DIRECTOR_TRADE')

    # Buy vs sell ratio
    if total_buy > 0 and total_sell == 0:
        score += 5
        signals.append('PURE_BUY')
    elif total_sell > 0 and total_buy == 0:
        score += 3
        signals.append('PURE_SELL')
    elif total_buy > total_sell * 2:
        score += 3
        signals.append('NET_BUY')
    elif total_sell > total_buy * 2:
        score += 2
        signals.append('NET_SELL')

    # Size of transaction
    if total_buy > 100000:
        score += 5
        signals.append('LARGE_BUY')
    elif total_buy > 10000:
        score += 3
        signals.append('MEDIUM_BUY')
    elif total_buy > 1000:
        score += 1
        signals.append('SMALL_BUY')

    # Determine level
    if score >= 10:
        level = 'HIGH'
    elif score >= 5:
        level = 'MEDIUM'
    else:
        level = 'LOW'

    return {
        'score': score,
        'level': level,
        'signals': signals,
        'total_buy': total_buy,
        'total_sell': total_sell,
    }


def run():
    """Main execution."""
    today = datetime.now()

    # Look back 2 days (Form 4s filed within 2 business days)
    all_filings = []
    processed = set()

    for day_offset in range(3):
        check_date = today - timedelta(days=day_offset)
        index_text = fetch_daily_index(check_date)
        if index_text:
            filings = parse_index_for_form4(index_text)
            for f in filings:
                acc = f['file_path'].split('/')[-1].replace('.txt', '')
                if acc not in processed:
                    all_filings.append(f)
                    processed.add(acc)

    if not all_filings:
        report = {
            'timestamp': today.isoformat(),
            'status': 'no_new',
            'message': 'No new Form 4 filings found',
            'filings': [],
        }
    else:
        # Download and analyze
        analyzed = []
        for filing in all_filings[:30]:  # Limit to avoid timeouts
            raw = fetch_form4_text(filing)
            if not raw:
                continue

            parsed = parse_form4(raw)
            signal = score_insider_signal(parsed)

            if signal['score'] >= 5:
                analyzed.append({
                    'company': parsed['issuer'] or filing['company'],
                    'owner': parsed['reporting_owner'],
                    'owner_type': parsed['owner_type'],
                    'signal': signal,
                    'transactions': parsed['transactions'][:5],
                    'edgar_url': f"https://www.sec.gov/{filing['file_path']}",
                })

        # Sort by signal score
        analyzed.sort(key=lambda x: x['signal']['score'], reverse=True)

        report = {
            'timestamp': today.isoformat(),
            'status': 'found',
            'total_scanned': len(all_filings),
            'significant': len(analyzed),
            'filings': analyzed[:10],
        }

    os.makedirs(REPORT_DIR, exist_ok=True)
    report_file = os.path.join(REPORT_DIR, f"insider_{today.strftime('%Y%m%d')}.json")
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)

    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    run()
