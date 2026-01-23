#!/bin/bash
# Register QuickBooks webhook subscription via GraphQL

set -e

echo "🔔 Registering QuickBooks Webhook Subscription..."
echo ""

GRAPHQL_URL="http://localhost:4000/graphql"

# GraphQL mutation to register webhook
MUTATION='mutation {
  registerWebhook(entityNames: ["Employee", "Department"]) {
    success
    message
    webhookId
  }
}'

# Execute the mutation
RESPONSE=$(curl -s -X POST "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"$MUTATION\"}")

echo "Response:"
echo "$RESPONSE" | jq '.'

# Check if successful
if echo "$RESPONSE" | jq -e '.data.registerWebhook.success == true' > /dev/null; then
    echo ""
    echo "✅ Webhook subscription registered successfully!"
    WEBHOOK_ID=$(echo "$RESPONSE" | jq -r '.data.registerWebhook.webhookId')
    echo "📝 Webhook ID: $WEBHOOK_ID"
else
    echo ""
    echo "❌ Failed to register webhook subscription"
    echo "Error: $(echo "$RESPONSE" | jq -r '.errors[0].message // "Unknown error"')"
    exit 1
fi
