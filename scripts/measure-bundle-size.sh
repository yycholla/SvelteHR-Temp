#!/bin/bash
set -e

echo "=== Bundle Size Measurement ==="
echo "Date: $(date)"
echo "Commit: $(git rev-parse --short HEAD)"
echo ""

# Build production bundle
echo "Building production bundle..."
npm run build

# Measure bundle sizes
echo ""
echo "=== Client Bundle Sizes ==="
du -sh build/client/_app/immutable/chunks/* | sort -hr | head -20

echo ""
echo "=== Total Client Size ==="
du -sh build/client

echo ""
echo "=== Top 10 Largest Files ==="
find build/client -type f -exec du -h {} + | sort -hr | head -10

echo ""
echo "=== JavaScript Totals ==="
find build/client -name "*.js" -exec du -ch {} + | tail -1

echo ""
echo "=== CSS Totals ==="
find build/client -name "*.css" -exec du -ch {} + | tail -1
