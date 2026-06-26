#!/usr/bin/env python3
"""
SEC Comment Letter Monitor
Fetches daily CORRESP/UPLOAD filings from EDGAR, identifies material SEC comments,
and outputs a structured report for delivery.

Architecture:
- Reads EDGAR daily index files (master.YYYYMMDD.idx)
- Filters for CORRESP (SEC→company letters) and UPLOAD (company responses)
- Downloads and parses letter content
- Scores materiality based on SEC comment keywords
- Outputs JSON report for cron delivery

Requires: User-Agent header (SEC requirement)
"""

import requests
import re
import json
import os
import sys
from datetime import datetime, timedelta
from html.parser import HTMLParser
from concurrent.futures import ThreadPoolExecutor, as_completed

# ── Configuration ──────────────────────────────────────────────────────────
STATE_FILE = os.path.expanduser("~/.hermes/scripts/sec_monitor_state.json")
USER_AGENT = "ZeroSkills / contact@example.com"
EDGAR_BASE = "https://www.sec.gov/Archives/edgar"
REPORT_DIR = os.path.expanduser("~/.hermes/cron/output")

# Materiality keywords - SEC focus areas that move stock prices
MATERIALITY_KEYWORDS = {
    "HIGH": [
        "going concern", "material weakness", "internal controls",
        "fraud", "misstatement", "restatement", "irregularities",
        "related party", "insider trading", "revenue recognition",
        "bill and hold", "channel stuffing", "round-trip",
        "off-balance sheet", "variable interest entity",
        "impaired", "goodwill impairment", "write-down",
        "SEC investigation", "subpoena", "Wells notice",
        "delisting", "non-compliance", "late filing",
    ],
    "MEDIUM": [
        "revenue recognition", "segment reporting", "pro forma",
        "non-GAAP", "adjusted EBITDA", "stock-based compensation",
        "fair value", "valuation", "concentration",
        "related-party transactions", "conflict of interest",
        "capitalization", "expense classification",
        "subsequent events", "contingent liabilities",
        "derivative", "hedging", "interest rate risk",
    ],
    "LOW": [
        "disclosure", "clarification", "supplement",
        "additional information", "please advise",
        "confirm", "acknowledge", "represent",
    ]
}

# SEC division/division codes that matter most
IMPORTANT_DIVISIONS = [
    "Division of Corporation Finance",
    "Division of Enforcement",
    "Division of Investment Management",
    "Office of the Chief Accountant",
]


# ── HTML to text converter ────────────────────────────────────────────────
class SEC_HTML_Parser(HTMLParser):
    """Minimal HTML parser for SEC filing content extraction."""

    def __init__(self):
        super().__init__()
        self.text_parts = []
        self.skip_tags = {'script', 'style'}
        self._skip = False

    def handle_starttag(self, tag, attrs):
        if tag.lower() in self.skip_tags:
            self._skip = True

    def handle_endtag(self, tag):
        if tag.lower() in self.skip_tags:
            self._skip = False
        if tag.lower() in {'p', 'div', 'br', 'tr', 'li'}:
            self.text_parts.append('\n')

    def handle_data(self, data):
        if not self._skip:
            self.text_parts.append(data)

    def get_text(self):
        text = ''.join(self.text_parts)
        # Collapse multiple newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()


def html_to_text(html_content: str) -> str:
    """Convert HTML content from SEC filings to plain text."""
    parser = SEC_HTML_Parser()
    try:
        parser.feed(html_content)
        return parser.get_text()
    except Exception:
        # Fallback: strip HTML tags
        return re.sub(r'<[^>]+>', ' ', html_content)


# ── EDGAR API helpers ─────────────────────────────────────────────────────
def get_current_quarter():
    """Return (year, quarter_number) for current date."""
    now = datetime.now()
    quarter = (now.month - 1) // 3 + 1
    return now.year, quarter


def get_quarter(date):
    """Return (year, quarter_number) for a given date."""
    quarter = (date.month - 1) // 3 + 1
    return date.year, quarter


def fetch_daily_index(date: datetime):
    """Fetch the EDGAR daily index file for a given date."""
    year, quarter = get_quarter(date)
    date_str = date.strftime('%Y%m%d')
    url = f"{EDGAR_BASE}/daily-index/{year}/QTR{quarter}/master.{date_str}.idx"

    headers = {'User-Agent': USER_AGENT}
    resp = requests.get(url, headers=headers, timeout=30)

    if resp.status_code == 403:
        # Try previous quarter (index files can span quarter boundaries)
        if quarter > 1:
            url = f"{EDGAR_BASE}/daily-index/{year}/QTR{quarter-1}/master.{date_str}.idx"
        else:
            url = f"{EDGAR_BASE}/daily-index/{year-1}/QTR4/master.{date_str}.idx"
        resp = requests.get(url, headers=headers, timeout=30)

    if resp.status_code == 200:
        return resp.text
    return None


