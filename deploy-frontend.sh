#!/bin/bash
# Fast frontend-only deploy — ~1 minute, no Railway needed
set -e
cd "$(dirname "$0")/app"

echo "⚡  Building frontend..."
REACT_APP_API_URL=https://api.stockmart.lk npx vite build

printf '{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}' \
  > .wasp/out/web-app/build/vercel.json

echo "▲  Deploying to Vercel..."
cd .wasp/out/web-app/build
vercel link --yes --project stockmart 2>/dev/null
vercel --prod --yes

echo ""
echo "✅ Frontend live: https://stockmart-five.vercel.app"
