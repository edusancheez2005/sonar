#!/bin/bash

echo "🔥 FINAL NEWS FIX - Populating Database & Testing"
echo "=================================================="
echo ""

cd /Users/edusanchez/Desktop/sonar

# Step 1: Populate database
echo "📊 Step 1/3: Populating database with news..."
echo ""
node scripts/manual-news-ingest.js

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 2: Kill old server
echo "⏹️  Step 2/3: Restarting server..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 2

# Clear build cache
rm -rf .next

# Start server
npm run next:dev &

# Wait for server
echo ""
echo "⏳ Waiting for server to start..."
sleep 5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ READY TO TEST!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 Step 3/3: TEST NOW:"
echo ""
echo "1. Visit: http://localhost:3000/ai-advisor"
echo "2. Log in: edusanchez@gmail.com"
echo "3. Ask: 'Should I invest in SOL?'"
echo ""
echo "📋 EXPECTED IN TERMINAL:"
echo "  ✅ Found X total articles for SOL (X > 0)"
echo "  ✅ No 404 errors"
echo ""
echo "📋 EXPECTED IN BROWSER:"
echo "  ✅ Multiple news articles"
echo "  ✅ Real titles (not 'Untitled')"
echo "  ✅ Clickable links"
echo ""
echo "🐋 Let's gooo!"

