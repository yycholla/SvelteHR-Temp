#!/usr/bin/env bash
# Entity generation script for SeaORM migration
#
# Regenerates SeaORM entities from the database schema
# Usage: ./scripts/generate_entities.sh [database_url]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODELS_DIR="${PROJECT_ROOT}/graphql-rust-server/src/models/generated"
DATABASE_URL="${1:-${DATABASE_URL:-}}"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not provided${NC}"
    echo "Usage: $0 [database_url]"
    echo "Or set DATABASE_URL environment variable"
    exit 1
fi

echo -e "${GREEN}SeaORM Entity Generation${NC}"
echo "======================================"
echo "Project Root: $PROJECT_ROOT"
echo "Models Directory: $MODELS_DIR"
echo "Database URL: ${DATABASE_URL//:*@/:***@}"  # Hide password
echo ""

# Check if sea-orm-cli is installed
if ! command -v sea-orm-cli &> /dev/null; then
    echo -e "${YELLOW}sea-orm-cli not found. Installing...${NC}"
    cargo install sea-orm-cli
fi

# Create generated directory if it doesn't exist
mkdir -p "$MODELS_DIR"

# Backup existing generated entities
if [ -d "$MODELS_DIR" ] && [ "$(ls -A $MODELS_DIR)" ]; then
    BACKUP_DIR="${MODELS_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${YELLOW}Backing up existing entities to: $BACKUP_DIR${NC}"
    cp -r "$MODELS_DIR" "$BACKUP_DIR"
fi

# Generate entities from database
echo -e "${GREEN}Generating SeaORM entities...${NC}"
cd "$PROJECT_ROOT/graphql-rust-server"

sea-orm-cli generate entity \
    --database-url "$DATABASE_URL" \
    --output-dir "src/models/generated" \
    --with-serde both \
    --date-time-crate chrono \
    --expanded-format

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Entity generation completed successfully!${NC}"
    echo ""
    echo "Generated entities in: $MODELS_DIR"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Review generated entities in $MODELS_DIR"
    echo "2. Update custom entity files to use generated base entities"
    echo "3. Run 'cargo test' to verify changes"
    echo "4. Update GraphQL schema if needed"
else
    echo -e "${RED}✗ Entity generation failed!${NC}"
    exit 1
fi
