#!/bin/bash

# Configuration
REMOTE_HOST="root@ll.rs"
REMOTE_PATH="/opt/llm-council/data/conversations/"

echo "🚀 Migrating target conversations to remote server..."

# Check if target files exist locally
FILES=(
    "data/conversations/5ba8e9f7-70e7-4da7-85f7-14accb622aa1.json"
    "data/conversations/b19cb349-ae7a-4ed7-b64c-82e6a5450e8c.json"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "📤 Syncing $file..."
        scp "$file" "${REMOTE_HOST}:${REMOTE_PATH}"
    else
        echo "⚠️  File $file not found!"
    fi
done

echo "✅ Migration script finished."
echo "💡 Note: These files are now owned by 'majkic@gmail.com' in the JSON contents."
