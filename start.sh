#!/bin/bash

# LLM Council - Start script

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

# Start backend
echo "Starting backend on http://localhost:8001..."
uv run python -m backend.main &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 2

# Start frontend
echo "Starting frontend on http://localhost:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ LLM Council is running!"
echo "  Backend:  http://localhost:8001"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
