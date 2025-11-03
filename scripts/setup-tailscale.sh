#!/bin/bash
set -e

echo "🔧 Setting up Tailscale access for SvelteHR dev environment..."
echo ""

# Check if Tailscale operator is already running
echo "📋 Checking for Tailscale operator..."
if kubectl get deploy operator -n tailscale &>/dev/null; then
    echo "✅ Tailscale operator found in 'tailscale' namespace"
    OPERATOR_NAMESPACE="tailscale"
elif kubectl get deploy operator -n tailscale-operator &>/dev/null; then
    echo "✅ Tailscale operator found in 'tailscale-operator' namespace"
    OPERATOR_NAMESPACE="tailscale-operator"
else
    echo "❌ Tailscale operator not found!"
    echo ""
    echo "To install the operator, run:"
    echo "  helm repo add tailscale https://pkgs.tailscale.com/helmcharts"
    echo "  helm repo update"
    echo "  kubectl create namespace tailscale"
    echo "  helm install tailscale-operator tailscale/tailscale-operator -n tailscale"
    echo ""
    echo "Or follow: https://tailscale.com/kb/1236/kubernetes-operator"
    exit 1
fi

# Apply Tailscale ingress configuration
echo ""
echo "📦 Deploying Tailscale services for SvelteHR..."
kubectl apply -f ./k8s/tailscale-dev-ingress.yaml

echo ""
echo "⏳ Waiting for Tailscale to provision services (this takes ~30 seconds)..."
sleep 5

# Wait for services to be created
kubectl wait --for=jsonpath='{.status.loadBalancer}' \
  svc/sveltehr-dev-frontend-ts \
  svc/sveltehr-dev-backend-ts \
  svc/tilt-ui-ts \
  -n sveltehr-dev \
  --timeout=60s 2>/dev/null || echo "  Services are being provisioned..."

echo ""
echo "✅ Tailscale services deployed!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Getting your Tailscale URLs (wait ~30 seconds if empty)..."
echo ""

# Function to get hostname or show waiting message
get_hostname() {
    local svc=$1
    local hostname=$(kubectl get svc $svc -n sveltehr-dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
    if [ -z "$hostname" ]; then
        echo "  (provisioning...)"
    else
        echo "  https://$hostname"
    fi
}

echo "Frontend:"
get_hostname "sveltehr-dev-frontend-ts"
echo ""
echo "Backend:"
get_hostname "sveltehr-dev-backend-ts"
echo ""
echo "Tilt UI:"
get_hostname "tilt-ui-ts"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo ""
echo "  1. If you're running Tilt, it will auto-detect Tailscale"
echo "     (Restart Tilt if it was already running: tilt down && tilt up)"
echo ""
echo "  2. Check URLs again in 30 seconds:"
echo "     kubectl get svc -n sveltehr-dev | grep -E 'frontend-ts|backend-ts|tilt-ui-ts'"
echo ""
echo "  3. Access from any device on your Tailnet!"
echo ""
echo "Troubleshooting:"
echo "  • Check operator logs: kubectl logs -n $OPERATOR_NAMESPACE -l app=operator"
echo "  • View Tailscale admin: https://login.tailscale.com/admin/machines"
echo ""
echo "See TAILSCALE_ACCESS_GUIDE.md for detailed usage instructions."
echo ""
