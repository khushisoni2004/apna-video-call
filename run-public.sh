#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/.run-logs"
LINKS_FILE="$ROOT_DIR/CURRENT_PUBLIC_LINKS.txt"

mkdir -p "$LOG_DIR"

BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_TUNNEL_LOG="$LOG_DIR/backend-tunnel.log"
FRONTEND_TUNNEL_LOG="$LOG_DIR/frontend-tunnel.log"

cleanup() {
  echo ""
  echo "Stopping Apna Video Call..."
  kill ${BACKEND_PID:-} ${FRONTEND_PID:-} ${BACKEND_TUNNEL_PID:-} ${FRONTEND_TUNNEL_PID:-} 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

free_port() {
  local port="$1"
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Freeing port $port..."
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

get_tunnel_url() {
  local file="$1"
  local url=""
  for i in {1..60}; do
    url=$(grep -Eo 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$file" | head -n 1 || true)
    if [ -n "$url" ]; then
      echo "$url"
      return 0
    fi
    sleep 1
  done
  echo ""
  return 1
}

wait_for_local() {
  local url="$1"
  local name="$2"
  for i in {1..60}; do
    if curl -s "$url" >/dev/null 2>&1; then
      echo "$name is ready."
      return 0
    fi
    sleep 1
  done
  echo "$name did not start. Check logs in $LOG_DIR"
  return 1
}

start_tunnel() {
  local url="$1"
  local log="$2"
  cloudflared tunnel --url "$url" > "$log" 2>&1 &
  echo $!
}

echo "=============================================="
echo "Apna Video Call - One Command Public Run"
echo "=============================================="

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found. Installing with Homebrew..."
  brew install cloudflared
fi

free_port 8000
free_port 3000

pkill -f "cloudflared tunnel --url http://localhost:8000" 2>/dev/null || true
pkill -f "cloudflared tunnel --url http://localhost:3000" 2>/dev/null || true

rm -f "$BACKEND_LOG" "$FRONTEND_LOG" "$BACKEND_TUNNEL_LOG" "$FRONTEND_TUNNEL_LOG" "$LINKS_FILE"

echo "Preparing backend..."
cd "$BACKEND_DIR"
if [ ! -d node_modules ]; then
  npm install --legacy-peer-deps
fi

cat > .env <<ENV
PORT=8000
MONGO_URI=mongodb://127.0.0.1:27017/apna_zoom_clone
CLIENT_URL=*
REQUIRE_DB=false
ENV

echo "Starting backend..."
npm run dev > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
wait_for_local "http://localhost:8000/health" "Backend"

echo "Creating backend public tunnel..."
BACKEND_TUNNEL_PID=$(start_tunnel "http://localhost:8000" "$BACKEND_TUNNEL_LOG")
BACKEND_PUBLIC_URL=$(get_tunnel_url "$BACKEND_TUNNEL_LOG")
if [ -z "$BACKEND_PUBLIC_URL" ]; then
  echo "Backend tunnel failed. Check $BACKEND_TUNNEL_LOG"
  cleanup
fi

echo "Backend Public URL: $BACKEND_PUBLIC_URL"

echo "Preparing frontend..."
cd "$FRONTEND_DIR"
if [ ! -d node_modules ]; then
  npm install --legacy-peer-deps
fi

cat > .env <<ENV
REACT_APP_BACKEND_URL=$BACKEND_PUBLIC_URL
REACT_APP_PUBLIC_FRONTEND_URL=
ENV

echo "Starting frontend..."
BROWSER=none npm start > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
wait_for_local "http://localhost:3000" "Frontend"

echo "Creating frontend public tunnel..."
FRONTEND_TUNNEL_PID=$(start_tunnel "http://localhost:3000" "$FRONTEND_TUNNEL_LOG")
FRONTEND_PUBLIC_URL=$(get_tunnel_url "$FRONTEND_TUNNEL_LOG")
if [ -z "$FRONTEND_PUBLIC_URL" ]; then
  echo "Frontend tunnel failed. Check $FRONTEND_TUNNEL_LOG"
  cleanup
fi

echo "Frontend Public URL: $FRONTEND_PUBLIC_URL"

echo "Updating frontend public URL and restarting frontend..."
cat > "$FRONTEND_DIR/.env" <<ENV
REACT_APP_BACKEND_URL=$BACKEND_PUBLIC_URL
REACT_APP_PUBLIC_FRONTEND_URL=$FRONTEND_PUBLIC_URL
ENV

kill $FRONTEND_PID 2>/dev/null || true
sleep 2
cd "$FRONTEND_DIR"
BROWSER=none npm start > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
wait_for_local "http://localhost:3000" "Final frontend"

cat > "$LINKS_FILE" <<LINKS
Backend Public URL:
$BACKEND_PUBLIC_URL

Frontend Public URL:
$FRONTEND_PUBLIC_URL

Meeting Link Example:
$FRONTEND_PUBLIC_URL/meet-khushi
LINKS

printf '\n==============================================\n'
printf 'ALL READY ✅\n'
printf 'Frontend: %s\n' "$FRONTEND_PUBLIC_URL"
printf 'Meeting:  %s/meet-khushi\n' "$FRONTEND_PUBLIC_URL"
printf 'Links saved in: %s\n' "$LINKS_FILE"
printf 'Keep this terminal open. Press Control+C to stop.\n'
printf '==============================================\n\n'

while true; do sleep 5; done
