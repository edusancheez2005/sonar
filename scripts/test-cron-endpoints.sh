#!/bin/bash

# ==========================================
# Phase 1 Cron Endpoints Test Script
# ==========================================
# Tests all 4 cron endpoints locally
# Usage: ./scripts/test-cron-endpoints.sh
# ==========================================

CRON_SECRET="dffe68424286373c3fd6fd52222701058c21e6b12921506c164d515776e2768b"
BASE_URL="http://localhost:3000"

echo "🧪 Testing Phase 1 Cron Endpoints"
echo "=================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
  local name=$1
  local path=$2
  
  echo -e "${YELLOW}Testing: ${name}${NC}"
  echo "Endpoint: ${BASE_URL}${path}"
  echo ""
  
  response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${path}" \
    -H "Authorization: Bearer ${CRON_SECRET}")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✅ SUCCESS (HTTP ${http_code})${NC}"
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}❌ FAILED (HTTP ${http_code})${NC}"
    echo "Response:"
    echo "$body"
  fi
  
  echo ""
  echo "---"
  echo ""
}

# Test unauthorized request
echo -e "${YELLOW}Test 0: Unauthorized Request (should fail)${NC}"
echo "Endpoint: ${BASE_URL}/api/cron/ingest-news"
echo ""

response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/cron/ingest-news")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" -eq 401 ]; then
  echo -e "${GREEN}✅ Correctly rejected unauthorized request${NC}"
else
  echo -e "${RED}⚠️  Warning: Should have returned 401, got ${http_code}${NC}"
fi

echo ""
echo "---"
echo ""

# Test all cron endpoints
test_endpoint "1️⃣  News Ingestion" "/api/cron/ingest-news"
test_endpoint "2️⃣  Sentiment Analysis" "/api/cron/analyze-sentiment"
test_endpoint "3️⃣  Sentiment Aggregation" "/api/cron/aggregate-sentiment"
test_endpoint "4️⃣  Price Snapshots" "/api/cron/fetch-prices"

echo "=================================="
echo "✅ All tests complete!"
echo ""
echo "Next steps:"
echo "1. Check Supabase dashboard to verify data was inserted"
echo "2. Run SQL queries from PHASE_1_SETUP_GUIDE.md to verify data"
echo "3. Deploy to Vercel and verify cron jobs run on schedule"
echo ""