def parse_index_for_corresp(index_text: str):
    """Parse EDGAR daily index to find CORRESP and UPLOAD filings.

    Filters out ETFs, funds, and other non-operating companies to focus
    on substantive SEC comment letters for operating businesses.
    """
    # Keywords that indicate non-relevant filings (funds, ETFs, routine)
    EXCLUDE_PATTERNS = [
        # ETFs and fund trusts
        r'ETF Trust', r'Fund Trust', r'Funds Trust', r'Investment Trust',
        r'Series Trust', r'Trust II', r'Trust III', r'Trust IV',
        r'Mutual Fund', r'Closed-End Fund', r'Interval Fund',
        r'PROSHARES', r'Vanguard', r'iShares', r'SPDR', r'Shares Trust',
        r'Grayscale', r'Bitwise', r'WisdomTree', r'Invesco', r'VanEck',
        r'ALPS', r'Global X', r'Franklin Templeton', r'J\.P\. Morgan',
        r'RBC Funds', r'Calamos', r'Hartford Funds', r'Northern Lights',
        r'EA Series', r'Investment Managers', r'Tortoise Capital',
        r'Valkyrie', r'Vela Funds',
        # Other non-operating
        r'Business Development Company', r'BDC',
        r'Real Estate Investment Trust', r'REIT',
        r'Master Limited Partnership', r'MLP',
        r'SPAC', r'Acquisition Corp', r'Acquisition Corp\.',
        r'Capital Acquisition',
    ]

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

            if form_type in ('CORRESP', 'UPLOAD'):
                # Skip non-operating entities
                is_excluded = False
                for pattern in EXCLUDE_PATTERNS:
                    if re.search(pattern, company, re.IGNORECASE):
                        is_excluded = True
                        break
                if is_excluded:
                    continue

                filings.append({
                    'cik': cik,
                    'company': company,
                    'form_type': form_type,
                    'date': filing_date,
                    'file_path': file_path,
                })
    return filings


def fetch_filing_text(filing: dict):
    """Fetch the full text of a filing from EDGAR.

    SEC URL format: /Archives/edgar/data/<CIK>/<ACCESSION_NO_DASHES>/<ACCESSION>.txt
    The folder name is the accession number with dashes removed.
    """
    # file_path from daily index: edgar/data/1529864/0001193125-25-335305.txt
    # Actual URL: /Archives/edgar/data/1529864/000119312525335305/0001193125-25-335305.txt
    file_path = filing['file_path']
    parts = file_path.rsplit('/', 1)
    filename = parts[-1]
    accession = filename.replace('.txt', '')
    folder_no_dashes = accession.replace('-', '')
    # Reconstruct: keep the CIK folder, add no-dashes folder
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


def extract_letter_content(raw_text: str) -> str:
    """Extract the actual letter content from SEC filing wrapper."""
    # Find HTML content
    html_start = raw_text.find('<HTML>')
    html_end = raw_text.find('</HTML>')

    if html_start >= 0 and html_end > html_start:
        html_content = raw_text[html_start:html_end + 7]
        return html_to_text(html_content)

    # Fallback: look for text after SEC-HEADER
    header_end = raw_text.find('</SEC-HEADER>')
    if header_end > 0:
        content = raw_text[header_end + len('</SEC-HEADER>'):]
        # Remove document tags
        content = re.sub(r'<(?:DOCUMENT|TEXT|SEC-HEADER)[^>]*>', '', content)
        content = re.sub(r'</(?:DOCUMENT|TEXT|SEC-HEADER)>', '', content)
        return html_to_text(content)

    return ""


def extract_subject_line(raw_text: str) -> str:
    """Extract the subject/re: line from the filing."""
    # Look for "Re:" pattern - common in SEC correspondence
    re_match = re.search(r'Re:\s*(.+?)(?:\n|<)', raw_text)
    if re_match:
        subject = re_match.group(1).strip()
        # Clean up HTML entities and tags
        subject = re.sub(r'<[^>]+>', '', subject)
        subject = re.sub(r'&[a-z]+;', ' ', subject)
        subject = re.sub(r'\s+', ' ', subject).strip()
        if len(subject) > 10:
            return subject[:200]

    # Try to find from the filing header - look for filing reference
    filer_match = re.search(r'COMPANY CONFORMED NAME:\s*(.+?)\n', raw_text)
    if filer_match:
        company = filer_match.group(1).strip()
        # Also find what filing they're commenting on
        filing_ref = re.search(r'(?:Form\s+)?(10-K|10-Q|8-K|S-1|S-3|4)[/\s]*[A-Za-z]*(?:\s*(?:for|filed|dated|of)\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4}))?', raw_text)
        if filing_ref:
            form = filing_ref.group(1)
            date_str = filing_ref.group(2) if filing_ref.group(2) else ""
            return f"Form {form} - {company}" + (f" ({date_str})" if date_str else "")
        return f"SEC Comment - {company}"

    return "SEC Comment Letter"


