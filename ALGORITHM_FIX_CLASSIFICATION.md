# 🚨 URGENT: Fix BUY/SELL Classification in Backend Algorithm

## Executive Summary

**Problem:** The `classification` field in the `whale_transactions` table is frequently incorrect, causing whales to appear as having 100% BUY or 100% SELL activity when they actually have mixed trading patterns.

**Impact:** 
- Dashboard shows incorrect whale behavior
- Token sentiment analysis is skewed
- User trust is eroded when data appears obviously wrong
- Frontend has been patched with a workaround, but the root cause needs fixing

**Solution:** Backend algorithm must correctly determine if a transaction is a BUY or SELL from the **whale's perspective** based on token flow direction.

---

## Root Cause Analysis

### Current Broken Behavior

The diagnostic script revealed:

```
Classification Distribution (Last 24h):
  TRANSFER: 173 (43.4%)  ← Not trades
  SELL: 114 (28.6%)
  BUY: 89 (22.3%)
  DEFI: 23 (5.8%)        ← Not trades

Whale Address Position Analysis:
  whale_address = from_address: 76%
  whale_address = to_address: 24%
```

**The Problem:**
- When `whale_address = from_address` (76% of cases), the whale is **SENDING tokens** = should be **SELL**
- When `whale_address = to_address` (24% of cases), the whale is **RECEIVING tokens** = should be **BUY**
- But the stored `classification` field doesn't reflect this correctly

**Real-World Example:**
- Whale `0xc1c4a5c4...58f5d481` had 20 transactions
- Stored classifications: **0 BUYs, 16 SELLs, 4 Other**
- Result: Whale page shows "100% SELL" which looks suspicious to users

---

## How Classification SHOULD Work

### The Golden Rule: Follow the Token Flow

```
Token Transfer: from_address → to_address

IF whale_address = to_address:
  → Whale is RECEIVING tokens
  → classification = 'BUY'

ELSE IF whale_address = from_address:
  → Whale is SENDING tokens
  → classification = 'SELL'

ELSE:
  → Whale is not directly involved in token transfer
  → classification = 'TRANSFER' or 'DEFI' (not a trade)
```

### Critical Rules

1. **Ignore money flow, follow TOKEN flow**
   - In a BUY: whale receives tokens, sends money (ETH/USDC/etc)
   - In a SELL: whale sends tokens, receives money
   - Classification should be based on the TOKEN movement

2. **Respect the whale's perspective**
   - Don't classify from the CEX's perspective
   - Don't classify from the blockchain's perspective
   - Always ask: "Is the WHALE receiving or sending tokens?"

3. **Only classify real trades**
   - `BUY` = Whale receiving tokens from CEX/DEX
   - `SELL` = Whale sending tokens to CEX/DEX
   - `TRANSFER` = Whale moving tokens between own wallets
   - `DEFI` = Whale interacting with DeFi protocols (staking, LP, etc)

---

## Required Algorithm Changes

### 1. Fix the Classification Logic

**Current (Broken) Logic:**
```python
# WRONG: This might be classifying from CEX perspective or using wrong logic
if some_condition:
    classification = 'BUY'
else:
    classification = 'SELL'
```

**Correct Logic:**
```python
def classify_transaction(tx):
    """
    Classify a transaction from the whale's perspective
    
    Args:
        tx: Transaction with from_address, to_address, whale_address
    
    Returns:
        classification: 'BUY', 'SELL', 'TRANSFER', or 'DEFI'
    """
    
    # Normalize addresses
    whale_addr = tx['whale_address'].lower() if tx.get('whale_address') else None
    from_addr = tx['from_address'].lower() if tx.get('from_address') else None
    to_addr = tx['to_address'].lower() if tx.get('to_address') else None
    counterparty_type = tx.get('counterparty_type', '')
    
    if not whale_addr:
        return 'UNKNOWN'
    
    # Check if this is a real trade (involves CEX or DEX)
    is_trade = counterparty_type in ['CEX', 'DEX']
    
    # Determine token flow direction
    if whale_addr == to_addr:
        # Whale is RECEIVING tokens
        return 'BUY' if is_trade else 'TRANSFER'
    
    elif whale_addr == from_addr:
        # Whale is SENDING tokens
        return 'SELL' if is_trade else 'TRANSFER'
    
    else:
        # Whale address doesn't match from/to
        # This might be a DeFi interaction or complex transaction
        return 'DEFI'
```

