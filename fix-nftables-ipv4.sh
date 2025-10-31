#!/bin/bash
set -e

echo "=== Creating IPv4 NFTables Table for Libvirt ==="
echo ""

# Step 1: Check current state
echo "Step 1: Checking current nftables state..."
echo "Current tables:"
sudo nft list tables
echo ""

# Step 2: Create the missing IPv4 libvirt_network table
echo "Step 2: Creating IPv4 libvirt_network table..."
sudo nft add table ip libvirt_network
echo "✓ Created table ip libvirt_network"
echo ""

# Step 3: Verify table was created
echo "Step 3: Verifying tables now exist..."
echo "Updated tables:"
sudo nft list tables
echo ""

# Step 4: Restart libvirt to apply changes
echo "Step 4: Restarting libvirt daemon..."
sudo systemctl restart libvirtd.service
sleep 2
echo "✓ Libvirt restarted"
echo ""

# Step 5: Start default network
echo "Step 5: Starting default network..."
sudo virsh net-start default
echo "✓ Default network started successfully!"
echo ""

# Step 6: Verify networks
echo "Step 6: Verifying libvirt networks..."
sudo virsh net-list --all
echo ""

# Step 7: Show final nftables configuration
echo "Step 7: Final nftables configuration..."
echo "IPv4 libvirt_network table:"
sudo nft list table ip libvirt_network
echo ""

echo "=== Setup Complete ==="
echo ""
echo "NFTables IPv4 table created and libvirt network is running."
echo "You can now try: minikube start --driver=kvm2 --cpus=2 --memory=4096"
