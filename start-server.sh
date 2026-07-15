#!/usr/bin/env bash
# Start the sprite sheet tool backend
cd "$(dirname "$0")/server"
echo "Starting sprite data server on port 3011..."
exec node index.js
