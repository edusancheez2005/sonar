# 🚀 QUICK TEST GUIDE - ORCA AI IMPROVEMENTS

## ⚡ **TL;DR**

**What Changed**: ORCA now ALWAYS fetches fresh news from 2 sources, recognizes PEPE, and responds conversationally to greetings.

**Test URL**: http://localhost:3000/ai-advisor

---

## 🧪 **3 QUICK TESTS**

### **1. SHIB** (Should show lots of news)
```
what about Shiba Inu? should I buy?
```
✅ Check: Multiple news articles with clickable links

---

### **2. PEPE** (Should work without error)
```
what about Pepe coin?
```
✅ Check: Full analysis (no "ticker not found" error)

---

### **3. Greeting** (Should respond nicely)
```
hi?
```
✅ Check: Friendly response (no error)

---

## 🔍 **Terminal Check**

Look for these logs:
```
📡 Fetching fresh news for SHIB from LunarCrush AI...
📡 Fetching backup news for SHIB from CryptoPanic...
✅ Found X total articles for SHIB
```

---

## ✅ **Success = All 3 tests pass!**

If any fail, check:
- `.env.local` has API keys (LUNARCRUSH, CRYPTOPANIC, OPENAI)
- Dev server is running (`npm run next:dev`)
- No errors in terminal

---

**Full Details**: See `ORCA_IMPROVEMENTS_COMPLETE.md`

