# Cloudflare Tunnel Setup for SvelteHR

## Overview

You already have `cloudflared` running - perfect! Cloudflare Tunnel is the ideal solution for:
- ✅ No static public IP needed
- ✅ No port forwarding required
- ✅ Works behind NAT/firewalls
- ✅ Free and secure
- ✅ Built-in DDoS protection
- ✅ Automatic HTTPS at Cloudflare edge

## Your Setup

**Domain**: `yycholla.com`
**Server**: 192.168.1.129 (private IP - no problem!)
**Cloudflared**: Already installed and running

## Architecture

```
User Browser (HTTPS)
    ↓
Cloudflare Edge (terminates TLS)
    ↓
Cloudflare Tunnel (encrypted)
    ↓
cloudflared on your server
    ↓
Traefik Ingress (HTTP is fine)
    ↓
SvelteHR Frontend/Backend
```

## Step 1: Check Current Cloudflare Tunnel Status

```bash
# Check if cloudflared is running
sudo systemctl status cloudflared

# Or if running as Docker container
docker ps | grep cloudflare

# Check tunnel configuration
cat ~/.cloudflared/config.yml
# OR
sudo cat /etc/cloudflared/config.yml
```

**Find your tunnel ID**:
```bash
cloudflared tunnel list
```

## Step 2: Configure Tunnel Route in Cloudflare Dashboard

### Option A: Via Cloudflare Dashboard (Easiest)

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Navigate to **Networks** → **Tunnels**
3. Find your tunnel, click **Configure**
4. Under **Public Hostnames**, click **Add a public hostname**

**Add this hostname**:
- **Subdomain**: `hr`
- **Domain**: `yycholla.com`
- **Type**: `HTTP`
- **URL**: `traefik-sveltehr-prod.sveltehr-prod.svc.cluster.local:80`
  - OR: `localhost:80` (if Traefik is accessible from host)
  - OR: `192.168.1.129:80` (if binding to host network)

5. Click **Save hostname**

### Option B: Via cloudflared CLI

```bash
# Add tunnel route
cloudflared tunnel route dns <TUNNEL-NAME-OR-ID> hr.yycholla.com

# Update tunnel config
# Edit ~/.cloudflared/config.yml or /etc/cloudflared/config.yml
```

Add this ingress rule:
```yaml
tunnel: <YOUR-TUNNEL-ID>
credentials-file: /path/to/credentials.json

ingress:
  - hostname: hr.yycholla.com
    service: http://localhost:80
    # OR: http://192.168.1.129:80
    # OR: http://traefik-service:80
  - service: http_status:404
```

Then restart cloudflared:
```bash
sudo systemctl restart cloudflared
# OR
docker restart <cloudflared-container>
```

## Step 3: Determine Traefik Access Point

We need to know how cloudflared should reach Traefik. Let's check:

```bash
# Check Traefik service in Kubernetes
kubectl get svc -n sveltehr-prod | grep traefik

# Check if Traefik is exposed on host
kubectl get svc -n kube-system traefik
```

**Common configurations**:

### A. Traefik on Host Ports (Likely)
If Traefik binds to host ports 80/443:
```yaml
# In cloudflared config:
service: http://localhost:80
```

### B. Traefik via Service (Alternative)
If accessing via Kubernetes service DNS:
```yaml
# In cloudflared config:
service: http://traefik.kube-system.svc.cluster.local:80
```

### C. Traefik via NodePort
If Traefik uses NodePort:
```yaml
# In cloudflared config:
service: http://192.168.1.129:<NODEPORT>
```

## Step 4: Update Helm Values for Cloudflare Tunnel

Since Cloudflare Tunnel terminates TLS at the edge, we have two options:

### Option A: HTTP Only (Simpler)

Cloudflare handles HTTPS, server uses HTTP:

```yaml
# values-prod.yaml
ingress:
  enabled: true
  className: traefik
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web  # HTTP only
    # Remove cert-manager annotation
  host: hr.yycholla.com
  tls:
    enabled: false  # Cloudflare provides TLS
```

**Pros**: Simpler, no cert-manager needed
**Cons**: Traffic from Cloudflare to server is HTTP (but encrypted in tunnel)

### Option B: End-to-End TLS (More Secure)

Use Cloudflare's origin certificates for end-to-end encryption:

```yaml
# values-prod.yaml
ingress:
  enabled: true
  className: traefik
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
    cert-manager.io/cluster-issuer: selfsigned-issuer  # Or Cloudflare origin cert
  host: hr.yycholla.com
  tls:
    enabled: true
    secretName: sveltehr-tls
```

**Pros**: Full encryption end-to-end
**Cons**: Slightly more complex

