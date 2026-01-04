# 🔧 PHASE 2 TROUBLESHOOTING GUIDE

**Updated**: January 3, 2026

---

## ✅ **ISSUES FIXED**

### **Issue 1: "supabaseKey is required"** ✅ FIXED
**Error**: `Error: supabaseKey is required.`

**Cause**: Missing `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variable

**Solution**:
```bash
# Added to .env.local:
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_jwt_token_here
```

**Action**: ✅ Variable added to `.env.local`

---

### **Issue 2: "Cannot read properties of undefined (reading 'clientModules')"** ✅ FIXED

**Error**: 
```
TypeError: Cannot read properties of undefined (reading 'clientModules')
```

**Cause**: Next.js build cache corruption after adding new files

**Solution**: Clear `.next` cache and rebuild
```bash
rm -rf .next
# Then restart dev server
```

**Action**: ✅ Cache cleared

---

## 🔄 **REQUIRED: RESTART DEV SERVER**

After fixing both issues, you MUST restart the dev server:

### **Step 1: Stop Dev Server**
In the terminal where `npm run next:dev` is running:
```
Press Ctrl+C
```

### **Step 2: Start Dev Server**
```bash
npm run next:dev
```

### **Step 3: Wait for "Ready"**
You should see:
```
✓ Compiled in XXXms
○ Local:        http://localhost:3000
✓ Ready in XXXs
```

### **Step 4: Refresh Browser**
```
Visit: http://localhost:3000/chat
Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

---

## ✅ **VERIFICATION CHECKLIST**

After restart, verify:

- [ ] No "supabaseKey is required" error
- [ ] No "clientModules" error  
- [ ] Chat page loads cleanly
- [ ] Welcome message with 🐋 visible
- [ ] Input field is present
- [ ] No console errors (F12 → Console tab)

---

## 🧪 **TEST AFTER RESTART**

### **Test 1: Page Load**
```
Visit: http://localhost:3000/chat
```

**Expected**:
- ✅ Page loads without errors
- ✅ "ORCA AI 2.0" header visible
- ✅ Welcome message with whale emoji
- ✅ Input field at bottom
- ✅ Quota display (if logged in)

---

### **Test 2: Ask Question**
```
Message: "What's happening with Bitcoin?"
```

**Expected**:
- ✅ Loading spinner appears
- ✅ "ORCA is analyzing..." message
- ✅ Response appears in 5-10 seconds
- ✅ 5 cards display below:
  - 🐋 Whale Activity
  - 📊 Sentiment
  - 🌙 Social Intelligence
  - 💰 Price
  - 📰 News
- ✅ Quota updates (1/5 or 1/2)

---

## 🐛 **IF STILL HAVING ISSUES**

### **Issue: Still see "supabaseKey is required"**

**Check**:
```bash
# Verify env variable exists
cat .env.local | grep NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Should show**:
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_jwt_token_here
```

**If missing**: Run this command:
```bash
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_jwt_token_here >> .env.local
```

Then restart dev server again.

---

### **Issue: Still see "clientModules" error**

**Solution 1**: Clear cache more thoroughly
```bash
rm -rf .next
rm -rf node_modules/.cache
npm run next:dev
```

**Solution 2**: Check for TypeScript errors
```bash
npm run build
```

If you see TypeScript errors, fix them first.

---

### **Issue: "Unauthorized - please log in"**

**This is expected!** You need to be logged in to use the chat.

**Solution**:
1. Visit: http://localhost:3000/auth/signin
2. Log in with your account
3. Return to: http://localhost:3000/chat

---

### **Issue: Rate limit error immediately**

**Check**: Did you already ask questions today?

**Solution**: Reset quota in Supabase
```sql
-- In Supabase SQL Editor
DELETE FROM user_quotas WHERE date = CURRENT_DATE;
```

Or wait until tomorrow (00:00 GMT).

---

### **Issue: "Ticker not found"**

**This is expected** if you don't mention a specific cryptocurrency.

**Try these instead**:
- "What's happening with Bitcoin?"
- "Tell me about ETH"
- "Analyze SOL"
- "How is ethereum doing?"

---

### **Issue: No response from ORCA**

**Check console logs**:
1. Open browser console (F12)
2. Look for errors
3. Check Network tab for failed API calls

**Check server logs**:
1. Look at terminal where dev server is running
2. Should see: `📊 Analyzing ${TICKER} for user ${USER_ID}...`
3. Should see: `✅ Response generated...`

**If you see errors**: Copy and share them.

---

## 📋 **ENVIRONMENT VARIABLES CHECKLIST**

Required in `.env.local`:

**Frontend (NEXT_PUBLIC_)**:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` ← CRITICAL

**Backend (no prefix)**:
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `LUNARCRUSH_API_KEY`
- [ ] `COINGECKO_API_KEY`
- [ ] `CRYPTOPANIC_API_TOKEN`
- [ ] `CRON_SECRET`

---

## 🎯 **FINAL CHECKLIST BEFORE ASKING FOR HELP**

If still having issues, verify:

- [ ] Dev server restarted after .env.local changes
- [ ] `.next` cache cleared
- [ ] Browser hard refreshed (Cmd+Shift+R)
- [ ] Logged in to Supabase (for chat to work)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Environment variables present (check `.env.local`)

**If all checked and still not working**: Share:
1. The exact error message
2. Browser console output (F12)
3. Server terminal output
4. Which step failed

---

## ✅ **EXPECTED WORKING STATE**

When everything is working correctly:

**Browser**:
- Chat page loads
- No console errors
- Can send messages
- ORCA responds
- Cards display

**Server Logs**:
```
📊 Analyzing BTC for user abc123...
✅ Using cached news for BTC (15 articles)
✅ Response generated for BTC in 8431ms
```

**Response Quality**:
- Mentions whale activity
- References sentiment scores
- Cites social intelligence
- Includes disclaimer

---

**Status**: Both issues identified and fixed. Restart required.

**After restart**: Everything should work! 🚀

