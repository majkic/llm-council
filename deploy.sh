#!/bin/bash

# Configuration
REMOTE_HOST="root@ll.rs"
REMOTE_PATH="/opt/llm-council/"

echo "🚀 Starting deployment to ${REMOTE_HOST}:${REMOTE_PATH}..."

# Ensure remote directory exists
ssh ${REMOTE_HOST} "mkdir -p ${REMOTE_PATH}"

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
    ./ ${REMOTE_HOST}:${REMOTE_PATH}

# Run docker-compose on remote server
echo "🐳 Starting containers on remote server..."
# Enforce APP_ENV=production on remote and restart
ssh ${REMOTE_HOST} "cd ${REMOTE_PATH} && \
    sed -i \"s/APP_ENV=.*/APP_ENV=production/g\" backend/.env || echo \"APP_ENV=production\" >> backend/.env && \
    docker compose up -d --build"

echo "✅ Deployment complete!"
echo "🌐 Frontend: http://ll.rs:5174 (or your configured domain)"
echo "📡 Backend: http://ll.rs:8001"
