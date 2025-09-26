#!/bin/bash

# SvelteHR Development Environment SSH Helper Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
    echo "Usage: $0 [backend|frontend|be|fe]"
    echo ""
    echo "Connect to development containers via SSH:"
    echo "  backend, be  - Connect to backend container (port 2222)"
    echo "  frontend, fe - Connect to frontend container (port 2223)"
    echo ""
    echo "Examples:"
    echo "  $0 backend    # SSH into backend container"
    echo "  $0 fe         # SSH into frontend container"
    echo ""
    echo "Default credentials: dev/dev"
    exit 1
}

if [ $# -eq 0 ]; then
    echo "🔑 Available SSH connections:"
    echo "  📡 Backend:  ssh dev@localhost -p 2222"
    echo "  🎯 Frontend: ssh dev@localhost -p 2223"
    echo ""
    usage
fi

case "${1,,}" in
    "backend"|"be")
        echo "🔌 Connecting to backend development container..."
        echo "💡 Run 'cd backend && npm run dev' to start the backend if needed"
        ssh dev@localhost -p 2222
        ;;
    "frontend"|"fe")
        echo "🔌 Connecting to frontend development container..."
        echo "💡 Run 'cd frontend && npm run dev' to start the frontend if needed"
        ssh dev@localhost -p 2223
        ;;
    *)
        echo "❌ Unknown target: $1"
        usage
        ;;
esac