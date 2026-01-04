#!/bin/bash

echo "🔄 Restarting ORCA AI with news fixes..."
echo ""

cd /Users/edusanchez/Desktop/sonar

# Kill existing server
echo "⏹️  Stopping existing server..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 2

# Clear build cache
echo "🧹 Clearing build cache..."
rm -rf .next

# Start server
echo "🚀 Starting dev server..."
npm run next:dev &

# Wait for server to start
echo ""
echo "⏳ Waiting for server to start..."
sleep 5

echo ""
echo "✅ Server should be running!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 TEST NOW:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Visit: http://localhost:3000/ai-advisor"
echo "2. Log in with: edusanchez@gmail.com"
echo "3. Ask: 'what about Solana? should I invest?'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 CHECK TERMINAL FOR:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Saved X/X fresh articles (NOT 0/X)"
echo "✅ Found 20+ total articles"
echo "✅ No timeout errors"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 CHECK BROWSER FOR:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Multiple news articles with real titles"
echo "✅ Clickable news links"
echo "✅ Distance from ATH mentioned"
echo ""
echo "🐋 Let's gooo!"

