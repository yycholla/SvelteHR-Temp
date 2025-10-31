#!/bin/bash
set -e

echo "=== Inspecting and Fixing NFTables Libvirt Configuration ==="
echo ""

# Step 1: Inspect current IPv4 table contents
echo "Step 1: Inspecting IPv4 libvirt_network table contents..."
echo "Current IPv4 table:"
sudo nft list table ip libvirt_network || echo "Table is empty or corrupted"
echo ""

echo "Current IPv6 table:"
sudo nft list table ip6 libvirt_network || echo "Table is empty or corrupted"
echo ""

# Step 2: Stop libvirt to safely manipulate tables
echo "Step 2: Stopping libvirt services..."
sudo systemctl stop libvirtd.service
sleep 2
echo "✓ Libvirt stopped"
echo ""

# Step 3: Delete and recreate both tables cleanly
echo "Step 3: Deleting and recreating tables cleanly..."
sudo nft delete table ip libvirt_network 2>/dev/null || echo "IPv4 table already deleted"
sudo nft delete table ip6 libvirt_network 2>/dev/null || echo "IPv6 table already deleted"
echo "✓ Old tables deleted"
echo ""

echo "Creating fresh tables..."
sudo nft add table ip libvirt_network
sudo nft add table ip6 libvirt_network
echo "✓ Fresh tables created"
echo ""

# Step 4: Verify clean state
echo "Step 4: Verifying clean state..."
echo "Tables after recreation:"
sudo nft list tables
echo ""

# Step 5: Restart libvirt
echo "Step 5: Restarting libvirt daemon..."
sudo systemctl start libvirtd.service
sleep 3
echo "✓ Libvirt restarted"
echo ""

# Step 6: Start default network
echo "Step 6: Starting default network (libvirt will populate chains)..."
sudo virsh net-start default
echo "✓ Default network started successfully!"
echo ""

# Step 7: Verify final state
echo "Step 7: Verifying final configuration..."
echo ""
echo "Active networks:"
sudo virsh net-list --all
echo ""

echo "IPv4 libvirt_network table after network start:"
sudo nft list table ip libvirt_network
echo ""

echo "=== Setup Complete ==="
echo ""
echo "NFTables tables recreated cleanly and libvirt network is running."
echo "You can now try: minikube start --driver=kvm2 --cpus=2 --memory=4096"
