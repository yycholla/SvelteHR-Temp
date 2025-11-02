#!/bin/bash

##
## Script: remove-unused-fromqueryresult.sh
## Purpose: Remove unused FromQueryResult imports from model files
##
## This script:
## 1. Identifies model files that import FromQueryResult
## 2. Checks if FromQueryResult is actually used in the code
## 3. Removes the import if it's unused
## 4. Verifies changes with 'cargo check --lib'
## 5. Reverts changes if compilation fails
## 6. Reports status for each file processed
##

set -e

# Define project root
PROJECT_ROOT="/home/chanway/SvelteHR/graphql-rust-server"
MODELS_DIR="$PROJECT_ROOT/src/models"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track statistics
REMOVED=0
FAILED=0
SKIPPED=0
CHECKED=0

# Array of files to process
declare -a FILES=(
    "$MODELS_DIR/department.rs"
    "$MODELS_DIR/task.rs"
    "$MODELS_DIR/event.rs"
    "$MODELS_DIR/user.rs"
    "$MODELS_DIR/leave_request.rs"
)

echo "================================"
echo "FromQueryResult Import Cleanup"
echo "================================"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Process each file
for file in "${FILES[@]}"; do
    CHECKED=$((CHECKED + 1))

    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}⏭️  SKIPPED${NC}: $file (file not found)"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    filename=$(basename "$file")

    # Check if file imports FromQueryResult
    if ! grep -q "FromQueryResult" "$file"; then
        echo -e "${YELLOW}⏭️  SKIPPED${NC}: $filename (no FromQueryResult import)"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # Count occurrences of FromQueryResult (excluding import line)
    # This counts lines that contain "FromQueryResult" and are not part of an import statement
    usage_count=$(grep "FromQueryResult" "$file" | grep -v "use.*FromQueryResult" | wc -l)

    if [ "$usage_count" -eq 0 ]; then
        # FromQueryResult is imported but not used
        echo -n "Processing $filename... "

        # Backup the file
        cp "$file" "$file.bak"

        # Remove FromQueryResult from the import statement
        # Handle cases like:
        # - use sea_orm::{..., FromQueryResult, ...};
        # - use sea_orm::{FromQueryResult, ...};
        # - use sea_orm::{..., FromQueryResult};
        sed -i 's/, FromQueryResult//g; s/FromQueryResult, //g' "$file"

        # Run cargo check to verify
        if cargo check --lib > /dev/null 2>&1; then
            echo -e "${GREEN}✅ REMOVED${NC}"
            rm "$file.bak"
            REMOVED=$((REMOVED + 1))
        else
            # Revert on failure
            mv "$file.bak" "$file"
            echo -e "${RED}❌ FAILED${NC} (reverted due to compilation error)"
            FAILED=$((FAILED + 1))
        fi
    else
        echo -e "${GREEN}✅ USED${NC} ($usage_count times): $filename"
        SKIPPED=$((SKIPPED + 1))
    fi
done

echo ""
echo "================================"
echo "Summary"
echo "================================"
echo "Files checked:  $CHECKED"
echo -e "Imports removed: ${GREEN}$REMOVED${NC}"
echo -e "Failed:         ${RED}$FAILED${NC}"
echo -e "Skipped:        ${YELLOW}$SKIPPED${NC}"
echo ""