def score_materiality(text: str) -> dict:
    """Score a filing's materiality based on SEC comment content analysis.

    Uses multiple signals:
    1. High-value keyword presence
    2. SEC question patterns (interrogative sentences)
    3. Letter length (substantive letters tend to be longer)
    4. Number of distinct topics questioned
    """
    text_lower = text.lower()
    score = 0
    matched_keywords = []
    level = "LOW"
    signals = []

    # High-value keywords
    for keyword in MATERIALITY_KEYWORDS["HIGH"]:
        if keyword.lower() in text_lower:
            score += 10
            matched_keywords.append(keyword)
            signals.append(f"HIGH_KEYWORD:{keyword}")

    # Medium-value keywords
    for keyword in MATERIALITY_KEYWORDS["MEDIUM"]:
        if keyword.lower() in text_lower:
            score += 5
            matched_keywords.append(keyword)
            signals.append(f"MEDIUM_KEYWORD:{keyword}")

    # Low-value keywords
    for keyword in MATERIALITY_KEYWORDS["LOW"]:
        if keyword.lower() in text_lower:
            score += 1
            matched_keywords.append(keyword)

    # SEC question patterns - "We note that..." "Please explain..." "We ask..."
    sec_question_patterns = [
        r'[Ww]e (?:note|question|ask|request|believe)',
        r'please (?:explain|clarify|advise|describe|confirm)',
        r'[Ww]e (?:do not|did not) understand',
        r'[P]rovide us with',
        r'[Ww]e (?:have|will) (?:review|continue to review)',
        r'[P]lease (?:tell|inform) us',
        r'[Cc]omment\s+(?:letter|no\.?\s*\d+)',
        r'[Ww]e (?:may|will) have (?:further|additional) comments',
    ]
    question_count = 0
    for pattern in sec_question_patterns:
        matches = re.findall(pattern, text)
        question_count += len(matches)
    if question_count > 0:
        score += min(question_count * 2, 10)
        signals.append(f"SEC_QUESTIONS:{question_count}")

    # Letter length signal - substantive letters are usually > 2000 chars
    if len(text) > 3000:
        score += 3
        signals.append("LONG_LETTER")
    elif len(text) > 1500:
        score += 1
        signals.append("MEDIUM_LETTER")

    # Multiple topics questioned (look for numbered comments: 1. 2. 3.)
    numbered_comments = re.findall(r'(?:^|\n)\s*\d+[\.\)]\s+', text)
    if len(numbered_comments) >= 3:
        score += 5
        signals.append(f"TOPICS:{len(numbered_comments)}")
    elif len(numbered_comments) >= 2:
        score += 2
        signals.append(f"TOPICS:{len(numbered_comments)}")

    # Determine level
    if score >= 15:
        level = "HIGH"
    elif score >= 5:
        level = "MEDIUM"

    return {
        'score': score,
        'level': level,
        'keywords': list(set(matched_keywords)),
        'signals': signals,
    }


def extract_referenced_filing(raw_text: str) -> str:
    """Extract what filing the SEC is commenting on (e.g., 'Form 10-K for FY2024')."""
    patterns = [
        r'(?:regarding|relating to|re:)\s*(?:the\s*)?(?:Company[\'s\s]+)?(?:Form\s+)?(10-K|10-Q|8-K|S-1|8-A|13F|4)[/\s]*[A-Za-z]*(?:\s*(?:for|filed|dated|of))?\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})?',
        r'(?:Form\s+)(10-K|10-Q|8-K|S-1)[/\s]*[A-Za-z]*(?:\s*(?:for|filed|dated))?\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})?',
    ]
    for pattern in patterns:
        match = re.search(pattern, raw_text, re.IGNORECASE)
        if match:
            form = match.group(1)
            date_str = match.group(2) if match.group(2) else ""
            return f"Form {form}" + (f" ({date_str})" if date_str else "")
    return "Unknown filing"


# ── State management ──────────────────────────────────────────────────────
def load_state():
    """Load the last-run state."""
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    return {'last_run': None, 'processed_accessions': []}


def save_state(state: dict):
    """Save the last-run state."""
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)


