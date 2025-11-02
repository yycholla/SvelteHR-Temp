#!/bin/bash
set -e

echo "🔄 Resetting Tilt development environment..."
echo ""

# Step 1: Stop Tilt (if running)
echo "1️⃣  Stopping Tilt..."
pkill -f "tilt up" 2>/dev/null && echo "   ✅ Tilt stopped" || echo "   ℹ️  Tilt not running"
sleep 2

# Step 2: Delete namespace
echo ""
echo "2️⃣  Deleting namespace sveltehr-dev..."
kubectl delete namespace sveltehr-dev --timeout=30s 2>/dev/null && echo "   ✅ Namespace deleted" || echo "   ℹ️  Namespace already deleted"

# Step 3: Wait for namespace deletion
echo ""
echo "3️⃣  Waiting for namespace deletion to complete..."
while kubectl get namespace sveltehr-dev &>/dev/null; do
  echo "   ⏳ Waiting..."
  sleep 2
done
echo "   ✅ Namespace fully removed"

# Step 4: Update Helm dependencies
echo ""
echo "4️⃣  Updating Helm chart dependencies..."
cd k8s/helm-charts/sveltehr
helm dependency update
echo "   ✅ Dependencies updated"
cd ../../..

# Step 5: Recreate namespace
echo ""
echo "5️⃣  Creating fresh namespace..."
kubectl create namespace sveltehr-dev
echo "   ✅ Namespace created"

echo ""
echo "════════════════════════════════════════════════"
echo "✅ Reset complete!"
echo "════════════════════════════════════════════════"
echo ""
echo "Now run: npm run dev:k8s"
echo ""