### 2. Validate Against These Test Cases

Run these queries after implementing the fix to verify correctness:

```sql
-- Test 1: Check if whales now have mixed BUY/SELL ratios
SELECT 
    whale_address,
    COUNT(*) FILTER (WHERE classification = 'BUY') as buy_count,
    COUNT(*) FILTER (WHERE classification = 'SELL') as sell_count,
    ROUND(
        COUNT(*) FILTER (WHERE classification = 'BUY')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE classification IN ('BUY', 'SELL')), 0) * 100
    ) as buy_percentage
FROM whale_transactions
WHERE timestamp >= NOW() - INTERVAL '7 days'
    AND whale_address IS NOT NULL
    AND counterparty_type IN ('CEX', 'DEX')
GROUP BY whale_address
HAVING COUNT(*) FILTER (WHERE classification IN ('BUY', 'SELL')) >= 5
ORDER BY COUNT(*) DESC
LIMIT 20;

-- Expected: Most whales should have buy_percentage between 20% and 80%
-- WARNING: If you see many whales with 0% or 100%, classification is still broken
```

```sql
-- Test 2: Verify whale_address position matches classification
SELECT 
    CASE 
        WHEN whale_address = from_address THEN 'whale_is_from'
        WHEN whale_address = to_address THEN 'whale_is_to'
        ELSE 'whale_is_neither'
    END as whale_position,
    classification,
    COUNT(*) as count
FROM whale_transactions
WHERE timestamp >= NOW() - INTERVAL '24 hours'
    AND whale_address IS NOT NULL
    AND classification IN ('BUY', 'SELL')
GROUP BY whale_position, classification
ORDER BY whale_position, classification;

-- Expected Results:
-- whale_is_from  | SELL | ~76%  ✓ (from = sending = sell)
-- whale_is_to    | BUY  | ~24%  ✓ (to = receiving = buy)
-- 
-- WRONG if you see:
-- whale_is_from  | BUY  | any%  ✗ (impossible!)
-- whale_is_to    | SELL | any%  ✗ (impossible!)
```

---

## Backward Compatibility

### Option 1: Reprocess Historical Data (Recommended)

Update all existing records with correct classifications:

```sql
-- Backup first!
CREATE TABLE whale_transactions_backup AS 
SELECT * FROM whale_transactions;

-- Fix BUYs: whale_address = to_address AND involves CEX/DEX
UPDATE whale_transactions
SET classification = 'BUY'
WHERE whale_address IS NOT NULL
    AND whale_address = to_address
    AND counterparty_type IN ('CEX', 'DEX')
    AND classification != 'BUY';

-- Fix SELLs: whale_address = from_address AND involves CEX/DEX
UPDATE whale_transactions
SET classification = 'SELL'
WHERE whale_address IS NOT NULL
    AND whale_address = from_address
    AND counterparty_type IN ('CEX', 'DEX')
    AND classification != 'SELL';

-- Fix TRANSFERs: whale is from/to but not CEX/DEX
UPDATE whale_transactions
SET classification = 'TRANSFER'
WHERE whale_address IS NOT NULL
    AND (whale_address = from_address OR whale_address = to_address)
    AND (counterparty_type NOT IN ('CEX', 'DEX') OR counterparty_type IS NULL)
    AND classification NOT IN ('TRANSFER', 'DEFI');
```

### Option 2: Only Fix New Records

If reprocessing is too expensive, ensure all **NEW** transactions use the correct logic going forward. The frontend workaround will handle old records.

---

## Frontend Workaround (Already Implemented)

While you fix the backend, we've implemented a client-side workaround in `/app/whale/[address]/page.jsx`:

```javascript
// Frontend ignores stored classification and re-computes from token flow
for (const tx of transactions) {
  const whaleAddr = tx.whale_address.toLowerCase();
  const fromAddr = tx.from_address.toLowerCase();
  const toAddr = tx.to_address.toLowerCase();
  
  // Re-classify based on token flow
  if (whaleAddr === toAddr) {
    tx.classification = 'BUY';  // Whale receiving tokens
  } else if (whaleAddr === fromAddr) {
    tx.classification = 'SELL'; // Whale sending tokens
  }
}
```

