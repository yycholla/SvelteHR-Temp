#!/bin/bash

################################################################################
# Kubernetes Cleanup Script
#
# This script completely removes an existing Kubernetes installation to prepare
# for a fresh deployment.
#
# WARNING: This will destroy ALL Kubernetes resources and data!
# Only run this if you're sure you want to start fresh.
#
# Version: 1.0.0
# Date: 2025-11-10
#
# Usage:
#   sudo bash k8s-cleanup.sh
#
################################################################################

set -e
set -u
set -o pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root"
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Kubernetes Cleanup Script                                    ║"
echo "║   WARNING: This will DELETE all Kubernetes data!               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

log_warning "This script will:"
echo "  - Reset kubeadm (destroy cluster)"
echo "  - Remove all Kubernetes data directories"
echo "  - Remove all CNI configurations"
echo "  - Remove all iptables rules"
echo "  - Remove all container images"
echo ""

read -p "Are you ABSOLUTELY sure you want to continue? (type 'yes' to confirm): " -r
if [[ ! $REPLY == "yes" ]]; then
    log_error "Cleanup cancelled"
    exit 1
fi

echo ""

# Step 1: Drain and delete node (if kubectl is configured)
if command -v kubectl &> /dev/null && [ -f /etc/kubernetes/admin.conf ]; then
    log "Draining and deleting node..."
    export KUBECONFIG=/etc/kubernetes/admin.conf

    NODE_NAME=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [ -n "$NODE_NAME" ]; then
        kubectl drain "$NODE_NAME" --delete-emptydir-data --force --ignore-daemonsets --timeout=60s || true
        kubectl delete node "$NODE_NAME" || true
    fi
fi

# Step 2: Reset kubeadm
log "Resetting kubeadm..."
if command -v kubeadm &> /dev/null; then
    kubeadm reset -f || true
else
    log_warning "kubeadm not found, skipping kubeadm reset"
fi

# Step 3: Stop kubelet service
log "Stopping kubelet service..."
systemctl stop kubelet || true
systemctl disable kubelet || true

# Step 4: Remove Kubernetes directories
log "Removing Kubernetes directories..."
rm -rf /etc/kubernetes/
rm -rf /var/lib/kubelet/
rm -rf /var/lib/etcd/
rm -rf /etc/cni/
rm -rf /opt/cni/
rm -rf /var/lib/cni/
rm -rf /run/flannel/
rm -rf ~/.kube/
rm -rf /root/.kube/

# Step 5: Remove CNI network interfaces
log "Removing CNI network interfaces..."
ip link delete cni0 2>/dev/null || true
ip link delete flannel.1 2>/dev/null || true
ip link delete flannel-v6.1 2>/dev/null || true
ip link delete kube-ipvs0 2>/dev/null || true

# Step 6: Remove iptables rules
log "Flushing iptables rules..."
iptables -F || true
iptables -t nat -F || true
iptables -t mangle -F || true
iptables -X || true

# Step 7: Stop and remove containers (if using containerd)
log "Removing all containers..."
if command -v crictl &> /dev/null; then
    # Stop all running containers
    crictl stop $(crictl ps -q) 2>/dev/null || true

    # Remove all containers
    crictl rm $(crictl ps -aq) 2>/dev/null || true

    # Remove all pod sandboxes
    crictl stopp $(crictl pods -q) 2>/dev/null || true
    crictl rmp $(crictl pods -q) 2>/dev/null || true

    # Remove all images (optional - comment out if you want to keep images)
    crictl rmi --all 2>/dev/null || true
fi

# Step 8: Clean containerd data
log "Cleaning containerd data..."
systemctl stop containerd || true
rm -rf /var/lib/containerd/*
systemctl start containerd || true

# Step 9: Remove any leftover process
log "Killing any leftover Kubernetes processes..."
pkill -9 -f kubelet || true
pkill -9 -f kube-proxy || true
pkill -9 -f kube-apiserver || true
pkill -9 -f kube-controller || true
pkill -9 -f kube-scheduler || true
pkill -9 -f etcd || true

# Step 10: Clean up mount points
log "Unmounting Kubernetes volumes..."
for mount in $(mount | grep /var/lib/kubelet | awk '{print $3}'); do
    umount $mount 2>/dev/null || true
done

# Step 11: Remove Helm data (optional)
log "Removing Helm data..."
rm -rf ~/.helm/
rm -rf ~/.config/helm/
rm -rf ~/.cache/helm/

# Verification
echo ""
log "Cleanup completed!"
echo ""
log "Verification:"

# Check for running Kubernetes processes
if pgrep -f kubelet > /dev/null; then
    log_warning "kubelet process still running"
else
    log "✓ No kubelet process running"
fi

# Check for Kubernetes directories
if [ -d /etc/kubernetes ]; then
    log_warning "/etc/kubernetes still exists"
else
    log "✓ /etc/kubernetes removed"
fi

if [ -d /var/lib/kubelet ]; then
    log_warning "/var/lib/kubelet still exists"
else
    log "✓ /var/lib/kubelet removed"
fi

# Check for CNI interfaces
if ip link show cni0 2>/dev/null; then
    log_warning "cni0 interface still exists"
else
    log "✓ cni0 interface removed"
fi

# Check ports
if netstat -tuln | grep -E ':(6443|10259|10257|10250)' > /dev/null 2>&1; then
    log_warning "Some Kubernetes ports are still in use:"
    netstat -tuln | grep -E ':(6443|10259|10257|10250)' || true
else
    log "✓ All Kubernetes ports are free"
fi

echo ""
log "System is now ready for fresh Kubernetes installation"
log "You can now run the deployment script"
echo ""
