#!/bin/bash
# Extract complete API catalog from frontend GraphQL operations

set -e

OUTPUT_FILE="COMPLETE_API_CATALOG.md"
echo "# Complete API Catalog - SvelteHR" > "$OUTPUT_FILE"
echo "**Generated: $(date '+%Y-%m-%d %H:%M:%S')**" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "This document catalogs every GraphQL operation used by the frontend." >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Find all GraphQL operation files
FILES=$(find ../../src/lib/graphql -name "*.ts" -type f ! -name "*.bak" ! -name "client.ts" ! -name "config.ts" ! -name "types.ts" | sort)

for FILE in $FILES; do
    FILENAME=$(basename "$FILE")
    RELATIVE_PATH=$(echo "$FILE" | sed 's|.*/src/|src/|')

    echo "## File: \`$RELATIVE_PATH\`" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"

    # Extract all gql queries and mutations
    # Look for patterns like: export const QUERY_NAME = gql`
    grep -A 50 "export const.*= gql\`" "$FILE" 2>/dev/null | while IFS= read -r line; do
        if [[ "$line" =~ export\ const\ ([A-Z_]+)\ =\ gql ]]; then
            QUERY_NAME="${BASH_REMATCH[1]}"
            echo "### \`$QUERY_NAME\`" >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
            echo '```graphql' >> "$OUTPUT_FILE"
        elif [[ "$line" == *"\`;"* ]]; then
            echo '```' >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
            break
        else
            echo "$line" >> "$OUTPUT_FILE"
        fi
    done

    echo "" >> "$OUTPUT_FILE"
    echo "---" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

echo "✅ Complete API catalog generated: $OUTPUT_FILE"
