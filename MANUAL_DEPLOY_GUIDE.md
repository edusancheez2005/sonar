# 🚀 MANUAL DEPLOYMENT GUIDE

**Status**: ✅ Code committed, ready to push!

---

## ✅ **ALREADY DONE**

- ✅ All code changes staged
- ✅ Committed with message: "feat: ORCA AI Phase 2 complete"
- ✅ 81 files changed, 22,227 lines added
- ⏳ **Ready to push!**

---

## 🔐 **SSH KEY ISSUE**

You need to push manually because SSH authentication is needed.

---

## 🚀 **DEPLOY NOW - 2 OPTIONS**

### **Option 1: Push via GitHub Desktop** (Easiest)
1. Open GitHub Desktop app
2. You'll see "Push to origin" button
3. Click it
4. Done! Vercel will auto-deploy

---

### **Option 2: Push via Terminal** (If you have SSH set up)
```bash
cd /Users/edusanchez/Desktop/sonar
git push origin main
```

If SSH fails, set up SSH key:
```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "edusanchez@gmail.com"

# Add to ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copy public key
cat ~/.ssh/id_ed25519.pub

# Add to GitHub:
# 1. Go to github.com → Settings → SSH and GPG keys
# 2. Click "New SSH key"
# 3. Paste the key
# 4. Save

# Then push:
git push origin main
```

---

### **Option 3: Use HTTPS Instead**
```bash
cd /Users/edusanchez/Desktop/sonar

# Change to HTTPS
git remote set-url origin https://github.com/edusancheez2005/sonar.git

# Push (will ask for GitHub username & personal access token)
git push origin main
```

---

## ⏱️ **AFTER PUSHING**

### **Vercel Auto-Deploys** (3-5 minutes):
1. Go to https://vercel.com/dashboard
2. Click your "sonar" project
3. Go to "Deployments" tab
4. Watch the build progress
5. Wait for "Ready" status

### **Then Test**:
1. Visit https://sonartracker.io/ai-advisor
2. Log in with edusanchez@gmail.com
3. Ask: "Should I invest in Bitcoin?"
4. Verify everything works!

---

## 🎯 **WHAT WILL DEPLOY**

### **Code**:
- 81 files changed
- 22,227 lines of code added
- All ORCA Phase 2 features

### **Features Going Live**:
- ✅ ORCA AI chatbot
- ✅ 140+ cryptocurrencies
- ✅ Multi-source news (20-30 articles per coin)
- ✅ Enhanced analysis (themes, short/long-term, global context)
- ✅ Whale data (ERC-20 tokens)
- ✅ Conversation context
- ✅ Rate limiting
- ✅ Automated cron jobs

### **Cron Jobs** (Auto-Start):
- News ingestion: Every 12 hours
- Sentiment analysis: Every 12 hours
- Sentiment aggregation: Every hour
- Price snapshots: Every 15 minutes

---

## 📊 **VERCEL ENVIRONMENT VARIABLES**

**Make sure these are set in Vercel dashboard**:

```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

OPENAI_API_KEY=your_openai_key

LUNARCRUSH_API_KEY=your_lunarcrush_key
CRYPTOPANIC_API_TOKEN=your_cryptopanic_token
COINGECKO_API_KEY=your_coingecko_key

CRON_SECRET=your_cron_secret

RESEND_API_KEY=your_resend_key

STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

**To check**:
1. Go to Vercel dashboard
2. Click your project
3. Go to "Settings" → "Environment Variables"
4. Verify all keys are present

---

## 🚀 **PUSH NOW!**

**Use whichever method works for you**:
- GitHub Desktop → Click "Push"
- Terminal → `git push origin main`
- VS Code → Click "Sync Changes"

**Then watch Vercel deploy!** 🎉

---

## ✅ **POST-DEPLOY**

After deployment completes:

### **1. Test Production**:
- Visit https://sonartracker.io/ai-advisor
- Test with: "Should I invest in Bitcoin?"
- Verify all features work

### **2. Monitor Cron Jobs**:
- Vercel → Logs → Filter "cron"
- First news ingestion at next 12h mark
- First price snapshot within 15 min

### **3. Check Database**:
- Supabase dashboard
- `news_items` table should start filling up
- `price_snapshots` should update every 15min

---

## 🎉 **YOU'RE READY!**

**Commit**: ✅ Done  
**Push**: ⏳ Use GitHub Desktop or terminal  
**Deploy**: ⏳ Vercel auto-deploys after push  
**Cron Jobs**: ⏳ Auto-start on Vercel  

---

**🚀 Push now and watch ORCA go live!** 🐋

