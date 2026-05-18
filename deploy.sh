#!/bin/bash
set -e

cd "$(dirname "$0")/app"

echo ""
echo "🏗️  Building..."
wasp build

echo ""
echo "📦  Packaging backend..."
rm -rf /tmp/sm-deploy && mkdir /tmp/sm-deploy
OUT=.wasp/out
for f in Dockerfile package.json package-lock.json tsconfig.json; do cp $OUT/$f /tmp/sm-deploy/ 2>/dev/null || true; done
for d in src server sdk libs db user; do cp -r $OUT/$d /tmp/sm-deploy/$d 2>/dev/null || true; done
printf '[build]\ndockerfilePath = "Dockerfile"\n[deploy]\nhealthcheckPath = "/"\nhealthcheckTimeout = 120\nrestartPolicyType = "ON_FAILURE"\nrestartPolicyMaxRetries = 3\n' > /tmp/sm-deploy/railway.toml

echo ""
echo "🚂  Deploying backend to Railway..."
cd /tmp/sm-deploy
railway link --project 1f39cd29-a6c7-47e5-bba1-c0b8d97ad990 --environment production --service stockmart
railway up --service stockmart --detach
cd -

echo ""
echo "⚡  Building frontend..."
REACT_APP_API_URL=https://stockmart-production.up.railway.app npx vite build
printf '{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}' > .wasp/out/web-app/build/vercel.json

echo ""
echo "▲  Deploying frontend to Vercel..."
cd .wasp/out/web-app/build
vercel link --yes --project stockmart
vercel --prod --yes
cd -

echo ""
echo "✅  Done! Both Railway and Vercel are deploying."
echo "    Frontend: https://stockmart-five.vercel.app"
echo "    Backend:  https://stockmart-production.up.railway.app"
