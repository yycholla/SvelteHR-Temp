#!/bin/bash
# Install Velero + MinIO backup infrastructure
# Requires: Doppler secrets configured with MinIO and Velero credentials

set -e

echo "================================================"
echo "SvelteHR Backup Infrastructure Installation"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Check if helm is available
if ! command -v helm &> /dev/null; then
    echo -e "${RED}Error: helm is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking Doppler secrets...${NC}"
echo "Please ensure these secrets are set in Doppler:"
echo "  - MINIO_ROOT_USER"
echo "  - MINIO_ROOT_PASSWORD"
echo "  - VELERO_MINIO_ACCESS_KEY"
echo "  - VELERO_MINIO_SECRET_KEY"
echo ""
read -p "Have you configured these secrets in Doppler? (yes/no): " doppler_confirm

if [[ "$doppler_confirm" != "yes" ]]; then
    echo -e "${RED}Please configure Doppler secrets first. See BACKUP-SETUP-GUIDE.md${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Doppler secrets confirmed${NC}"
echo ""

echo -e "${YELLOW}Step 2: Creating backup-system namespace and External Secrets...${NC}"
kubectl apply -f /home/chanway/SvelteHR/k8s/backup-infrastructure/minio-external-secrets.yaml

echo "Waiting for External Secrets to sync from Doppler..."
kubectl wait --for=condition=Ready externalsecret/minio-external-secret -n backup-system --timeout=120s || {
    echo -e "${RED}Failed to sync MinIO secrets from Doppler${NC}"
    echo "Check: kubectl describe externalsecret minio-external-secret -n backup-system"
    exit 1
}

kubectl wait --for=condition=Ready externalsecret/velero-minio-external-secret -n backup-system --timeout=120s || {
    echo -e "${RED}Failed to sync Velero MinIO secrets from Doppler${NC}"
    echo "Check: kubectl describe externalsecret velero-minio-external-secret -n backup-system"
    exit 1
}

echo -e "${GREEN}✓ External Secrets synced successfully${NC}"
echo ""

echo -e "${YELLOW}Step 3: Adding Helm repositories...${NC}"
helm repo add minio https://charts.min.io/ 2>/dev/null || true
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts 2>/dev/null || true
helm repo update

echo -e "${GREEN}✓ Helm repositories updated${NC}"
echo ""

echo -e "${YELLOW}Step 4: Installing MinIO...${NC}"
helm install minio minio/minio \
  --namespace backup-system \
  -f /home/chanway/SvelteHR/k8s/helm-charts/minio-values.yaml

echo "Waiting for MinIO to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=minio -n backup-system --timeout=180s || {
    echo -e "${RED}MinIO failed to start. Check logs: kubectl logs -n backup-system -l app.kubernetes.io/name=minio${NC}"
    exit 1
}

echo -e "${GREEN}✓ MinIO installed and running${NC}"
echo ""

echo -e "${YELLOW}Step 5: Creating Velero credentials External Secret...${NC}"
kubectl apply -f /home/chanway/SvelteHR/k8s/backup-infrastructure/velero-external-secrets.yaml

echo "Waiting for Velero credentials to sync..."
kubectl wait --for=condition=Ready externalsecret/velero-credentials-external-secret -n backup-system --timeout=120s || {
    echo -e "${RED}Failed to sync Velero credentials from Doppler${NC}"
    echo "Check: kubectl describe externalsecret velero-credentials-external-secret -n backup-system"
    exit 1
}

echo -e "${GREEN}✓ Velero credentials synced${NC}"
echo ""

echo -e "${YELLOW}Step 6: Installing Velero...${NC}"
helm install velero vmware-tanzu/velero \
  --namespace backup-system \
  -f /home/chanway/SvelteHR/k8s/helm-charts/velero-values.yaml

echo "Waiting for Velero to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=velero -n backup-system --timeout=180s || {
    echo -e "${RED}Velero failed to start. Check logs: kubectl logs -n backup-system -l app.kubernetes.io/name=velero${NC}"
    exit 1
}

echo -e "${GREEN}✓ Velero installed and running${NC}"
echo ""

echo -e "${YELLOW}Step 7: Verifying backup configuration...${NC}"

# Check if velero CLI is installed
if ! command -v velero &> /dev/null; then
    echo -e "${YELLOW}Warning: velero CLI not found. Installing...${NC}"

    # Detect OS
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)

    if [[ "$ARCH" == "x86_64" ]]; then
        ARCH="amd64"
    elif [[ "$ARCH" == "aarch64" ]]; then
        ARCH="arm64"
    fi

    VELERO_VERSION="v1.15.0"
    VELERO_URL="https://github.com/vmware-tanzu/velero/releases/download/${VELERO_VERSION}/velero-${VELERO_VERSION}-${OS}-${ARCH}.tar.gz"

    echo "Downloading Velero CLI from ${VELERO_URL}..."
    curl -L "$VELERO_URL" -o /tmp/velero.tar.gz
    tar -xzf /tmp/velero.tar.gz -C /tmp
    sudo mv "/tmp/velero-${VELERO_VERSION}-${OS}-${ARCH}/velero" /usr/local/bin/
    rm -rf /tmp/velero*

    echo -e "${GREEN}✓ Velero CLI installed${NC}"
fi

echo ""
echo "Checking backup storage location..."
velero backup-location get || {
    echo -e "${RED}Failed to get backup location. Check Velero logs.${NC}"
    exit 1
}

echo ""
echo "Checking backup schedules..."
velero schedule get || {
    echo -e "${RED}Failed to get backup schedules. Check Velero logs.${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✓ Backup infrastructure installed successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Verify MinIO console (optional):"
echo "   kubectl port-forward svc/minio-console -n backup-system 9001:9001"
echo "   Open: http://localhost:9001"
echo ""
echo "2. Create a test backup:"
echo "   velero backup create test-backup --include-namespaces sveltehr-prod --wait"
echo ""
echo "3. Monitor backup schedules:"
echo "   - Daily backups: Every day at 2 AM (30-day retention)"
echo "   - Weekly backups: Every Sunday at 3 AM (90-day retention)"
echo ""
echo "4. View backups:"
echo "   velero backup get"
echo ""
echo "For more information, see: k8s/BACKUP-SETUP-GUIDE.md"
