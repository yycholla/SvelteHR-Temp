#!/bin/bash
# Start Tailscale Funnel for QuickBooks webhook testing
# Provides a stable, private HTTPS URL that doesn't change

set -e

echo "🔐 Starting Tailscale Funnel for QuickBooks webhooks..."
echo ""

# Check if tailscale is installed
if ! command -v tailscale &> /dev/null; then
    echo "❌ Tailscale is not installed"
    echo ""
    echo "Install Tailscale:"
    echo "  macOS:  brew install tailscale"
    echo "  Linux:  curl -fsSL https://tailscale.com/install.sh | sh"
    echo ""
    echo "After installation, authenticate:"
    echo "  sudo tailscale up"
    exit 1
fi

# Check if tailscale is running and authenticated
if ! tailscale status &> /dev/null; then
    echo "❌ Tailscale is not running or not authenticated"
    echo ""
    echo "Start Tailscale:"
    echo "  sudo tailscale up"
    echo ""
    echo "If you don't have an account, sign up at https://tailscale.com"
    exit 1
fi

# Get tailnet name and device name for the URL
TAILNET_NAME=$(tailscale status --json | jq -r '.Self.DNSName' | sed 's/\.$//' | cut -d. -f2-)
DEVICE_NAME=$(tailscale status --json | jq -r '.Self.DNSName' | sed 's/\.$//' | cut -d. -f1)

if [ -z "$TAILNET_NAME" ] || [ -z "$DEVICE_NAME" ]; then
    echo "❌ Failed to get Tailscale device information"
    echo ""
    echo "Make sure Tailscale is properly connected:"
    echo "  tailscale status"
    exit 1
fi

# Construct the Tailscale URL
TAILSCALE_URL="https://${DEVICE_NAME}.${TAILNET_NAME}"
FULL_WEBHOOK_ENDPOINT="${TAILSCALE_URL}/api/intuit/webhook"

echo "📡 Tailscale Device: $DEVICE_NAME"
echo "🌐 Tailnet: $TAILNET_NAME"
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
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Webhook Endpoint: $FULL_WEBHOOK_ENDPOINT"
echo "🔗 Stable URL:       $TAILSCALE_URL"
echo "🔒 Security:         Private Tailscale network + Funnel (public)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✨ Advantages over ngrok:"
echo "  ✅ URL never changes (consistent across restarts)"
echo "  ✅ Private network security"
echo "  ✅ No rate limits"
echo "  ✅ Free for personal use"
echo ""
echo "📋 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
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
echo "   → docker logs -f sveltehr-graphql-rust | grep webhook"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 This URL is stable and won't change!"
echo "   You only need to configure QuickBooks once."
echo ""
echo "Press Ctrl+C to stop Tailscale Funnel"
echo ""

# Keep script running and handle Ctrl+C gracefully
trap cleanup EXIT INT TERM

cleanup() {
    echo ""
    echo "🛑 Stopping Tailscale Funnel..."
    tailscale funnel off 2>/dev/null || true

    # Optionally restore original .env
    if [ -f "$ENV_FILE" ]; then
        sed -i.tmp '/INTUIT_WEBHOOK_URL=/d' "$ENV_FILE" && rm "$ENV_FILE.tmp" || true
        echo "✅ Removed INTUIT_WEBHOOK_URL from $ENV_FILE"
        echo "   Remember to restart your backend if it's still running"
    fi

    echo "👋 Funnel stopped"
    exit 0
}

# Start Tailscale Funnel in foreground (keeps script running)
echo "🟢 Starting Tailscale Funnel..."
echo ""
tailscale funnel 4000
