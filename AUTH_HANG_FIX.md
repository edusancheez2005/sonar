# 🔧 AUTH HANG FIX - January 3, 2026

## 🐛 **PROBLEM IDENTIFIED**

**Symptoms**:
1. ❌ Frontend shows "analyzing..." forever
2. ❌ API request hangs/never returns
3. ❌ OpenAI shows $0 usage (never reaches OpenAI)
4. ❌ curl command hangs indefinitely

**Root Cause**: 
The API endpoint was calling `supabase.auth.getUser(token)` which was hanging, likely due to:
- Invalid/expired auth token
- Supabase auth service timing out
- Network issue with Supabase

**Location**: `/app/api/chat/route.ts` line ~162

---

## ✅ **FIXES APPLIED**

### **1. Added Timeout Protection**
```typescript
// Add timeout to prevent hanging (10 seconds max)
const authPromise = supabase.auth.getUser(token)
const timeoutPromise = new Promise<{data: {user: null}, error: any}>((_, reject) => 
  setTimeout(() => reject(new Error('Auth verification timed out after 10s')), 10000)
)

try {
  authResult = await Promise.race([authPromise, timeoutPromise])
} catch (error) {
  // Returns 500 error instead of hanging forever
  return NextResponse.json(
    { error: 'Authentication timeout - please refresh and try again' },
    { status: 500 }
  )
}
```

**Benefit**: Request will timeout after 10s instead of hanging forever

### **2. Added Debug Logging**
```typescript
console.log('🔑 Verifying auth token...')
// ... auth call ...
console.log(`✅ Authenticated user: ${user.id}`)
```

**Benefit**: Can see in terminal logs where exactly it's failing

### **3. Better Error Messages**
```typescript
if (authError) {
  console.error('❌ Auth error:', authError.message)
  return NextResponse.json(
    { error: 'Unauthorized - invalid token', details: authError.message },
    { status: 401 }
  )
}
```

**Benefit**: Frontend and logs show specific error details

---

## 🧪 **HOW TO TEST**

### **Step 1: Restart Dev Server**
```bash
# In Terminal 5 (where dev server is running):
Ctrl+C

# Then restart:
npm run next:dev
```

### **Step 2: Check Terminal Logs**
Watch for these messages when you send a chat message:
```
🔑 Verifying auth token...
✅ Authenticated user: <user-id>
📊 Analyzing <TICKER> for user <user-id>...
```

### **Step 3: Test in Browser**
1. Visit: http://localhost:3001/chat
2. Make sure you're logged in
3. Ask: "tell me about eth"
4. Check terminal for logs
5. Check browser console (F12) for errors

---

## 🔍 **DEBUGGING GUIDE**

### **Scenario 1: "Authentication timeout" error**
**What it means**: Supabase auth call took > 10s

**Possible causes**:
- Network issue
- Supabase service issue
- Rate limiting

**Solution**:
1. Check Supabase status: https://status.supabase.com/
2. Try refreshing the page (get new token)
3. Check if `NEXT_PUBLIC_SUPABASE_URL` is correct in `.env.local`
4. Check if `SUPABASE_SERVICE_ROLE_KEY` is correct

---

### **Scenario 2: "Unauthorized - invalid token" error**
**What it means**: Token is invalid or expired

**Solution**:
1. Log out and log back in
2. Hard refresh page (Cmd+Shift+R)
3. Check browser console for auth errors
4. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct

---

### **Scenario 3: "Unauthorized - user not found" error**
**What it means**: Token is valid but user doesn't exist in database

**Solution**:
1. Check Supabase Authentication → Users
2. Verify your account exists
3. Try creating a new account

---

### **Scenario 4: Still hanging after 10s timeout**
**What it means**: The timeout isn't working or hanging elsewhere

**Check terminal logs** for where it stopped:
- Stops at "🔑 Verifying auth token..." → Timeout not working
- Stops after "✅ Authenticated user..." → Issue in rate limiting or data fetching
- No logs at all → Request not reaching API

**Solution**:
1. Check if request is reaching API: `curl http://localhost:3001/api/chat` (should return 405)
2. Check browser Network tab (F12 → Network) for request status
3. Look for CORS errors in browser console

---

## 📋 **EXPECTED BEHAVIOR (After Fix)**

### **Success Flow**:
```
Browser: Send message "tell me about ETH"
  ↓
Server logs: 🔑 Verifying auth token...
Server logs: ✅ Authenticated user: abc123...
Server logs: 📊 Analyzing ETH for user abc123...
Server logs: ✅ Using cached news for ETH
Server logs: ✅ Response generated for ETH in 8491ms
  ↓
Browser: Shows ORCA response + 5 cards
```

### **Timeout Flow** (if Supabase slow):
```
Browser: Send message
  ↓
Server logs: 🔑 Verifying auth token...
[10 seconds pass...]
Server logs: ❌ Auth timeout: Error: Auth verification timed out after 10s
  ↓
Browser: Shows error "Authentication timeout - please refresh and try again"
```

### **Invalid Token Flow**:
```
Browser: Send message
  ↓
Server logs: 🔑 Verifying auth token...
Server logs: ❌ Auth error: Invalid JWT token
  ↓
Browser: Shows error "Unauthorized - invalid token"
```

---

## 🎯 **NEXT STEPS**

1. ✅ **Restart dev server** (Ctrl+C, then `npm run next:dev`)
2. ✅ **Test in browser** at http://localhost:3001/chat
3. ✅ **Watch terminal logs** to see where it's failing
4. ✅ **Check browser console** (F12) for frontend errors
5. ✅ **Share logs** if still having issues

---

## 🔑 **COMMON AUTH ISSUES**

### **Issue: Token expired**
**Symptom**: Worked before, now doesn't
**Fix**: Log out and log back in

### **Issue: Not logged in**
**Symptom**: "Unauthorized" error immediately
**Fix**: Visit http://localhost:3001/auth/signin

### **Issue: Wrong environment variables**
**Check**:
```bash
# Frontend (browser accessible):
NEXT_PUBLIC_SUPABASE_URL=https://fwbwfvqzomipoftgodof.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

# Backend (server only):
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

---

## 📊 **FILES MODIFIED**

- `/app/api/chat/route.ts` (lines 160-180)
  - Added 10s timeout for auth verification
  - Added debug logging
  - Better error messages

---

**Status**: ✅ Fix applied - restart dev server and test!

