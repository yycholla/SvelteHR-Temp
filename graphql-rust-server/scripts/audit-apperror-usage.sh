#!/bin/bash

##
## Script: audit-apperror-usage.sh
## Purpose: Audit AppError imports and their actual usage across the codebase
##
## This script:
## 1. Finds all .rs files that import AppError
## 2. Counts actual usage of "AppError::" (excluding import lines)
## 3. Generates a detailed report showing:
##    - Unused imports (imported but not used)
##    - Used imports with usage counts
## 4. Sorts results with unused files first
## 5. Provides summary statistics
##

set -e

# Define project root
PROJECT_ROOT="/home/chanway/SvelteHR/graphql-rust-server"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "================================"
echo "AppError Usage Audit"
echo "================================"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Temporary files for results
UNUSED_FILE=$(mktemp)
USED_FILE=$(mktemp)

# Find all .rs files that import AppError
find src -name "*.rs" -type f | while read file; do
    # Check if file imports AppError
    if grep -q "use.*AppError" "$file"; then
        # Count actual usage of "AppError::" (excluding the import line)
        # Also count standalone "AppError" references that aren't in use statements
        usage_count=$(grep "AppError" "$file" | grep -v "^use.*AppError" | grep -v "^[[:space:]]*//.*AppError" | wc -l)

        if [ "$usage_count" -eq 0 ]; then
            echo "UNUSED|$file|0" >> "$UNUSED_FILE"
        else
            echo "USED|$file|$usage_count" >> "$USED_FILE"
        fi
    fi
done

# Count totals
unused_total=$(wc -l < "$UNUSED_FILE" 2>/dev/null || echo 0)
used_total=$(wc -l < "$USED_FILE" 2>/dev/null || echo 0)

# Display unused imports first
if [ "$unused_total" -gt 0 ]; then
    echo -e "${RED}UNUSED IMPORTS ($unused_total):${NC}"
    echo "========================================"
    sort "$UNUSED_FILE" | while IFS='|' read status file count; do
        echo -e "  ${RED}❌${NC} $(basename $file) → $(dirname $file)"
    done
    echo ""
fi

# Display used imports
if [ "$used_total" -gt 0 ]; then
    echo -e "${GREEN}USED IMPORTS ($used_total):${NC}"
    echo "========================================"
    sort -t'|' -k3 -nr "$USED_FILE" | while IFS='|' read status file count; do
        # Shorten the path for readability
        relative_path="${file#src/}"
        printf "  ${GREEN}✅${NC} %-40s (used %2d times)\n" "$relative_path" "$count"
    done
    echo ""
fi

# Summary statistics
total_files=$((unused_total + used_total))

echo "================================"
echo "Summary"
echo "================================"
echo -e "Total files with AppError:     $total_files"
echo -e "Unused imports:                ${RED}$unused_total${NC}"
echo -e "Used imports:                  ${GREEN}$used_total${NC}"

if [ "$total_files" -gt 0 ]; then
    unused_percentage=$((unused_total * 100 / total_files))
    echo -e "Unused percentage:             ${RED}$unused_percentage%${NC}"
fi

echo ""

# Cleanup
rm "$UNUSED_FILE" "$USED_FILE"

# Exit with error code if there are unused imports
if [ "$unused_total" -gt 0 ]; then
    exit 1
fi

exit 0