# ── Main logic ────────────────────────────────────────────────────────────
def run():
    """Main execution: fetch, analyze, and output report."""
    state = load_state()
    today = datetime.now()

    # Look back up to 3 days (covers weekends, holidays, index delays)
    lookback_days = 3
    all_new_filings = []
    processed = set(state.get('processed_accessions', []))
    errors = []

    for day_offset in range(lookback_days):
        check_date = today - timedelta(days=day_offset)
        index_text = fetch_daily_index(check_date)

        if index_text is None:
            errors.append(f"No index for {check_date.strftime('%Y-%m-%d')}")
            continue

        filings = parse_index_for_corresp(index_text)

        for filing in filings:
            # Derive accession number from file path
            # file_path: edgar/data/1529864/0001193125-25-335305.txt
            accession = filing['file_path'].split('/')[-1].replace('.txt', '')

            if accession not in processed:
                filing['accession'] = accession
                all_new_filings.append(filing)

    if not all_new_filings:
        report = {
            'timestamp': today.isoformat(),
            'status': 'no_new_filings',
            'message': f'No new SEC comment letters found in last {lookback_days} days.',
            'errors': errors,
            'filings': [],
        }
    else:
        # Download filings in parallel (I/O bound), then analyze
        max_to_analyze = min(len(all_new_filings), 25)
        download_errors = []
        downloaded = []

        def _download_one(filing):
            try:
                raw = fetch_filing_text(filing)
                if raw and len(raw) > 100:
                    return (filing, raw)
                return (filing, None)
            except Exception as e:
                return (filing, None)

        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {executor.submit(_download_one, f): f for f in all_new_filings[:max_to_analyze]}
            for future in as_completed(futures):
                filing, raw_text = future.result()
                if raw_text:
                    downloaded.append((filing, raw_text))
                else:
                    download_errors.append(f"Failed: {filing['company']} ({filing.get('accession', '?')})")

        # Analyze downloaded filings
        analyzed = []
        for filing, raw_text in downloaded:
            letter_text = extract_letter_content(raw_text)
            subject = extract_subject_line(raw_text)
            referenced_filing = extract_referenced_filing(raw_text)
            materiality = score_materiality(letter_text)

            analyzed.append({
                'company': filing['company'],
                'cik': filing['cik'],
                'form_type': filing['form_type'],
                'date': filing['date'],
                'subject': subject,
                'referenced_filing': referenced_filing,
                'materiality': materiality,
                'letter_preview': letter_text[:300],
                'edgar_url': f"https://www.sec.gov/{filing['file_path']}",
            })

        # Sort by materiality score descending
        analyzed.sort(key=lambda x: x['materiality']['score'], reverse=True)

        # Filter: only include MEDIUM and HIGH materiality
        significant = [f for f in analyzed if f['materiality']['level'] in ('HIGH', 'MEDIUM')]

        report = {
            'timestamp': today.isoformat(),
            'status': 'found',
            'total_new': len(all_new_filings),
            'significant_count': len(significant),
            'filings': significant,
            'all_filings_count': len(analyzed),
            'errors': errors + download_errors,
        }

        # Update state
        for filing in all_new_filings:
            accession = filing.get('accession', filing['file_path'].split('/')[-1].replace('.txt', ''))
            processed.add(accession)

    # Save state
    state['last_run'] = today.isoformat()
    state['processed_accessions'] = sorted(processed)[-500:]  # Keep last 500
    save_state(state)

    # Write report
    os.makedirs(REPORT_DIR, exist_ok=True)
    report_file = os.path.join(REPORT_DIR, f"sec_comments_{today.strftime('%Y%m%d')}.json")
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)

    # Output JSON for cron system
    print(json.dumps(report, indent=2))


def format_discord_report(report: dict) -> str:
    """Format the report as a Discord-friendly markdown message."""
    if report['status'] == 'no_new_filings':
        return f"📋 **SEC Comment Monitor** — No new comment letters found."

    lines = [f"📋 **SEC Comment Monitor** — {report.get('all_filings_count', 0)} filings scanned"]
    lines.append("")

    filings = report.get('filings', [])
    if not filings:
        lines.append("No material issues detected. All clear. ✅")
    else:
        for i, f in enumerate(filings[:10], 1):
            level = f['materiality']['level']
            emoji = "🔴" if level == "HIGH" else "🟡"
            company = f['company']
            subject = f.get('subject', 'Unknown')[:100]
            keywords = ', '.join(f['materiality'].get('keywords', [])[:5])
            url = f.get('edgar_url', '')

            lines.append(f"{emoji} **{i}. {company}**")
    return '\n'.join(lines)


if __name__ == '__main__':
    run()
