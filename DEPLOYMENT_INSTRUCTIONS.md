# 🚀 Quick Deployment Instructions

## Step 1: Deploy Supabase Schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase_whale_alerts_table.sql`
5. Paste into the SQL editor
6. Click **Run** to execute

This will create:
- `whale_alerts` table (stores whale transactions)
- `user_whale_alert_preferences` table (stores user alert settings)
- All necessary indexes and RLS policies

## Step 2: Verify Environment Variables

Make sure these are set in your Vercel project:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret
NEXT_PUBLIC_STRIPE_PRICE_ID=your_price_id
```

## Step 3: Push to Production

```bash
# Already committed, just push
git push origin main
```

Vercel will automatically:
- Deploy the new code
- Set up the cron job for whale alerts sync (every 10 minutes)
- Make all premium features live

## Step 4: Test the Implementation

### Test Free User Experience
1. Open your site in incognito mode (not logged in or with free account)
2. Try to access Orca AI → Should see blurred interface with upgrade modal
3. Go to Statistics → CSV export button should show lock icon
4. Check Dashboard → Should only see Market Pulse, Inflows, Outflows

### Test Premium User Experience
1. Subscribe to Pro ($7.99/month) or manually set `plan = 'premium'` in profiles table
2. Access Orca AI → Should work fully
3. Export CSV → Should work without restrictions
4. Check Dashboard → Should see all advanced analytics

### Test Whale Alerts Sync
```bash
# Check if cron job is running
# Go to Vercel Dashboard → Your Project → Cron Jobs
# Should see: /api/whale-alerts/sync running every 10 minutes

# Manual test (optional)
curl https://your-domain.vercel.app/api/whale-alerts/sync

# Check database
# Go to Supabase → Table Editor → whale_alerts
# Should see transactions appearing after 10-20 minutes
```

## Step 5: Monitor

- **Vercel Logs**: Check for any errors in cron job execution
- **Supabase**: Monitor `whale_alerts` table for new data
- **Whale Alert API**: Verify transactions are being fetched

## 🔑 Important Info

**Whale Alert API Key:** `ioqSOvTlUjNwbpoK2MFXUxg7LuS1nJaL`
- Already hardcoded in `/app/api/whale-alerts/sync/route.js`
- Tracks transactions $500k+ USD
- Syncs every 10 minutes

**Premium Features:**
- Orca AI 2.0 (full access)
- Advanced dashboard analytics
- CSV data export
- Whale alerts (coming soon - UI component needed)
- Priority support

**Free Features:**
- News & Market Updates
- Market Pulse Dashboard
- Top Net Inflows/Outflows
- Basic statistics

## 📋 Troubleshooting

### Cron job not running?
- Check Vercel Dashboard → Cron Jobs
- Verify `vercel.json` is deployed
- Check function logs for errors

### Whale alerts not appearing?
- Check Supabase table `whale_alerts`
- Verify API key is correct
- Check Vercel function logs for sync errors

### Premium features not working?
- Verify user has `plan = 'premium'` in profiles table
- Check Stripe webhook is working
- Verify subscription status in user_subscriptions table

## ✅ Done!

Your premium features are now live! 🎉

For detailed information, see `PREMIUM_FEATURES_IMPLEMENTATION.md`
