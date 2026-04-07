#!/bin/bash

# LLM Council - Start script (local dev with Docker infrastructure)

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Load environment variables from .env if present (for LLM_PROVIDER, API keys, etc.)
if [ -f ".env" ]; then
  echo "Loading environment from .env..."
  set -a
  # shellcheck disable=SC1091
  . ".env"
  set +a
fi

# Load non-secret parameters (provider/model config)
if [ -f "llm-params.env" ]; then
  echo "Loading environment from llm-params.env..."
  set -a
  # shellcheck disable=SC1091
  . "llm-params.env"
  set +a
fi

echo "Starting LLM Council (provider: ${LLM_PROVIDER:-openrouter})..."
echo ""

# ── Docker infrastructure (exclude app services that run locally) ──────────────
DOCKER_SERVICES=$(docker compose config --services 2>/dev/null | grep -v -E '^(backend|frontend)$' || true)

if [ -n "$DOCKER_SERVICES" ]; then
  echo "Starting Docker infrastructure services: $DOCKER_SERVICES"
  # shellcheck disable=SC2086
  docker compose up -d $DOCKER_SERVICES
  echo "Waiting for Docker services to be ready..."
  sleep 3
  echo ""
else
  echo "(No Docker infrastructure services to start)"
  echo ""
fi

# ── Backend ───────────────────────────────────────────────────────────────────
echo "Starting backend on http://localhost:8001..."
uv run python -m backend.main &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 2

# ── Frontend ──────────────────────────────────────────────────────────────────
echo "Starting frontend on http://localhost:5174..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ LLM Council is running!"
echo "  Backend:  http://localhost:8001"
echo "  Frontend: http://localhost:5174"
echo ""
echo "Press Ctrl+C to stop all servers"

# ── Cleanup on exit ──────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "Stopping app servers..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true

  if [ -n "$DOCKER_SERVICES" ]; then
    echo "Stopping Docker infrastructure services..."
    cd "$ROOT_DIR"
    # shellcheck disable=SC2086
    docker compose stop $DOCKER_SERVICES
  fi

  exit 0
}

trap cleanup SIGINT SIGTERM
wait
