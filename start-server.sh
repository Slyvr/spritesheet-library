#!/usr/bin/env bash
# Start the spritesheet library backend
cd "$(dirname "$0")/server"
echo "Starting spritesheet data server on port 3011..."
exec node index.js
