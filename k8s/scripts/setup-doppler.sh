#!/bin/bash
# Interactive Doppler setup script for SvelteHR
# This script guides you through configuring External Secrets with Doppler

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}    SvelteHR Doppler Integration Setup${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if External Secrets Operator is installed
echo -e "${YELLOW}[1/7] Checking External Secrets Operator...${NC}"
if kubectl get deployment external-secrets -n external-secrets-system &> /dev/null; then
    echo -e "${GREEN}✓ External Secrets Operator is installed${NC}"
else
    echo -e "${RED}✗ External Secrets Operator not found!${NC}"
    echo "Please install it first:"
    echo "  helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace --set installCRDs=true"
    exit 1
fi
echo ""

# Display current secrets
echo -e "${YELLOW}[2/7] Current production secrets:${NC}"
echo -e "${BLUE}------------------------------------------------${NC}"
NAMESPACE="sveltehr-prod"
POSTGRES_PWD=$(kubectl get secret sveltehr-secrets -n $NAMESPACE -o jsonpath="{.data.postgres-password}" 2>/dev/null | base64 -d 2>/dev/null || echo "")
JWT_SECRET=$(kubectl get secret sveltehr-secrets -n $NAMESPACE -o jsonpath="{.data.jwt-secret}" 2>/dev/null | base64 -d 2>/dev/null || echo "")
JWT_REFRESH=$(kubectl get secret sveltehr-secrets -n $NAMESPACE -o jsonpath="{.data.jwt-refresh-secret}" 2>/dev/null | base64 -d 2>/dev/null || echo "")
SERVICE_KEY=$(kubectl get secret sveltehr-secrets -n $NAMESPACE -o jsonpath="{.data.service-auth-key}" 2>/dev/null | base64 -d 2>/dev/null || echo "")
PGADMIN_PWD=$(kubectl get secret pgadmin-secret -n $NAMESPACE -o jsonpath="{.data.pgadmin-password}" 2>/dev/null | base64 -d 2>/dev/null || echo "")

echo -e "POSTGRES_PASSWORD=${GREEN}${POSTGRES_PWD}${NC}"
echo -e "JWT_SECRET=${GREEN}${JWT_SECRET}${NC}"
echo -e "JWT_REFRESH_SECRET=${GREEN}${JWT_REFRESH}${NC}"
echo -e "SERVICE_AUTH_KEY=${GREEN}${SERVICE_KEY}${NC}"
echo -e "PGADMIN_PASSWORD=${GREEN}${PGADMIN_PWD}${NC}"
echo -e "${BLUE}------------------------------------------------${NC}"
echo ""
echo -e "${YELLOW}Copy these values to your Doppler dashboard with UPPERCASE keys.${NC}"
echo ""

# Prompt for Doppler project name
echo -e "${YELLOW}[3/7] Doppler project configuration:${NC}"
read -p "Enter Doppler project name [sveltehr]: " DOPPLER_PROJECT
DOPPLER_PROJECT=${DOPPLER_PROJECT:-sveltehr}
echo -e "${GREEN}Using project: ${DOPPLER_PROJECT}${NC}"
echo ""

# Prompt for Doppler config name
read -p "Enter Doppler config name [prod]: " DOPPLER_CONFIG
DOPPLER_CONFIG=${DOPPLER_CONFIG:-prod}
echo -e "${GREEN}Using config: ${DOPPLER_CONFIG}${NC}"
echo ""

# Prompt for service token
echo -e "${YELLOW}[4/7] Doppler service token:${NC}"
echo "1. Go to: https://dashboard.doppler.com/"
echo "2. Navigate to: ${DOPPLER_PROJECT} → ${DOPPLER_CONFIG} → Access → Service Tokens"
echo "3. Generate a READ-ONLY service token"
echo "4. Copy the token (starts with dp.st.${DOPPLER_CONFIG}.xxxx)"
echo ""
read -sp "Paste Doppler service token: " DOPPLER_TOKEN
echo ""

if [ -z "$DOPPLER_TOKEN" ]; then
    echo -e "${RED}✗ Service token is required!${NC}"
    exit 1
fi

if [[ ! $DOPPLER_TOKEN =~ ^dp\.st\. ]]; then
    echo -e "${RED}✗ Invalid token format. Token should start with 'dp.st.'${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Token received${NC}"
echo ""

# Update values-prod.yaml
echo -e "${YELLOW}[5/7] Updating values-prod.yaml...${NC}"
VALUES_FILE="/home/chanway/SvelteHR/k8s/helm-charts/sveltehr/values-prod.yaml"

if [ ! -f "$VALUES_FILE" ]; then
    echo -e "${RED}✗ values-prod.yaml not found at $VALUES_FILE${NC}"
    exit 1
fi

# Create backup
cp "$VALUES_FILE" "${VALUES_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✓ Backup created${NC}"

# Use yq to update YAML if available, otherwise use sed
if command -v yq &> /dev/null; then
    yq eval ".externalSecrets.enabled = true" -i "$VALUES_FILE"
    yq eval ".externalSecrets.doppler.serviceToken = \"${DOPPLER_TOKEN}\"" -i "$VALUES_FILE"
    yq eval ".externalSecrets.doppler.project = \"${DOPPLER_PROJECT}\"" -i "$VALUES_FILE"
    yq eval ".externalSecrets.doppler.config = \"${DOPPLER_CONFIG}\"" -i "$VALUES_FILE"
    echo -e "${GREEN}✓ Updated with yq${NC}"
else
    # Fallback to sed
    sed -i "s|enabled: false  # Set to true after configuring Doppler|enabled: true  # Doppler configured|" "$VALUES_FILE"
    sed -i "s|serviceToken: \"\"  # TODO: Add Doppler service token.*|serviceToken: \"${DOPPLER_TOKEN}\"|" "$VALUES_FILE"
    sed -i "s|project: \"sveltehr\"|project: \"${DOPPLER_PROJECT}\"|" "$VALUES_FILE"
    sed -i "s|config: \"prod\"|config: \"${DOPPLER_CONFIG}\"|" "$VALUES_FILE"
    echo -e "${GREEN}✓ Updated with sed${NC}"
fi
echo ""

# Show what was updated
echo -e "${BLUE}Updated configuration:${NC}"
grep -A 10 "externalSecrets:" "$VALUES_FILE" | grep -A 5 "doppler:"
echo ""

# Deploy with Helm
echo -e "${YELLOW}[6/7] Deploy with updated configuration?${NC}"
echo "This will upgrade the sveltehr-prod Helm release with External Secrets enabled."
read -p "Proceed with Helm upgrade? (y/n): " PROCEED

if [[ $PROCEED =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Running Helm upgrade...${NC}"
    helm upgrade sveltehr-prod /home/chanway/SvelteHR/k8s/helm-charts/sveltehr \
        -n sveltehr-prod \
        -f /home/chanway/SvelteHR/k8s/helm-charts/sveltehr/values.yaml \
        -f /home/chanway/SvelteHR/k8s/helm-charts/sveltehr/values-prod.yaml

    echo -e "${GREEN}✓ Helm upgrade complete${NC}"
    echo ""

    # Wait for ExternalSecrets to sync
    echo -e "${YELLOW}Waiting for ExternalSecrets to sync (this may take up to 1 minute)...${NC}"
    sleep 5

    # Check sync status
    echo -e "${YELLOW}[7/7] Verifying External Secrets sync...${NC}"
    if kubectl wait --for=condition=Ready externalsecret sveltehr-external-secrets -n sveltehr-prod --timeout=60s 2>/dev/null; then
        echo -e "${GREEN}✓ sveltehr-external-secrets synced successfully!${NC}"
    else
        echo -e "${YELLOW}⚠ sveltehr-external-secrets sync pending, check status:${NC}"
        kubectl get externalsecret sveltehr-external-secrets -n sveltehr-prod
    fi

    if kubectl wait --for=condition=Ready externalsecret pgadmin-external-secret -n sveltehr-prod --timeout=60s 2>/dev/null; then
        echo -e "${GREEN}✓ pgadmin-external-secret synced successfully!${NC}"
    else
        echo -e "${YELLOW}⚠ pgadmin-external-secret sync pending, check status:${NC}"
        kubectl get externalsecret pgadmin-external-secret -n sveltehr-prod
    fi

    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}  Doppler Integration Complete! 🎉${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Verify secrets are syncing:"
    echo "   kubectl get externalsecret -n sveltehr-prod"
    echo ""
    echo "2. Restart pods to pick up new secrets:"
    echo "   kubectl rollout restart deployment sveltehr-backend -n sveltehr-prod"
    echo "   kubectl rollout restart deployment sveltehr-frontend -n sveltehr-prod"
    echo ""
    echo "3. Monitor pod status:"
    echo "   kubectl get pods -n sveltehr-prod -w"
    echo ""
    echo -e "${BLUE}Secrets are now managed via Doppler!${NC}"
    echo "Dashboard: https://dashboard.doppler.com/workplace/projects/${DOPPLER_PROJECT}/configs/${DOPPLER_CONFIG}"
else
    echo -e "${YELLOW}Skipping Helm upgrade.${NC}"
    echo ""
    echo "values-prod.yaml has been updated with Doppler configuration."
    echo "You can deploy manually later with:"
    echo "  helm upgrade sveltehr-prod k8s/helm-charts/sveltehr \\"
    echo "    -n sveltehr-prod \\"
    echo "    -f k8s/helm-charts/sveltehr/values.yaml \\"
    echo "    -f k8s/helm-charts/sveltehr/values-prod.yaml"
fi
