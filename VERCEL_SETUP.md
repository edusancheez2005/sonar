# Vercel Deployment Setup Guide

## ⚠️ IMPORTANT: Environment Variables

You need to add ALL your environment variables to Vercel for the app to work in production.

### How to Add Environment Variables to Vercel:

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your `sonar` project
3. Click **Settings** → **Environment Variables**
4. Add each variable below (one at a time):

### Required Environment Variables:

⚠️ **Get your actual values from your local `.env.local` file**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE=your_supabase_service_role_key

# Stripe (LIVE MODE)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_0fEeniMI7yO2sygzRFx830Y5sjyDWOy6
STRIPE_PRICE_ID=your_stripe_price_id

# News APIs
CRYPTOPANIC_API_KEY=your_cryptopanic_api_key
NEWS_API_KEY=your_news_api_key
COINGECKO_API_KEY=your_coingecko_api_key
```

**To get your values:**
1. Open your local `.env.local` file
2. Copy each value from there to Vercel

### Important Notes:

1. **For each variable**, set the environment to:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

2. **After adding all variables**, click **"Redeploy"** in the Deployments tab

## Setting Up Stripe Webhook for Production

### Step 1: Get Your Vercel Production URL
Your production URL will be something like: `https://sonar-yourusername.vercel.app`

### Step 2: Create Webhook in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Enter your endpoint URL:
   ```
   https://YOUR-VERCEL-URL.vercel.app/api/stripe/webhook
   ```
4. Select events to listen to:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
5. Click **"Add endpoint"**

### Step 3: Get Webhook Secret

1. Click on your newly created webhook
2. Click **"Reveal"** under **Signing secret**
3. Copy the secret (starts with `whsec_...`)
4. Add it to Vercel as `STRIPE_WEBHOOK_SECRET`

### Step 4: Redeploy

Go to Vercel → Deployments → Click "..." → **Redeploy** (with "Use existing Build Cache" unchecked)

## Testing Your Deployment

1. Visit your production URL
2. Try to sign up with a new account
3. Try to subscribe to premium
4. Check if the dashboard shows the premium overlay correctly

## Troubleshooting

### If you see errors about missing environment variables:
- Double-check all variables are added to Vercel
- Make sure they're enabled for Production, Preview, and Development
- Redeploy after adding them

### If Stripe checkout doesn't work:
- Verify `STRIPE_PRICE_ID` matches your live price ID
- Check webhook is configured correctly
- Test with Stripe's test card: 4242 4242 4242 4242

### If signup fails:
- Check Supabase authentication settings
- Verify email confirmation is disabled (per your setup)

## Security Note

⚠️ **NEVER commit `.env.local` to git!**

Your `.gitignore` already includes `.env*`, so this won't happen again as long as you don't force-add it.

## Git Push

To push your changes, you'll need to enter your SSH key passphrase when prompted, or you can set up SSH agent:

```bash
# Start SSH agent
eval "$(ssh-agent -s)"

# Add your key
ssh-add ~/.ssh/id_rsa

# Now push
git push
```

Alternatively, you can just let Vercel auto-deploy from GitHub once you push successfully.

