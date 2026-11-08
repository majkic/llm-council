#!/bin/bash

# Configuration
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DOMAIN="$(sed -n 's/^BASE_DOMAIN=//p' "${ROOT_DIR}/.env" | tail -n 1)"
if [[ ! "$BASE_DOMAIN" =~ ^[A-Za-z0-9.-]+$ || "$BASE_DOMAIN" == .* || "$BASE_DOMAIN" == *. || "$BASE_DOMAIN" == *..* ]]; then
    echo "Set a valid BASE_DOMAIN in ${ROOT_DIR}/.env" >&2
    exit 1
fi

REMOTE_HOST="root@${BASE_DOMAIN}"
REMOTE_PATH="/opt/llm-council/"

echo "🚀 Starting deployment to ${REMOTE_HOST}:${REMOTE_PATH}..."

# Ensure remote directory exists
ssh "${REMOTE_HOST}" "mkdir -p ${REMOTE_PATH}"

# Sync files to remote server
# We exclude local data, virtual environments, and node_modules to avoid overwriting remote state
echo "📦 Syncing files..."
rsync -avz \
    --exclude '.git/' \
    --exclude '.venv/' \
    --exclude 'node_modules/' \
    --exclude '__pycache__/' \
    --exclude 'data/' \
    --exclude '.DS_Store' \
    ./ "${REMOTE_HOST}:${REMOTE_PATH}"

# Run docker-compose on remote server
echo "🐳 Starting containers on remote server..."
# Enforce APP_ENV=production on remote and restart
ssh "${REMOTE_HOST}" "cd ${REMOTE_PATH} && \
    sed -i \"s/APP_ENV=.*/APP_ENV=production/g\" backend/.env || echo \"APP_ENV=production\" >> backend/.env && \
    docker compose up -d --build"

echo "✅ Deployment complete!"
echo "🌐 Frontend: https://llm-council.${BASE_DOMAIN}"
echo "📡 Backend: https://llm-council.${BASE_DOMAIN}/api"
