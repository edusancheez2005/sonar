# Contact Form Email Setup

The contact form (`/contact`) sends emails using Gmail SMTP via nodemailer.

## Required Environment Variables

Add these to your `.env.local` file (for local development) and Vercel Environment Variables (for production):

```bash
GMAIL_USER=eduardo@sonartracker.io
GMAIL_APP_PASSWORD=your_app_password_here
```

## Setting Up Gmail App Password

Since you're using Gmail with 2FA (two-factor authentication), you need to create an **App Password**:

### Steps:

1. **Go to Google Account Settings**
   - Visit: https://myaccount.google.com/

2. **Navigate to Security**
   - Click "Security" in the left sidebar

3. **Enable 2-Step Verification** (if not already enabled)
   - Scroll to "How you sign in to Google"
   - Click "2-Step Verification" and follow the setup

4. **Create App Password**
   - After enabling 2FA, go back to Security
   - Under "How you sign in to Google", click "App passwords"
   - You may need to re-enter your password
   - Select "Mail" as the app
   - Select "Other (Custom name)" as the device
   - Name it "Sonar Tracker"
   - Click "Generate"

5. **Copy the 16-character password**
   - Google will show you a 16-character password
   - Copy this password (it will look like: `xxxx xxxx xxxx xxxx`)
   - Remove the spaces, so it becomes: `xxxxxxxxxxxxxxxx`

6. **Add to Environment Variables**
   - Add `GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx` to your `.env.local`
   - Add the same to Vercel:
     ```
     vercel env add GMAIL_USER
     vercel env add GMAIL_APP_PASSWORD
     ```
   - Or add via Vercel dashboard: Settings → Environment Variables

## Testing Locally

1. Make sure `.env.local` has both variables
2. Restart your dev server: `npm run dev`
3. Go to http://localhost:3000/contact
4. Fill out and submit the form
5. Check your `eduardo@sonartracker.io` inbox for the email

## How It Works

When a user submits the contact form:

1. **Form data is validated** (name, email, subject, category, message)
2. **Email is sent to `eduardo@sonartracker.io`**
   - Professional HTML template
   - Includes all form data
   - Reply-to set to user's email
   - Subject: `[Sonar Contact] CATEGORY: Subject`
3. **Confirmation email sent to user**
   - Thanks them for contacting
   - Sets expectations (24-48h response)
   - Includes links to FAQ, dashboard, Orca 2.0
4. **Success/error message displayed** to user

## Email Features

### To Sonar Tracker:
- Professional branded HTML template
- Color-coded category badges
- Direct reply-to user's email
- All contact form fields included

### To User (Confirmation):
- Thank you message
- Response time expectations
- Helpful links (FAQ, dashboard, Orca)
- Professional branding

## Troubleshooting

### "Invalid login" error
- Check that GMAIL_APP_PASSWORD is set correctly
- Ensure no spaces in the app password
- Verify 2FA is enabled on the Gmail account

### Emails not sending
- Check environment variables are set in Vercel
- Restart Vercel deployment after adding env vars
- Check Gmail account for any security alerts

### Emails going to spam
- This is normal initially
- As more emails are sent, deliverability improves
- Consider adding SPF/DKIM records for your domain (advanced)

## Production Checklist

- [x] nodemailer installed (`npm install nodemailer`)
- [ ] Gmail App Password generated
- [ ] `GMAIL_USER` added to Vercel env vars
- [ ] `GMAIL_APP_PASSWORD` added to Vercel env vars
- [ ] Test the contact form on production
- [ ] Check eduardo@sonartracker.io inbox for test email
- [ ] Verify confirmation email is received by test user

## Security Notes

- **Never commit** `.env.local` to git (already in `.gitignore`)
- App passwords are safer than your main Gmail password
- Revoke app passwords you're not using via Google Account settings
- If compromised, revoke and generate a new app password immediately

## Alternative: SendGrid (Optional)

If you prefer SendGrid over Gmail:

```javascript
// In /app/api/contact/route.js, replace transporter with:
const transporter = nodemailer.createTransporter({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
})
```

Environment variable needed:
```bash
SENDGRID_API_KEY=your_sendgrid_api_key
```

