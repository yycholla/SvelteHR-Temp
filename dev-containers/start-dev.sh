#!/bin/bash

# SvelteHR Development Environment Startup Script
# This script starts the development containers with SSH and Neovim support

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting SvelteHR Development Environment..."
echo "📁 Project root: $PROJECT_ROOT"
echo "🐳 Docker compose file: $SCRIPT_DIR/docker-compose.dev.yml"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if ~/.config/nvim exists
if [ ! -d "$HOME/.config/nvim" ]; then
    echo "⚠️  Warning: Neovim config directory not found at ~/.config/nvim"
    echo "   Containers will still start, but Neovim configuration won't be mounted."
fi

# Build and start the development containers
echo "🔨 Building development containers..."
cd "$SCRIPT_DIR"
docker-compose -f docker-compose.dev.yml build

echo "🚀 Starting development containers..."
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "✅ Development environment started successfully!"
echo ""
echo "🔗 Access Information:"
echo "   📊 Backend API:     http://localhost:4000"
echo "   🎨 Frontend:        http://localhost:5173"
echo "   🔍 GraphiQL:        http://localhost:5000"
echo "   🗄️  PostgreSQL:     localhost:5433 (postgres/postgres123)"
echo "   🔴 Redis:           localhost:6380"
echo ""
echo "🔑 SSH Access:"
echo "   📡 Backend:         ssh dev@localhost -p 2222"
echo "   🎯 Frontend:        ssh dev@localhost -p 2223"
echo "   🔐 Password:        dev"
echo ""
echo "📋 Useful Commands:"
echo "   🔍 View logs:       docker-compose -f $SCRIPT_DIR/docker-compose.dev.yml logs -f"
echo "   ⏹️  Stop:            docker-compose -f $SCRIPT_DIR/docker-compose.dev.yml down"
echo "   🗑️  Clean up:        docker-compose -f $SCRIPT_DIR/docker-compose.dev.yml down -v"
echo "   📊 Status:          docker-compose -f $SCRIPT_DIR/docker-compose.dev.yml ps"
echo ""
echo "💡 Pro Tips:"
echo "   • Your Neovim config from ~/.config/nvim is mounted in both containers"
echo "   • Source code is mounted for live reloading"
echo "   • Use tmux in the containers for multiple terminal sessions"
echo "   • Backend runs on tsx with file watching for auto-restart"
echo "   • Frontend runs with Vite HMR for instant updates"