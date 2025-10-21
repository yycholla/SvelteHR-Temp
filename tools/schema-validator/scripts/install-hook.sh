#!/bin/bash

##
# Schema Validator Pre-commit Hook Installation Script
# Installs a Git pre-commit hook that runs schema validation on staged files
##

set -e

echo "🔧 Installing Schema Validator pre-commit hook..."

# Check if we're in a Git repository
if [ ! -d ".git" ]; then
  echo "❌ Error: Not a Git repository"
  echo "Run this script from the root of your Git repository"
  exit 1
fi

# Check if Husky is available
if [ -d "node_modules/husky" ]; then
  echo "✓ Found Husky"

  # Initialize Husky if not already initialized
  if [ ! -d ".husky" ]; then
    echo "Initializing Husky..."
    npx husky init
  fi

  # Create pre-commit hook
  cat > .husky/pre-commit << 'HOOK_EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run schema validation on staged files
echo "🔍 Running schema validation on staged files..."

npx schema-validator validate --staged --json > /tmp/schema-validation.log 2>&1

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Schema validation failed!"
  echo "================================================"

  # Show validation errors
  npx schema-validator validate --staged

  echo "================================================"
  echo ""
  echo "Commit blocked due to schema misalignments."
  echo ""
  echo "To fix:"
  echo "  1. Review the errors above"
  echo "  2. Fix the schema misalignments"
  echo "  3. Run: npx schema-validator validate --staged"
  echo "  4. Try committing again"
  echo ""
  echo "To bypass (not recommended):"
  echo "  git commit --no-verify"
  echo ""

  exit 1
fi

echo "✅ Schema validation passed"
HOOK_EOF

  # Make hook executable
  chmod +x .husky/pre-commit

  echo "✅ Pre-commit hook installed successfully!"
  echo ""
  echo "The hook will run on every commit and validate:"
  echo "  - Staged TypeScript files (.ts, .tsx)"
  echo "  - Staged Svelte files (.svelte)"
  echo ""
  echo "To bypass the hook (not recommended):"
  echo "  git commit --no-verify"
  echo ""

else
  echo "⚠️  Husky not found"
  echo ""
  echo "Installing Husky..."
  npm install --save-dev husky

  echo ""
  echo "Husky installed. Run this script again to install the pre-commit hook."
  echo ""
fi
