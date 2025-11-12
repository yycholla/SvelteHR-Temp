#!/bin/bash
# Export certificate from k8s cert-manager to Windows VM
# This script extracts the TLS certificate from k8s Secret and copies it to Windows nginx

set -e

# Configuration
NAMESPACE="sveltehr-prod"
SECRET_NAME="hr-mtncarerx-tls-secret"
WINDOWS_HOST="<WINDOWS_VM_IP>"  # Replace with your Windows VM IP or hostname
WINDOWS_USER="<USERNAME>"        # Replace with your Windows username
CERT_REMOTE_PATH="C:/nginx/ssl"  # Windows nginx SSL directory (adjust as needed)

# Temporary directory for cert files
TEMP_DIR="/tmp/k8s-certs"
mkdir -p "$TEMP_DIR"

echo "📜 Exporting certificate from k8s Secret: $SECRET_NAME"

# Extract certificate (tls.crt)
kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.tls\.crt}' | base64 -d > "$TEMP_DIR/hr.mtncarerx.com.crt"

# Extract private key (tls.key)
kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.tls\.key}' | base64 -d > "$TEMP_DIR/hr.mtncarerx.com.key"

# Optional: Extract CA certificate if present
if kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.ca\.crt}' &>/dev/null; then
    kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.ca\.crt}' | base64 -d > "$TEMP_DIR/ca.crt"
    echo "✅ Extracted CA certificate"
fi

echo "✅ Certificate files extracted to $TEMP_DIR"

# Display certificate info
echo ""
echo "📋 Certificate Information:"
openssl x509 -in "$TEMP_DIR/hr.mtncarerx.com.crt" -noout -subject -issuer -dates

# Copy to Windows VM
echo ""
echo "📤 Copying certificates to Windows VM: $WINDOWS_HOST"

# Using scp (requires SSH server on Windows, e.g., OpenSSH)
scp "$TEMP_DIR/hr.mtncarerx.com.crt" "$WINDOWS_USER@$WINDOWS_HOST:$CERT_REMOTE_PATH/"
scp "$TEMP_DIR/hr.mtncarerx.com.key" "$WINDOWS_USER@$WINDOWS_HOST:$CERT_REMOTE_PATH/"

if [ -f "$TEMP_DIR/ca.crt" ]; then
    scp "$TEMP_DIR/ca.crt" "$WINDOWS_USER@$WINDOWS_HOST:$CERT_REMOTE_PATH/"
fi

echo "✅ Certificates copied to Windows VM"

# Optional: Reload nginx on Windows (requires SSH access)
echo ""
read -p "Reload nginx on Windows VM? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ssh "$WINDOWS_USER@$WINDOWS_HOST" "C:/nginx/nginx.exe -t && C:/nginx/nginx.exe -s reload"
    echo "✅ Nginx reloaded on Windows VM"
fi

# Cleanup
rm -rf "$TEMP_DIR"
echo "✅ Cleanup complete"

# =============================================================================
# Alternative: SMB/CIFS Copy (if Windows file sharing is enabled)
# =============================================================================
# Uncomment below if you prefer using SMB instead of SCP
#
# WINDOWS_SHARE="//WINDOWS_VM_IP/nginx-ssl"
# MOUNT_POINT="/mnt/windows-ssl"
#
# sudo mkdir -p "$MOUNT_POINT"
# sudo mount -t cifs "$WINDOWS_SHARE" "$MOUNT_POINT" -o username="$WINDOWS_USER"
# sudo cp "$TEMP_DIR/hr.mtncarerx.com.crt" "$MOUNT_POINT/"
# sudo cp "$TEMP_DIR/hr.mtncarerx.com.key" "$MOUNT_POINT/"
# sudo umount "$MOUNT_POINT"
