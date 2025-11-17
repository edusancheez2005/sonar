# 🔐 Admin Access Documentation

## Overview

The Sonar Tracker application has restricted admin routes that are only accessible to authorized email addresses. These routes are hidden from regular users and protected at multiple layers.

---

## Security Layers

### 1. **Server-Side Layout Protection**
`/app/admin/layout.jsx`
- Checks user authentication on every admin route
- Redirects unauthorized users to `/dashboard`
- Runs before any admin page loads

### 2. **Client-Side Auth Checks**
Each admin page component:
- Verifies user email on mount
- Shows loading state during verification
- Redirects if not authorized
- Prevents rendering of admin UI

### 3. **API Endpoint Protection**
`/app/api/admin/*`
- All admin APIs check user session
- Verify email against admin whitelist
- Return 401/403 errors for unauthorized access

### 4. **Search Engine Protection**
`/public/robots.txt`
```
Disallow: /admin/
```
Prevents search engines from indexing admin pages

---

## Admin Email Configuration

All admin emails are managed in one central file:

**`/app/lib/adminConfig.js`**

```javascript
export const ADMIN_EMAILS = [
  'eduardo@sonartracker.io',
  'edusancheez2005@gmail.com'
]
```

### Adding a New Admin

1. Edit `/app/lib/adminConfig.js`
2. Add the email to the `ADMIN_EMAILS` array
3. Deploy the changes
4. The new admin can immediately access admin routes

### Removing an Admin

1. Remove the email from `ADMIN_EMAILS` array
2. Deploy the changes
3. Access is immediately revoked

---

## Admin Routes

### Current Admin Pages

| Route | Description | Access |
|-------|-------------|--------|
| `/admin/sentiment-votes` | View community sentiment votes with voter emails | Admin only |

### Future Admin Routes

All routes under `/admin/*` are automatically protected by the layout.

To create a new admin page:
1. Create file under `/app/admin/[page-name]/page.jsx`
2. No additional auth needed (handled by layout)
3. Optional: Add client-side auth check for better UX

---

## How Protection Works

### User Flow (Non-Admin)

```
User tries to access /admin/sentiment-votes
    ↓
Server-side layout checks email
    ↓
Not in ADMIN_EMAILS list
    ↓
Redirect to /dashboard
    ↓
User never sees admin content
```

### User Flow (Admin)

```
Admin logs in with authorized email
    ↓
Navigates to /admin/sentiment-votes
    ↓
Server-side layout checks email
    ↓
Email found in ADMIN_EMAILS
    ↓
Client-side verification (optional double-check)
    ↓
Admin page renders
    ↓
Can make API calls to /api/admin/*
```

---

## API Endpoint Example

```javascript
// /app/api/admin/sentiment-votes/route.js
import { isAdmin } from '@/app/lib/adminConfig'

export async function GET(req) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Admin-only logic here
}
```

---

## No Links in UI

Admin routes are **not linked** from:
- ❌ Navbar
- ❌ Footer
- ❌ Landing page
- ❌ Dashboard
- ❌ Any public-facing page

Admins must:
- Type the URL directly: `https://sonartracker.io/admin/sentiment-votes`
- Or bookmark the admin pages

This ensures regular users never discover admin routes through normal navigation.

---

## Testing Admin Access

### As Admin:
1. Log in with admin email (`eduardo@sonartracker.io`)
2. Navigate to: `https://sonartracker.io/admin/sentiment-votes`
3. Should see admin dashboard

### As Regular User:
1. Log in with non-admin email
2. Try to access: `https://sonartracker.io/admin/sentiment-votes`
3. Should be redirected to `/dashboard`
4. Should **not** see any admin content

### Not Logged In:
1. Try to access admin route
2. Should be redirected to `/dashboard`

---

## Security Best Practices

✅ **Do:**
- Keep admin emails in centralized config
- Use server-side checks (can't be bypassed)
- Add client-side checks for better UX
- Hide admin links from UI
- Block admin routes in robots.txt

❌ **Don't:**
- Hardcode admin emails in multiple files
- Rely only on client-side checks
- Link to admin pages from public UI
- Share admin credentials
- Store sensitive data in admin pages without additional encryption

---

## Monitoring Admin Access

To see who accessed admin features, check Supabase Auth logs or add custom logging:

```javascript
// Example: Log admin access
console.log(`Admin access: ${user.email} viewed sentiment votes at ${new Date().toISOString()}`)
```

Consider adding an audit log table in Supabase to track all admin actions.

---

## Emergency Access Revocation

If an admin email is compromised:

1. **Immediately** remove the email from `/app/lib/adminConfig.js`
2. Deploy to production (takes ~2 minutes)
3. Compromised email loses access instantly
4. Review Supabase Auth logs for suspicious activity
5. If needed, manually reset the user's password in Supabase

---

## Questions?

Contact: eduardo@sonartracker.io

