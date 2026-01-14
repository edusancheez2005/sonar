# Google Sign-In Setup Guide for Sonar

This guide will walk you through setting up Google OAuth authentication with Supabase.

## Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen first:
   - Choose **External** user type
   - Fill in required fields:
     - App name: `Sonar Tracker`
     - User support email: your email
     - Developer contact: your email
   - Click **Save and Continue** through all steps

6. Now create the OAuth client ID:
   - Application type: **Web application**
   - Name: `Sonar Tracker Web Client`
   - Authorized JavaScript origins:
     ```
     http://localhost:3000
     https://sonartracker.io
     https://www.sonartracker.io
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:3000/auth/callback
     https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
     https://sonartracker.io/auth/callback
     ```
   - Click **CREATE**

7. Copy your **Client ID** and **Client Secret** (you'll need these)

## Step 2: Configure Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list and click to expand it
5. Enable Google provider:
   - Toggle **Enable Sign in with Google** to ON
   - Paste your **Client ID** from Google
   - Paste your **Client Secret** from Google
   - Click **Save**

6. Copy the **Callback URL** shown (it should be like `https://<your-ref>.supabase.co/auth/v1/callback`)
7. Go back to Google Cloud Console and make sure this URL is in your **Authorized redirect URIs** (from Step 1.6)

## Step 3: Update Your Code

I've already added the Google Sign-In buttons to your login and signup modals!

The implementation uses:
```javascript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/dashboard`
  }
})
```

## Step 4: Environment Variables (Optional)

If you want to use different Google OAuth credentials for local development:

1. Add to `.env.local`:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

2. Then you can use it in your code if needed (though Supabase handles this for you)

## Step 5: Test It Out!

1. Start your dev server: `npm run dev`
2. Go to the landing page
3. Click "Login" or "Sign Up"
4. You should see a "Continue with Google" button
5. Click it and follow the Google sign-in flow
6. You'll be redirected back to your app and logged in!

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Make sure the redirect URI in Google Cloud Console **exactly** matches the one from Supabase
- Include both `http://localhost:3000/auth/callback` and your production URLs

### Error: "Access blocked: This app's request is invalid"
- You need to configure the OAuth consent screen in Google Cloud Console
- Make sure your app is verified or add yourself as a test user

### Users not appearing in Supabase
- Check that the Google provider is enabled in Supabase
- Check browser console for errors
- Verify the redirect URI is correct

### Production Issues
- Make sure your production domain is added to **both**:
  - Google Cloud Console authorized JavaScript origins
  - Google Cloud Console authorized redirect URIs

## Security Notes

- Never commit your Google Client Secret to git
- Use Supabase's built-in OAuth handling (it's more secure)
- Always use HTTPS in production
- Consider adding email verification for additional security

## Additional Features You Can Add

1. **Custom scopes**: Request additional Google permissions
```javascript
options: {
  scopes: 'https://www.googleapis.com/auth/userinfo.email'
}
```

2. **Prompt for account selection**:
```javascript
options: {
  queryParams: {
    prompt: 'select_account'
  }
}
```

3. **Pre-fill user data**: Supabase automatically populates user email and avatar from Google

---

Need help? Check:
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Docs](https://developers.google.com/identity/protocols/oauth2)

