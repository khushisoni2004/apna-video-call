#!/bin/bash

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/.run-logs"
LINK_FILE="$ROOT_DIR/CURRENT_PUBLIC_LINKS.txt"

mkdir -p "$LOG_DIR"
rm -f "$LINK_FILE"

echo "Stopping old servers..."
lsof -ti :8000 | xargs kill -9 2>/dev/null || true
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
lsof -ti :3001 | xargs kill -9 2>/dev/null || true
pkill -f cloudflared 2>/dev/null || true
pkill -f nodemon 2>/dev/null || true
pkill -f "node src/app.js" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true

echo "Checking cloudflared..."
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found. Installing with Homebrew..."
  brew install cloudflared
fi

echo "Starting backend..."
cd "$BACKEND_DIR"
npm install --legacy-peer-deps >/dev/null
npm run dev > "$LOG_DIR/backend.log" 2>&1 &

echo "Waiting for backend..."
for i in {1..40}; do
  if curl -s http://localhost:8000/health >/dev/null 2>&1 || curl -s http://localhost:8000 >/dev/null 2>&1; then
    echo "Backend is ready."
    break
  fi
  sleep 1
done

echo "Creating backend public tunnel..."
cloudflared tunnel --url http://localhost:8000 --protocol http2 > "$LOG_DIR/backend-tunnel.log" 2>&1 &

BACKEND_PUBLIC_URL=""
for i in {1..60}; do
  BACKEND_PUBLIC_URL=$(grep -o 'https://[-a-zA-Z0-9.]*\.trycloudflare\.com' "$LOG_DIR/backend-tunnel.log" | head -n 1 || true)
  if [ -n "$BACKEND_PUBLIC_URL" ]; then
    break
  fi
  sleep 1
done

if [ -z "$BACKEND_PUBLIC_URL" ]; then
  echo "Backend tunnel failed. Check $LOG_DIR/backend-tunnel.log"
  exit 1
fi

echo "Backend Public URL: $BACKEND_PUBLIC_URL"

echo "Updating frontend env..."
cd "$FRONTEND_DIR"

cat > .env <<ENVEOF
REACT_APP_BACKEND_URL=$BACKEND_PUBLIC_URL
ENVEOF

echo "Starting frontend..."
npm install --legacy-peer-deps >/dev/null
BROWSER=none npm start > "$LOG_DIR/frontend.log" 2>&1 &

echo "Waiting for frontend..."
FRONTEND_PORT=""
for port in 3000 3001; do
  for i in {1..30}; do
    if curl -s "http://localhost:$port" >/dev/null 2>&1; then
      FRONTEND_PORT="$port"
      break
    fi
    sleep 1
  done
  if [ -n "$FRONTEND_PORT" ]; then
    break
  fi
done

if [ -z "$FRONTEND_PORT" ]; then
  echo "Frontend failed. Check $LOG_DIR/frontend.log"
  exit 1
fi

echo "Frontend is ready on port $FRONTEND_PORT."

echo "Creating frontend public tunnel..."
cloudflared tunnel --url "http://localhost:$FRONTEND_PORT" --protocol http2 > "$LOG_DIR/frontend-tunnel.log" 2>&1 &

FRONTEND_PUBLIC_URL=""
for i in {1..60}; do
  FRONTEND_PUBLIC_URL=$(grep -o 'https://[-a-zA-Z0-9.]*\.trycloudflare\.com' "$LOG_DIR/frontend-tunnel.log" | head -n 1 || true)
  if [ -n "$FRONTEND_PUBLIC_URL" ]; then
    break
  fi
  sleep 1
done

if [ -z "$FRONTEND_PUBLIC_URL" ]; then
  echo "Frontend tunnel failed. Check $LOG_DIR/frontend-tunnel.log"
  exit 1
fi

echo "Updating frontend public URL..."
cat > "$FRONTEND_DIR/.env" <<ENVEOF
REACT_APP_BACKEND_URL=$BACKEND_PUBLIC_URL
REACT_APP_PUBLIC_FRONTEND_URL=$FRONTEND_PUBLIC_URL
ENVEOF

echo "Restarting frontend with final public URL..."
lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
BROWSER=none npm start > "$LOG_DIR/frontend.log" 2>&1 &

sleep 8

cat > "$LINK_FILE" <<LINKSEOF
Backend: $BACKEND_PUBLIC_URL
Frontend: $FRONTEND_PUBLIC_URL
Meeting: $FRONTEND_PUBLIC_URL/meet-khushi
LINKSEOF

echo ""
echo "=============================================="
echo "ALL READY ✅"
echo "Backend:  $BACKEND_PUBLIC_URL"
echo "Frontend: $FRONTEND_PUBLIC_URL"
echo "Meeting:  $FRONTEND_PUBLIC_URL/meet-khushi"
echo "Links saved in: $LINK_FILE"
echo "=============================================="
echo ""
echo "Keep this terminal open. Press Control+C to stop."

while true; do
  sleep 3600
done
