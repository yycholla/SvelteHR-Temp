#!/bin/bash
set -e

echo "=== Libvirt NFTables Cleanup Script ==="
echo ""

# Step 1: Check current NFTables state
echo "Step 1: Checking current NFTables state..."
sudo nft list tables | grep -i libvirt || echo "No libvirt tables found (may be OK)"
echo ""

# Step 2: Flush libvirt NFTables rules
echo "Step 2: Flushing corrupted libvirt NFTables rules..."
sudo nft flush table ip libvirt_network 2>/dev/null || echo "Table already flushed or doesn't exist"
sudo nft delete table ip libvirt_network 2>/dev/null || echo "Table already deleted or doesn't exist"
echo "✓ Flushed NFTables rules"
echo ""

# Step 3: Stop libvirt services
echo "Step 3: Stopping libvirt services..."
sudo systemctl stop libvirtd.service
sudo systemctl stop libvirtd.socket
sudo systemctl stop libvirtd-ro.socket
sudo systemctl stop libvirtd-admin.socket
echo "✓ Stopped libvirt services"
echo ""

# Step 4: Remove stale network definitions
echo "Step 4: Cleaning up network state files..."
sudo rm -f /var/lib/libvirt/network/default.xml 2>/dev/null || true
sudo rm -f /var/lib/libvirt/network/mk-minikube.xml 2>/dev/null || true
echo "✓ Cleaned state files"
echo ""

# Step 5: Restart libvirt
echo "Step 5: Restarting libvirt daemon..."
sudo systemctl start libvirtd.service
sleep 2
sudo systemctl status libvirtd.service --no-pager | head -10
echo ""

# Step 6: Redefine and start default network
echo "Step 6: Setting up default network..."
sudo virsh net-define /etc/libvirt/qemu/networks/default.xml || echo "Default network XML not found, will create manually"
sudo virsh net-autostart default
sudo virsh net-start default
echo "✓ Default network started"
echo ""

# Step 7: Verify networks
echo "Step 7: Verifying libvirt networks..."
sudo virsh net-list --all
echo ""

# Step 8: Check NFTables state
echo "Step 8: Checking new NFTables state..."
sudo nft list table ip libvirt_network 2>/dev/null || echo "NFTables rules will be created on demand"
echo ""

echo "=== Cleanup Complete ==="
echo "You can now try: minikube start --driver=kvm2 --cpus=2 --memory=4096"
