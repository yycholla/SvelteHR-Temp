#!/bin/bash
# Mutation Testing Script
# Runs cargo-mutants to validate test quality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}     Mutation Testing with cargo-mutants${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if cargo-mutants is installed
if ! command -v cargo-mutants &> /dev/null; then
    echo -e "${YELLOW}cargo-mutants not found. Installing...${NC}"
    cargo install cargo-mutants
    echo -e "${GREEN}cargo-mutants installed successfully${NC}"
    echo ""
fi

# Parse command line arguments
MODE="${1:-quick}"

case $MODE in
    quick)
        echo -e "${BLUE}Running QUICK mutation testing (schema module only)${NC}"
        echo "This tests only the schema/ directory for faster feedback"
        echo ""
        cargo mutants --dir src/schema/ --timeout 300
        ;;

    auth)
        echo -e "${BLUE}Running mutation testing on AUTH module${NC}"
        echo "This tests only the auth/ directory"
        echo ""
        cargo mutants --dir src/auth/ --timeout 300
        ;;

    models)
        echo -e "${BLUE}Running mutation testing on MODELS${NC}"
        echo "This tests only the models/ directory"
        echo ""
        cargo mutants --dir src/models/ --timeout 300
        ;;

    full)
        echo -e "${BLUE}Running FULL mutation testing${NC}"
        echo -e "${YELLOW}WARNING: This may take 30-60 minutes${NC}"
        echo ""
        read -p "Continue? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cargo mutants --timeout 600
        else
            echo -e "${RED}Cancelled${NC}"
            exit 0
        fi
        ;;

    list)
        echo -e "${BLUE}Listing all mutation points (dry run)${NC}"
        echo ""
        cargo mutants --list
        ;;

    diff)
        echo -e "${BLUE}Running with diff output${NC}"
        echo "This shows the exact mutations being tested"
        echo ""
        cargo mutants --dir src/schema/ --in-diff --timeout 300
        ;;

    json)
        echo -e "${BLUE}Generating JSON report${NC}"
        echo ""
        cargo mutants --json --output mutants.json --timeout 600
        echo -e "${GREEN}JSON report saved to mutants.json${NC}"
        ;;

    *)
        echo -e "${RED}Unknown mode: $MODE${NC}"
        echo ""
        echo "Usage: $0 [MODE]"
        echo ""
        echo "Available modes:"
        echo "  quick    - Test schema module only (fast, ~5-10 min)"
        echo "  auth     - Test auth module only (~5-10 min)"
        echo "  models   - Test models module only (~5-10 min)"
        echo "  full     - Test entire codebase (slow, 30-60 min)"
        echo "  list     - List all mutation points without testing"
        echo "  diff     - Show diffs of mutations being tested"
        echo "  json     - Generate JSON report"
        echo ""
        echo "Examples:"
        echo "  $0 quick      # Fast feedback on schema tests"
        echo "  $0 full       # Comprehensive mutation testing"
        echo "  $0 list       # See what will be tested"
        exit 1
        ;;
esac

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Mutation testing completed${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Results saved to: mutants.out/"
    echo ""
    echo "To view results:"
    echo "  - HTML report: open mutants.out/mutants.html"
    echo "  - Text report: cat mutants.out/mutants.txt"
    echo "  - Caught mutants: cat mutants.out/caught.txt"
    echo "  - Missed mutants: cat mutants.out/missed.txt"
    echo ""
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  Mutation testing failed${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Check the output above for errors"
    exit 1
fi
