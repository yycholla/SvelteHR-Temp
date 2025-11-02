#!/bin/bash
# Export current Kubernetes secrets in format ready for Doppler
# This helps migrate existing secrets to Doppler

set -e

NAMESPACE="${1:-sveltehr-prod}"
SECRET_NAME="sveltehr-secrets"

echo "================================================"
echo "Exporting secrets from: $NAMESPACE/$SECRET_NAME"
echo "================================================"
echo ""
echo "Copy these values to your Doppler dashboard:"
echo "https://dashboard.doppler.com/"
echo ""
echo "IMPORTANT: Use UPPERCASE keys in Doppler!"
echo ""
echo "-------------------------------------------"

# Function to decode and display secret
get_secret() {
    local key=$1
    local value=$(kubectl get secret $SECRET_NAME -n $NAMESPACE -o jsonpath="{.data.$key}" 2>/dev/null | base64 -d 2>/dev/null || echo "")

    if [ -n "$value" ]; then
        # Convert key to uppercase for Doppler
        local upper_key=$(echo "$key" | tr '[:lower:]' '[:upper:]' | tr '-' '_')
        echo "$upper_key=$value"
    fi
}

# Export each secret
get_secret "postgres-password"
get_secret "jwt-secret"
get_secret "jwt-refresh-secret"
get_secret "service-auth-key"

echo ""
echo "-------------------------------------------"
echo "pgAdmin secret:"
echo "-------------------------------------------"
PGADMIN_SECRET=$(kubectl get secret pgadmin-secret -n $NAMESPACE -o jsonpath="{.data.pgadmin-password}" 2>/dev/null | base64 -d 2>/dev/null || echo "")
if [ -n "$PGADMIN_SECRET" ]; then
    echo "PGADMIN_PASSWORD=$PGADMIN_SECRET"
else
    echo "PGADMIN_PASSWORD=<not-found>"
fi

echo ""
echo "-------------------------------------------"
echo "Next steps:"
echo "-------------------------------------------"
echo "1. Go to https://dashboard.doppler.com/"
echo "2. Create a project named 'sveltehr'"
echo "3. Create a config named 'prod'"
echo "4. Add the secrets above with UPPERCASE keys"
echo "5. Generate a service token (Settings -> Service Tokens)"
echo "6. Use read-only permissions for the token"
echo ""
