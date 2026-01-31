# Remaining Polish Tasks - Quick Action Plan

These are straightforward find-and-replace tasks that need to be completed:

---

## 1. Replace Token Text with TokenIcon Component

### Files to Update

#### `src/views/Dashboard.js`
**Search for**: Token symbol display in whale transaction tables and "Top …" lists  
**Pattern**: Text-only token symbols like `<span>{symbol}</span>` or `{token_symbol}`  
**Replace with**:
```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
  <TokenIcon symbol={symbolVariable} size={20} />
  <span>{symbolVariable}</span>
</div>
```

**Steps**:
1. Import TokenIcon at top: `import TokenIcon from '@/components/TokenIcon'`
2. Find whale transaction table rows
3. Wrap symbol display with logo + text
4. Find "Top Tokens" sections
5. Add logos next to token names

---

#### `src/views/Statistics.js`
**Location**: Token symbol columns in transaction tables  
**Same pattern as Dashboard.js**

---

#### `components/whales/WhaleAlertsCard.jsx` (if exists)
**Location**: Transaction displays  
**Add logo next to each symbol mention**

---

#### `components/news/NewsCard.jsx` or similar
**Optional**: If news mentions specific tokens, add logos inline

---

### Quick Command to Find Files
```bash
# Find all files mentioning token_symbol or similar
grep -r "token_symbol" src/ app/ components/ --include="*.jsx" --include="*.js" | grep -v node_modules
```

---

## 2. Remove Emojis from UI

### Strategy
Search for common emojis and replace with:
- SVG icons from a library (e.g., Heroicons, Lucide)
- Plain text
- Or remove entirely if not adding value

### Common Emoji Patterns to Search

```bash
# In your project root
grep -r "🔒" app/ src/ components/ --include="*.jsx" --include="*.js"
grep -r "◆" app/ src/ components/ --include="*.jsx" --include="*.js"
grep -r "⏰" app/ src/ components/ --include="*.jsx" --include="*.js"
grep -r "🐋" app/ src/ components/ --include="*.jsx" --include="*.js"
grep -r "📊" app/ src/ components/ --include="*.jsx" --include="*.js"
grep -r "💬" app/ src/ components/ --include="*.jsx" --include="*.js"
```

### Replacement Strategy

**Lock emoji** (`🔒`):
```jsx
// Replace with SVG lock icon
<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zm6 10l.002 8H6v-8h12zM9 10V7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9z"/>
</svg>
```

**Diamond emoji** (`◆`) for sentiment:
- Already replaced in Orca - remove from other locations or use text

**Whale emoji** (`🐋`):
- Replace with "Whale" text or remove (icon not adding value)

**Clock emoji** (`⏰`):
- Replace with "24h data" or similar text

---

### Files Known to Have Emojis
1. `app/ai-advisor/ClientOrca.jsx` - loading messages (DONE ✅)
2. `src/views/Dashboard.js` - data indicators, whale tracking message
3. `components/WhaleAlertsCard.jsx` - card title
4. Any footer/help text

---

## 3. Ensure "Premium" Branding (Not "Pro")

### Global Search & Replace

```bash
# Find all "Pro" references
grep -r "Sonar Pro" app/ src/ components/ --include="*.jsx" --include="*.js" --include="*.md"
grep -r "\\bPro\\b" app/ src/ components/ --include="*.jsx" --include="*.js"
grep -r "upgrade to Pro" app/ src/ components/ --include="*.jsx" --include="*.js" -i
```

### Known Replacements

**Already Updated** ✅:
- `app/subscribe/page.jsx` - All "Pro" → "Premium"
- `app/profile/ClientProfile.jsx` - Subscription labels
- `app/ai-advisor/ClientOrca.jsx` - Upgrade messages

**Check These**:
- Any README or documentation files
- Error messages or toast notifications
- Email templates (if any)
- API response messages
- Console log messages (optional, user doesn't see these)

### Specific Pattern Replacements

| Old | New |
|-----|-----|
| "Sonar Pro" | "Sonar Premium" |
| "Pro plan" | "Premium plan" |
| "Upgrade to Pro" | "Upgrade to Premium" |
| "Pro features" | "Premium features" |
| "Pro users" | "Premium users" |
| "Pro subscription" | "Premium subscription" |

**Exception**: Keep "Pro" in "CoinGecko Pro" (that's their product name)

---

## Quick Implementation Script (Optional)

If you want to automate some of this:

```bash
#!/bin/bash

# Premium branding
find app/ src/ components/ -name "*.jsx" -o -name "*.js" | xargs sed -i '' 's/Sonar Pro/Sonar Premium/g'
find app/ src/ components/ -name "*.jsx" -o -name "*.js" | xargs sed -i '' 's/Pro plan/Premium plan/g'
find app/ src/ components/ -name "*.jsx" -o -name "*.js" | xargs sed -i '' 's/Upgrade to Pro/Upgrade to Premium/g'

# Manual review still recommended
echo "Run git diff to review changes before committing"
```

---

## Verification Checklist

After completing these tasks:

- [ ] Search entire project for remaining emojis: `grep -r "[😀-🙏]" app/ src/ components/`
- [ ] Search for "Pro" excluding "CoinGecko Pro": `grep -r "Pro" app/ src/ | grep -v "CoinGecko"`
- [ ] Verify token logos appear on Dashboard whale tables
- [ ] Verify token logos appear on Statistics page
- [ ] Check mobile responsiveness of logos
- [ ] Run linter: `npm run next:lint`
- [ ] Build test: `npm run build`

---

## Estimated Time

- **Task 1** (Token Icons): ~1-2 hours (depending on number of locations)
- **Task 2** (Remove Emojis): ~30 minutes
- **Task 3** (Premium Branding): ~15 minutes

**Total**: ~2-3 hours of focused work

---

## Priority

1. **Premium Branding** - Quickest, highest user-facing impact
2. **Remove Emojis** - Quick, improves professionalism
3. **Token Icons** - More time-consuming, but completes the visual polish

You can deploy without completing all of these and finish them in a follow-up PR.
