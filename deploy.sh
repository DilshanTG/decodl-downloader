#!/bin/bash
# ─── StockMart Deploy (CLI only — no GitHub) ─────────────────────────────────
# Usage:
#   bash deploy.sh          → build + deploy BOTH frontend and backend
#   bash deploy.sh frontend → frontend only
#   bash deploy.sh backend  → backend only
set -e
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$ROOT_DIR/app"

MODE=${1:-"both"}

wasp_build() {
  echo "🏗️   Running wasp build..."
  cd "$APP_DIR"
  wasp build
}

package_backend() {
  echo "📦  Packaging backend..."
  rm -rf /tmp/sm-backend && mkdir /tmp/sm-backend
  OUT="$APP_DIR/.wasp/out"
  for f in Dockerfile package.json package-lock.json tsconfig.json; do
    cp "$OUT/$f" /tmp/sm-backend/ 2>/dev/null || true
  done
  for d in src server sdk libs db user; do
    cp -r "$OUT/$d" /tmp/sm-backend/$d 2>/dev/null || true
  done
  printf '[build]\nbuilder = "dockerfile"\ndockerfilePath = "Dockerfile"\ndockerContext = "."\n\n[deploy]\nhealthcheckPath = "/"\nhealthcheckTimeout = 120\nrestartPolicyType = "on_failure"\nrestartPolicyMaxRetries = 3\n' > /tmp/sm-backend/railway.toml
}

deploy_backend_upload() {
  echo "🚂  Deploying backend to Railway..."
  cd /tmp/sm-backend
  railway link --project 1f39cd29-a6c7-47e5-bba1-c0b8d97ad990 --environment production --service stockmart
  railway up --detach
  echo "✅  Backend deploying: https://api.stockmart.lk"
  echo "    Watch: railway status"
}

deploy_frontend_build_upload() {
  echo "⚡  Building frontend..."
  cd "$APP_DIR"
  REACT_APP_API_URL=https://api.stockmart.lk npx vite build
  printf '{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}' \
    > .wasp/out/web-app/build/vercel.json
  echo "▲  Deploying to Vercel..."
  cd "$APP_DIR/.wasp/out/web-app/build"
  vercel link --yes --project stockmart 2>/dev/null
  vercel --prod --yes
  echo "✅  Frontend live: https://www.stockmart.lk"
}

case "$MODE" in
  frontend)
    wasp_build
    deploy_frontend_build_upload
    ;;
  backend)
    wasp_build
    package_backend
    deploy_backend_upload
    ;;
  *)
    wasp_build
    package_backend
    deploy_backend_upload
    deploy_frontend_build_upload
    echo ""
    echo "🎉  Both deployed!"
    echo "    Frontend: https://www.stockmart.lk"
    echo "    Backend:  https://api.stockmart.lk"
    ;;
esac
