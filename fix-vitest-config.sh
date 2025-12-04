#!/bin/bash
# Script to apply vitest.config.ts fixes
# Based on TEST_SUITE_FIX_IMPLEMENTATION.md

set -e

echo "Applying vitest.config.ts fixes..."

# Fix 1: Update unit-client includes (remove .svelte requirement)
sed -i "111,115s/'src\/\*\*\/\*.svelte.{test,spec}.{js,ts}',/'tests\/unit\/components\/\*\*\/*.{test,spec}.{js,ts}',/" vitest.config.ts
sed -i "111,115s/'tests\/unit\/\*\*\/\*.svelte.{test,spec}.{js,ts}',//" vitest.config.ts

# Fix 2: Update component-browser includes (correct directory)
sed -i "s/'tests\/unit\/components\/\*\*\/\*.browser.{test,spec}.{js,ts}'/'tests\/e2e\/\*\*\/*\.browser.{test,spec}.{js,ts}'/g" vitest.config.ts

# Fix 3: Update graphql-performance includes
sed -i "s/'tests\/performance\/graphql\/\*\*\/\*.{test,spec}.{js,ts}'/'tests\/performance\/\*\*\/*graphql\*.{test,spec}.{js,ts}'/g" vitest.config.ts

# Fix 4: Remove non-existent graphql subdirectory from graphql-schema
sed -i "/tests\/contract\/graphql\/\*\*\/\*.{test,spec}.{js,ts}/d" vitest.config.ts

echo "✅ Fixes applied successfully!"
echo ""
echo "Next steps:"
echo "1. Add e2e-playwright project manually (see TEST_SUITE_FIX_IMPLEMENTATION.md Fix 5)"
echo "2. Add security project manually (see TEST_SUITE_FIX_IMPLEMENTATION.md Fix 6)"
echo "3. Update package.json scripts"
echo "4. Run: npm run vitest -- --project=unit-client --run"
echo ""
echo "Backup saved as: vitest.config.ts.backup"