**Recommendation**: Start with **Option A (HTTP only)** - it's simpler and Cloudflare Tunnel is already encrypted.

## Step 5: Update Cloudflare SSL/TLS Settings

In Cloudflare Dashboard for `yycholla.com`:

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode:
   - **Flexible**: If using HTTP on server (Option A)
   - **Full**: If using self-signed cert on server (Option B)
   - **Full (Strict)**: If using Let's Encrypt (advanced)

For Option A, use **Flexible** mode.

## Step 6: Deploy Updated Configuration

```bash
# Update values-prod.yaml with your chosen option
# Then upgrade
helm upgrade sveltehr k8s/helm-charts/sveltehr \
  -n sveltehr-prod \
  -f k8s/helm-charts/sveltehr/values-prod.yaml

# Verify ingress updated
kubectl get ingress -n sveltehr-prod
```

## Step 7: Test Access

DNS should already be configured by Cloudflare Tunnel, so:

```bash
# Test DNS resolution
dig hr.yycholla.com
# Should show Cloudflare IPs (not your server's IP)

# Test HTTPS access
curl -I https://hr.yycholla.com
# Should return HTTP 200 or 30x

# Access in browser
https://hr.yycholla.com
```

**You should see**:
- Valid Cloudflare SSL certificate (no warnings!)
- Your SvelteHR login page

## Verify Cloudflare Tunnel Traffic

```bash
# Check cloudflared logs
sudo journalctl -u cloudflared -f
# OR
docker logs -f <cloudflared-container>

# You should see requests passing through when accessing hr.yycholla.com
```

## Troubleshooting

### Tunnel shows "Disconnected"

```bash
# Check cloudflared status
sudo systemctl status cloudflared

# Restart tunnel
sudo systemctl restart cloudflared

# Check for errors
sudo journalctl -u cloudflared -n 50
```

### 502 Bad Gateway

**Means**: Cloudflare Tunnel is working, but can't reach Traefik

**Fix**:
```bash
# Verify Traefik is accessible
curl -I http://localhost:80
# OR
curl -I http://192.168.1.129:80

# Check if Traefik is listening
sudo netstat -tlnp | grep :80
```

Update cloudflared service URL to correct Traefik endpoint.

### 404 Not Found

**Means**: Reached Traefik, but ingress routing not working

**Fix**:
```bash
# Check ingress host matches
kubectl get ingress -n sveltehr-prod -o yaml | grep host

# Should show: host: hr.yycholla.com
# Make sure it's not hr.local anymore
```

### DNS not resolving

**Check**: Tunnel route is configured in Cloudflare Dashboard
```bash
cloudflared tunnel route dns list <TUNNEL-ID>
```

## Advantages of This Setup

✅ **No static IP needed** - Works with dynamic IPs, mobile hotspots, anywhere
✅ **No port forwarding** - Router firewall stays closed
✅ **Cloudflare DDoS protection** - Built-in security
✅ **Global CDN** - Fast from anywhere in the world
✅ **Automatic HTTPS** - Cloudflare provides valid TLS certificates
✅ **Zero Trust integration** - Can add authentication layer easily

## Optional: Add Access Control

Cloudflare Tunnel integrates with Cloudflare Access for authentication:

1. In Zero Trust Dashboard → **Access** → **Applications**
2. Add application for `hr.yycholla.com`
3. Configure authentication (Google, email OTP, etc.)
4. Add access policies (who can access)

This adds an extra authentication layer before reaching your app!

## Summary Checklist

- [ ] Verify `cloudflared` is running: `sudo systemctl status cloudflared`
- [ ] Get tunnel ID: `cloudflared tunnel list`
- [ ] Add public hostname in Cloudflare Dashboard: `hr.yycholla.com` → `http://localhost:80`
- [ ] Set Cloudflare SSL/TLS mode to **Flexible**
- [ ] Update `values-prod.yaml`: host: `hr.yycholla.com`, TLS: disabled
- [ ] Deploy: `helm upgrade sveltehr ...`
- [ ] Test: `curl -I https://hr.yycholla.com`
- [ ] Access: https://hr.yycholla.com ✨

🎉 You'll have a production-ready HR system accessible from anywhere!

## Comparison: Tunnel vs Direct IP

| Feature | Cloudflare Tunnel | Direct IP (A Record) |
|---------|------------------|---------------------|
| Static IP required | ❌ No | ✅ Yes |
| Port forwarding | ❌ No | ✅ Yes |
| DDoS protection | ✅ Built-in | ❌ No |
| Works behind NAT | ✅ Yes | ❌ No |
| TLS management | Cloudflare auto | cert-manager |
| Setup complexity | Easy | Medium |

**Verdict**: Cloudflare Tunnel is perfect for your setup! 🚀
