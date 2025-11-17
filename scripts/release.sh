#!/bin/bash
#
# Release Helper Script for SvelteHR
# Creates semantic version tags for ArgoCD deployments
#
# Usage:
#   ./scripts/release.sh 1.2.3           # Create specific version
#   ./scripts/release.sh patch           # Bump patch version (0.0.1 -> 0.0.2)
#   ./scripts/release.sh minor           # Bump minor version (0.0.1 -> 0.1.0)
#   ./scripts/release.sh major           # Bump major version (0.0.1 -> 1.0.0)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get latest tag or default to 0.0.0
get_latest_tag() {
    git describe --tags --abbrev=0 2>/dev/null || echo "0.0.0"
}

# Validate semantic version format (supports multi-digit: 0.0.100)
validate_semver() {
    local version=$1
    if ! echo "$version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
        echo -e "${RED}❌ Invalid semantic version: $version${NC}"
        echo "   Must be in format: MAJOR.MINOR.PATCH (e.g., 1.2.3 or 0.0.100)"
        exit 1
    fi
}

# Bump version based on type
bump_version() {
    local current=$1
    local bump_type=$2

    IFS='.' read -r major minor patch <<< "$current"

    case "$bump_type" in
        major)
            echo "$((major + 1)).0.0"
            ;;
        minor)
            echo "${major}.$((minor + 1)).0"
            ;;
        patch)
            echo "${major}.${minor}.$((patch + 1))"
            ;;
        *)
            echo "$bump_type"
            ;;
    esac
}

# Main script
main() {
    if [ $# -eq 0 ]; then
        echo -e "${RED}❌ Version or bump type required${NC}"
        echo ""
        echo "Usage:"
        echo "  $0 1.2.3           # Create version 1.2.3"
        echo "  $0 0.0.100         # Create version 0.0.100 (multi-digit supported)"
        echo "  $0 patch           # Bump patch version"
        echo "  $0 minor           # Bump minor version"
        echo "  $0 major           # Bump major version"
        exit 1
    fi

    # Get current tag
    CURRENT_TAG=$(get_latest_tag)
    echo -e "${BLUE}📌 Current version: $CURRENT_TAG${NC}"

    # Calculate new version
    INPUT=$1
    if [[ "$INPUT" =~ ^(major|minor|patch)$ ]]; then
        NEW_VERSION=$(bump_version "$CURRENT_TAG" "$INPUT")
        echo -e "${YELLOW}🔼 Bumping $INPUT version${NC}"
    else
        NEW_VERSION="$INPUT"
    fi

    # Validate format
    validate_semver "$NEW_VERSION"

    # Check if tag already exists
    if git rev-parse "$NEW_VERSION" >/dev/null 2>&1; then
        echo -e "${RED}❌ Tag $NEW_VERSION already exists${NC}"
        exit 1
    fi

    # Show what will be tagged
    echo -e "${GREEN}✨ New version: $NEW_VERSION${NC}"
    echo ""
    echo "Recent commits since $CURRENT_TAG:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if [ "$CURRENT_TAG" != "0.0.0" ]; then
        git log --pretty=format:"  %C(yellow)%h%C(reset) %s %C(dim)(%ar)%C(reset)" "$CURRENT_TAG"..HEAD | head -10
    else
        git log --pretty=format:"  %C(yellow)%h%C(reset) %s %C(dim)(%ar)%C(reset)" HEAD | head -10
    fi
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Confirm
    read -p "Create and push tag $NEW_VERSION? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⚠️  Cancelled${NC}"
        exit 0
    fi

    # Create annotated tag
    git tag -a "$NEW_VERSION" -m "Release $NEW_VERSION"
    echo -e "${GREEN}✅ Created tag $NEW_VERSION${NC}"

    # Push tag
    git push origin "$NEW_VERSION"
    echo -e "${GREEN}✅ Pushed tag to origin${NC}"

    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🚀 Release $NEW_VERSION created!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Next steps:"
    echo "1. 🐳 Docker images will build automatically"
    echo "2. 📦 Images will be tagged as:"
    echo "   - ghcr.io/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/' | tr '[:upper:]' '[:lower:]')/backend-server:$NEW_VERSION"
    echo "   - ghcr.io/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/' | tr '[:upper:]' '[:lower:]')/frontend:$NEW_VERSION"
    echo "3. 🔄 ArgoCD will detect and deploy the new version"
    echo ""
    echo "Monitor the build:"
    echo "  gh run watch"
}

main "$@"
