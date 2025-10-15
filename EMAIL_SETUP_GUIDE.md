# Email Configuration Guide - Supabase Auth

## Problem
Users can't sign up because email verification emails aren't being sent.

## Solution
Configure Supabase to send emails properly using SMTP.

---

## Quick Setup (Choose One)

### **Option 1: Gmail SMTP (Easiest for Testing)**

1. **Enable 2FA on your Gmail account:**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Create App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "Sonar Tracker"
   - Click "Generate"
   - **Copy the 16-character password**

3. **Configure in Supabase:**
   - Go to: https://supabase.com/dashboard/project/fwbwfvqzomipoftgodof/settings/auth
   - Scroll to "SMTP Settings"
   - **Enable Custom SMTP:** Toggle ON
   - **Sender email:** `your-gmail@gmail.com`
   - **Sender name:** `Sonar Tracker`
   - **Host:** `smtp.gmail.com`
   - **Port:** `587`
   - **Username:** `your-gmail@gmail.com`
   - **Password:** [paste app password from step 2]
   - Click **Save**

---

### **Option 2: SendGrid (Best for Production - FREE 100 emails/day)**

1. **Sign up for SendGrid:**
   - Go to: https://signup.sendgrid.com/
   - Sign up for FREE account

2. **Create API Key:**
   - After login, go to: Settings → API Keys
   - Click "Create API Key"
   - Name: "Sonar Tracker"
   - Permissions: Full Access
   - Click "Create & View"
   - **Copy the API key** (starts with `SG.`)

3. **Verify Sender Identity:**
   - Go to: Settings → Sender Authentication
   - Click "Verify a Single Sender"
   - Fill in:
     - From Name: `Sonar Tracker`
     - From Email: `noreply@sonartracker.io` (or your email)
     - Reply To: `support@sonartracker.io`
   - Check your email and click verification link

4. **Configure in Supabase:**
   - Go to: https://supabase.com/dashboard/project/fwbwfvqzomipoftgodof/settings/auth
   - Scroll to "SMTP Settings"
   - **Enable Custom SMTP:** Toggle ON
   - **Sender email:** `noreply@sonartracker.io` (verified email)
   - **Sender name:** `Sonar Tracker`
   - **Host:** `smtp.sendgrid.net`
   - **Port:** `587`
   - **Username:** `apikey` (literally type "apikey")
   - **Password:** [paste SendGrid API key]
   - Click **Save**

---

### **Option 3: Resend (Modern Alternative - FREE 100 emails/day)**

1. **Sign up for Resend:**
   - Go to: https://resend.com/signup
   - Sign up for FREE account

2. **Create API Key:**
   - After login, click "API Keys"
   - Click "Create API Key"
   - Name: "Sonar Tracker"
   - Click "Add"
   - **Copy the API key** (starts with `re_`)

3. **Add Domain (Optional):**
   - Go to "Domains"
   - Add `sonartracker.io` or use their sandbox for testing

4. **Configure in Supabase:**
   - Go to: https://supabase.com/dashboard/project/fwbwfvqzomipoftgodof/settings/auth
   - Scroll to "SMTP Settings"
   - **Enable Custom SMTP:** Toggle ON
   - **Sender email:** `noreply@sonartracker.io`
   - **Sender name:** `Sonar Tracker`
   - **Host:** `smtp.resend.com`
   - **Port:** `587`
   - **Username:** `resend`
   - **Password:** [paste Resend API key]
   - Click **Save**

---

## Required Settings in Supabase

### **1. URL Configuration**
- Go to: https://supabase.com/dashboard/project/fwbwfvqzomipoftgodof/auth/url-configuration

**Site URL:** `http://localhost:3000` (for development)

**Redirect URLs (add all):**
```
http://localhost:3000/**
http://localhost:3000/auth/callback
https://sonartracker.io/**
https://sonartracker.io/auth/callback
```

### **2. Auth Settings**
- Go to: https://supabase.com/dashboard/project/fwbwfvqzomipoftgodof/settings/auth

**Enable:**
- ✅ Enable email confirmations
- ✅ Enable email change confirmations
- ✅ Secure email change

**Email Template:**
- Go to "Email Templates" → "Confirm signup"
- Should contain `{{ .ConfirmationURL }}`

---

## Testing the Setup

### **1. Test Signup:**
```
1. Go to http://localhost:3000
2. Click "Sign Up"
3. Enter: test@example.com / YourPassword123
4. Click "Sign Up"
5. Check email inbox for verification link
6. Click link in email
7. Should redirect to login page
8. Login with same credentials
9. Access dashboard
```

### **2. Check Supabase Logs:**
- Go to: https://supabase.com/dashboard/project/fwbwfvqzomipoftgodof/logs/edge-logs
- Look for email sending events
- Check for errors

---

## Troubleshooting

### **Error: "Error sending confirmation email"**
**Cause:** SMTP not configured or credentials wrong

**Fix:**
1. Check SMTP settings in Supabase
2. Verify sender email is verified (for SendGrid/Resend)
3. Check API key/password is correct
4. Make sure port is 587 (not 465 or 25)

### **Email not arriving:**
**Possible causes:**
- Check spam/junk folder
- Sender email not verified
- SMTP rate limit reached (Supabase free tier: 4 emails/hour)
- Wrong SMTP credentials

**Fix:**
1. Set up custom SMTP (Gmail/SendGrid/Resend)
2. Verify sender identity
3. Check Supabase logs for errors

### **"User already registered" error:**
**Cause:** Email exists but not verified

**Fix:**
1. Go to Supabase dashboard
2. Authentication → Users
3. Find the user
4. Click "..." → Delete user
5. Try signup again

OR

1. Go to Authentication → Users
2. Click "..." → Send verification email manually

---

## Production Checklist

Before going live:

- [ ] Set up custom SMTP (SendGrid or Resend recommended)
- [ ] Verify sender domain
- [ ] Update Site URL to `https://sonartracker.io`
- [ ] Add production redirect URLs
- [ ] Test signup flow end-to-end
- [ ] Check spam folder for test emails
- [ ] Configure email templates with branding
- [ ] Set up email rate limiting
- [ ] Monitor email delivery in SendGrid/Resend dashboard

---

## Recommended: SendGrid for Production

**Why SendGrid?**
- ✅ FREE 100 emails/day (plenty for startup)
- ✅ Excellent deliverability (won't go to spam)
- ✅ Real-time analytics
- ✅ Professional email tracking
- ✅ Easy domain verification
- ✅ Scalable (upgrade when needed)

**Quick SendGrid Setup:**
```bash
1. Signup: https://signup.sendgrid.com/
2. Verify email
3. Create API key (Settings → API Keys)
4. Verify sender (Settings → Sender Authentication)
5. Add to Supabase SMTP settings
6. Test!
```

---

## Support

If you still have issues:

1. **Check Supabase Logs:**
   - Dashboard → Logs → Edge Logs
   - Look for auth errors

2. **Test SMTP Connection:**
   - Use SendGrid/Resend test feature
   - Send test email from their dashboard

3. **Supabase Support:**
   - https://supabase.com/dashboard/support/new

---

**Once configured, users will receive professional verification emails and can sign up successfully!** ✅

