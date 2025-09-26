#!/bin/bash

# SvelteHR Development Environment Stop Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "⏹️ Stopping SvelteHR Development Environment..."

cd "$SCRIPT_DIR"

# Check if containers are running
if docker-compose -f docker-compose.dev.yml ps -q | grep -q .; then
    echo "🛑 Stopping development containers..."
    docker-compose -f docker-compose.dev.yml down

    echo ""
    echo "✅ Development environment stopped successfully!"
    echo ""
    echo "🗑️ To completely clean up (remove volumes and data):"
    echo "   docker-compose -f $SCRIPT_DIR/docker-compose.dev.yml down -v"
    echo "   docker system prune -f"
else
    echo "ℹ️ No running containers found."
fi