**This is a temporary fix.** The backend MUST be corrected for:
1. Dashboard statistics accuracy
2. Token sentiment analysis accuracy
3. API consumers expecting correct data
4. Database integrity

---

## Verification Steps

After implementing the fix:

1. **Run Test Script:**
   ```bash
   cd /path/to/sonar
   node scripts/test-whale-fix.js
   ```
   
   Expected output: Most active whales should show mixed BUY/SELL ratios (e.g., 65%/35%, 40%/60%)

2. **Check Dashboard:**
   - Visit: https://sonartracker.io/dashboard
   - "Top Net Inflows" and "Top Net Outflows" should show different tokens
   - Whale activity should show realistic trading patterns

3. **Check Individual Whale Pages:**
   - Visit: https://sonartracker.io/whale/[address]
   - Most active whales should show both BUYs and SELLs
   - Net flow should be positive (accumulation) or negative (distribution), not always zero

4. **Check Token Sentiment:**
   - Visit: https://sonartracker.io/token/ETH
   - Sentiment should be realistic (not always 100% bullish or 100% bearish)

---

## Priority: HIGH

**Why This Matters:**
- ❌ Users report "this data looks wrong" → lose trust → churn
- ❌ Sentiment analysis is broken → wrong trading signals → users lose money → legal risk
- ❌ Dashboard shows nonsensical data → looks unprofessional
- ✅ Correct data → accurate signals → happy users → retention → revenue

**Timeline:**
- Implement fix: **ASAP (within 1-2 days)**
- Test on staging: **same day as implementation**
- Deploy to production: **next day after successful testing**
- Reprocess historical data: **within 1 week** (if Option 1 chosen)

---

## Questions?

Contact the frontend team if you need:
- Sample whale addresses for testing
- Access to diagnostic scripts
- Clarification on expected behavior
- Help with verification queries

---

## Appendix: Diagnostic Script Output

```
🔍 WHALE DATA QUALITY DIAGNOSTIC
================================================================================

📊 TEST 1: Overall Transaction Stats (Last 24h)
--------------------------------------------------------------------------------
Total Transactions: 399
With whale_address: 399 (100.0%)
Without whale_address: 0 (0.0%)

📊 TEST 2: Classification Distribution
--------------------------------------------------------------------------------
TRANSFER: 173 (43.4%)
SELL: 114 (28.6%)
BUY: 89 (22.3%)
DEFI: 23 (5.8%)

📊 TEST 3: Whale Address vs Classification (Bias Check)
--------------------------------------------------------------------------------
When whale_address IS populated:
  TRANSFER: 173 (43.4%)
  SELL: 114 (28.6%)
  BUY: 89 (22.3%)
  DEFI: 23 (5.8%)

📊 TEST 4: Sample Whale Analysis
--------------------------------------------------------------------------------
Analyzing whale: 0xc1c4a5c4...58f5d481
Found 20 transactions

[1] SELL | whale_addr | LPT | $24,678
[2] SELL | whale_addr | SLP | $17,296
[3] SELL | whale_addr | AUDIO | $35,937
[4] SELL | whale_addr | POND | $31,655
[5] SELL | whale_addr | AUDIO | $58,204
[6] SELL | whale_addr | API3 | $92,175
[7] SELL | whale_addr | ALPHA | $96,622
[8] SELL | to | ALPHA | $61,460
[9] SELL | whale_addr | ALPHA | $61,460
[10] TRANSFER | to | ALPHA | $96,622

BUY: 0, SELL: 16, Other: 4
Buy/Sell Ratio: 0/16  ← THIS IS THE PROBLEM

📊 TEST 5: Whale Address Position Analysis
--------------------------------------------------------------------------------
When whale_address is populated:
  whale_address = from_address: 76 (76.0%)  ← Whale is SENDING (should be SELL)
  whale_address = to_address: 24 (24.0%)    ← Whale is RECEIVING (should be BUY)
  whale_address = neither: 0 (0.0%)
```

---

**Document Version:** 1.0  
**Date:** November 16, 2025  
**Author:** Frontend Team  
**Status:** Awaiting Backend Implementation

