# Form 4 XML Parsing

## Structure

Form 4 filings use XML (not HTML). Key tags:

```xml
<issuerName>Company Name</issuerName>
<issuerTradingSymbol>TICKER</issuerTradingSymbol>

<reportingOwner>
  <rptOwnerName>John Doe</rptOwnerName>
  <rptOwnerRelationship>
    <isDirector>1</isDirector>
    <isOfficer>1</isOfficer>
    <isTenPercentOwner>1</isTenPercentOwner>
    <officerTitle>CEO</officerTitle>
  </rptOwnerRelationship>
</reportingOwner>

<nonDerivativeTable>
  <nonDerivativeTransaction>
    <securityTitle><value>Common Stock</value></securityTitle>
    <transactionDate><value>2026-06-25</value></transactionDate>
    <transactionShares><value>145000</value></transactionShares>
    <transactionPricePerShare><value>6.44</value></transactionPricePerShare>
    <transactionAcquiredDisposedCode><value>A</value></transactionAcquiredDisposedCode>
    <sharesOwnedFollowingTransaction><value>245000</value></sharesOwnedFollowingTransaction>
  </nonDerivativeTransaction>
</nonDerivativeTable>
```

## Parsing Pattern

```python
# Extract transactions
tx_blocks = re.findall(r'<nonDerivativeTransaction>(.*?)</nonDerivativeTransaction>', text, re.DOTALL)
for block in tx_blocks:
    shares = re.search(r'<transactionShares>\s*<value>([\d,]+)</value>', block)
    price = re.search(r'<transactionPricePerShare>\s*<value>([\d,.]+)</value>', block)
    action = re.search(r'<transactionAcquiredDisposedCode>\s*<value>([AD])</value>', block)
    date = re.search(r'<transactionDate>\s*<value>(\d{4}-\d{2}-\d{2})</value>', block)
```

## Key Signals

- `A` = Acquired (BUY), `D` = Disposed (SELL)
- `isOfficer=1` → CEO/CFO/COO/President (highest signal)
- `isDirector=1` → Board member
- `isTenPercentOwner=1` → Major shareholder
- Large transactions (>100K shares) = high conviction
- Multiple transactions in one filing = conviction
