#!/bin/bash

# Simple script to configure kubectl for k3s
# Run this after manually copying the kubeconfig

echo "Configuring kubectl for k3s..."

# Create .kube directory
mkdir -p ~/.kube

# Copy k3s config (you need to do this manually first)
# sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
# sudo chown $(id -u):$(id -g) ~/.kube/config

echo "Please run these commands manually first:"
echo "sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config"
echo "sudo chown \$(id -u):\$(id -g) ~/.kube/config"
echo ""
echo "Then run this script again."

# Check if config exists
if [ -f ~/.kube/config ]; then
    echo "✅ Kubeconfig found"
    kubectl config current-context
    kubectl get nodes
else
    echo "❌ Kubeconfig not found. Please run the sudo commands above first."
fi