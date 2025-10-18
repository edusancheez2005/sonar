#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    Sonar Tracker - Email Setup Script            ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

echo -e "${GREEN}Step 1: Gmail Account${NC}"
echo "Email address: eduardo@sonartracker.io"
echo ""

# Check if .env.local exists
if [ -f .env.local ]; then
    echo -e "${GREEN}✓ Found .env.local${NC}"
else
    echo -e "${YELLOW}⚠️  No .env.local found. Creating one...${NC}"
    touch .env.local
fi

echo ""
echo -e "${GREEN}Step 2: Generate Gmail App Password${NC}"
echo "1. Go to: https://myaccount.google.com/security"
echo "2. Enable 2-Step Verification if not already enabled"
echo "3. Go to 'App passwords' under 'How you sign in to Google'"
echo "4. Select 'Mail' → 'Other (Custom name)'"
echo "5. Name it 'Sonar Tracker'"
echo "6. Copy the 16-character password"
echo ""

read -p "Have you generated the Gmail App Password? (y/n): " ready

if [ "$ready" != "y" ]; then
    echo -e "${RED}Please generate the App Password first and run this script again.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 3: Enter App Password${NC}"
echo "Paste your 16-character Gmail App Password (spaces will be removed automatically):"
read -s app_password

# Remove spaces from app password
app_password=$(echo "$app_password" | tr -d ' ')

# Validate length (should be 16 characters)
if [ ${#app_password} -ne 16 ]; then
    echo -e "${RED}❌ Invalid App Password length. Should be 16 characters.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ App Password received${NC}"

# Add to .env.local
echo ""
echo -e "${GREEN}Step 4: Adding to .env.local${NC}"

# Check if variables already exist and update them
if grep -q "GMAIL_USER" .env.local; then
    sed -i '' 's/^GMAIL_USER=.*/GMAIL_USER=eduardo@sonartracker.io/' .env.local
    echo -e "${YELLOW}Updated GMAIL_USER in .env.local${NC}"
else
    echo "GMAIL_USER=eduardo@sonartracker.io" >> .env.local
    echo -e "${GREEN}Added GMAIL_USER to .env.local${NC}"
fi

if grep -q "GMAIL_APP_PASSWORD" .env.local; then
    sed -i '' "s/^GMAIL_APP_PASSWORD=.*/GMAIL_APP_PASSWORD=$app_password/" .env.local
    echo -e "${YELLOW}Updated GMAIL_APP_PASSWORD in .env.local${NC}"
else
    echo "GMAIL_APP_PASSWORD=$app_password" >> .env.local
    echo -e "${GREEN}Added GMAIL_APP_PASSWORD to .env.local${NC}"
fi

echo ""
echo -e "${GREEN}Step 5: Adding to Vercel${NC}"
read -p "Do you want to add these to Vercel now? (y/n): " add_vercel

if [ "$add_vercel" == "y" ]; then
    echo ""
    echo "Adding GMAIL_USER to Vercel..."
    echo "eduardo@sonartracker.io" | vercel env add GMAIL_USER production
    
    echo ""
    echo "Adding GMAIL_APP_PASSWORD to Vercel..."
    echo "$app_password" | vercel env add GMAIL_APP_PASSWORD production
    
    echo ""
    echo -e "${GREEN}✓ Environment variables added to Vercel${NC}"
else
    echo ""
    echo -e "${YELLOW}Skipped Vercel setup. Add manually:${NC}"
    echo "vercel env add GMAIL_USER production"
    echo "  → Enter: eduardo@sonartracker.io"
    echo ""
    echo "vercel env add GMAIL_APP_PASSWORD production"
    echo "  → Enter: $app_password"
fi

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║             ✅  Setup Complete!                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Restart your dev server if running: npm run dev"
echo "2. Test contact form locally: http://localhost:3000/contact"
echo "3. Push to GitHub: git push origin main"
echo "4. Test on production after deployment"
echo ""
echo -e "${YELLOW}Note: Your App Password is stored securely in .env.local (git ignored)${NC}"
echo ""

