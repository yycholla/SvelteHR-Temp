#!/bin/bash
# Start ngrok tunnel and update .env with webhook URL for QuickBooks development

set -e

echo "🚀 Starting ngrok tunnel for QuickBooks webhooks..."
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed"
    echo ""
    echo "Install ngrok:"
    echo "  macOS:  brew install ngrok"
    echo "  Linux:  See https://ngrok.com/download"
    echo ""
    echo "After installation, sign up and authenticate:"
    echo "  ngrok config add-authtoken <your_token>"
    exit 1
fi

# Start ngrok in background
echo "Starting ngrok tunnel on port 4000..."
ngrok http 4000 --log=stdout > /tmp/ngrok.log &
NGROK_PID=$!

# Wait for ngrok to start
echo "Waiting for ngrok to initialize..."
sleep 3

# Get ngrok public URL
WEBHOOK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url' 2>/dev/null)

if [ -z "$WEBHOOK_URL" ] || [ "$WEBHOOK_URL" = "null" ]; then
    echo "❌ Failed to get ngrok URL"
    echo ""
    echo "Troubleshooting:"
    echo "1. Make sure ngrok is authenticated: ngrok config add-authtoken <your_token>"
    echo "2. Check if port 4000 is already in use"
    echo "3. View ngrok logs: tail -f /tmp/ngrok.log"
    kill $NGROK_PID 2>/dev/null || true
    exit 1
fi

# Ensure HTTPS
WEBHOOK_URL="${WEBHOOK_URL/http:/https:}"
FULL_WEBHOOK_ENDPOINT="$WEBHOOK_URL/api/intuit/webhook"

echo ""
echo "✅ Ngrok tunnel started successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Webhook Endpoint: $FULL_WEBHOOK_ENDPOINT"
echo "🌐 Ngrok Dashboard:   http://localhost:4040"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Update .env file
ENV_FILE="graphql-rust-server/.env"
if [ -f "$ENV_FILE" ]; then
    # Backup original .env
    cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%s)"

    # Remove old INTUIT_WEBHOOK_URL
    sed -i.tmp '/INTUIT_WEBHOOK_URL=/d' "$ENV_FILE" && rm "$ENV_FILE.tmp" || true

    # Add new URL
    echo "INTUIT_WEBHOOK_URL=$FULL_WEBHOOK_ENDPOINT" >> "$ENV_FILE"
    echo "✅ Updated $ENV_FILE with webhook URL"
else
    echo "⚠️  $ENV_FILE not found"
    echo "   Please set INTUIT_WEBHOOK_URL manually in your environment:"
    echo "   export INTUIT_WEBHOOK_URL=$FULL_WEBHOOK_ENDPOINT"
fi

echo ""
echo "📋 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Restart your backend to load new webhook URL:"
echo "   → make dev-rebuild"
echo ""
echo "2. Register webhook in QuickBooks Developer Portal:"
echo "   → https://developer.intuit.com/app/developer/dashboard"
echo "   → Select your app → Webhooks → Add Webhook"
echo "   → Endpoint URL: $FULL_WEBHOOK_ENDPOINT"
echo "   → Entities: Employee, Department"
echo ""
echo "3. Test by making a change in QuickBooks"
echo ""
echo "4. Monitor webhook events:"
echo "   → docker logs -f sveltehr-backend-dev | grep webhook"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  Note: Free ngrok URLs change on restart"
echo "   For a static URL, upgrade to ngrok paid ($8/mo)"
echo ""
echo "Press Ctrl+C to stop ngrok tunnel"
echo ""

# Keep script running and handle Ctrl+C gracefully
trap cleanup EXIT INT TERM

cleanup() {
    echo ""
    echo "🛑 Stopping ngrok tunnel..."
    kill $NGROK_PID 2>/dev/null || true

    # Optionally restore original .env
    if [ -f "$ENV_FILE" ]; then
        sed -i.tmp '/INTUIT_WEBHOOK_URL=/d' "$ENV_FILE" && rm "$ENV_FILE.tmp" || true
        echo "✅ Removed INTUIT_WEBHOOK_URL from $ENV_FILE"
        echo "   Remember to restart your backend if it's still running"
    fi

    echo "👋 Tunnel stopped"
    exit 0
}

wait $NGROK_PID
