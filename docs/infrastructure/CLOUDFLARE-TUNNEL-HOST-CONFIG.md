# Cloudflare Tunnel Configuration (Host Machine)

## Setup Overview

**Architecture**:

- Host machine runs `cloudflared`
- VM at `192.168.1.129` runs K3s with Traefik
- Tunnel routes: `hr.yycholla.com` → Host cloudflared → VM Traefik (192.168.1.129:80)

## Configuration on Host Machine

### Option 1: Via Cloudflare Dashboard (Easiest)

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Navigate to **Access** → **Tunnels**
3. Find your tunnel, click **Configure**
4. Under **Public Hostnames** tab, click **Add a public hostname**

**Add this configuration**:

- **Subdomain**: `hr`
- **Domain**: `yycholla.com` (should auto-select)
- **Type**: `HTTP`
- **URL**: `192.168.1.129:80`

5. **Additional settings** (expand):
   - No TLS Verify: Leave OFF (we're using HTTP)
   - HTTP Host Header: `hr.yycholla.com`

6. Click **Save hostname**

### Option 2: Via cloudflared Config File

On the host machine, edit the cloudflared config file (usually `/etc/cloudflared/config.yml` or `~/.cloudflared/config.yml`):

```yaml
tunnel: <YOUR-TUNNEL-ID>
credentials-file: /path/to/<YOUR-TUNNEL-ID>.json

ingress:
  # Route for SvelteHR
  - hostname: hr.yycholla.com
    service: http://192.168.1.129:80
    originRequest:
      httpHostHeader: hr.yycholla.com

  # Catch-all rule (required, must be last)
  - service: http_status:404
```

Then restart cloudflared on the host:

```bash
sudo systemctl restart cloudflared
```

## Cloudflare SSL/TLS Settings

In [Cloudflare Dashboard](https://dash.cloudflare.com/) for `yycholla.com`:

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to: **Flexible**
   - This means: Cloudflare ↔ User = HTTPS, Cloudflare ↔ Server = HTTP

## Update Kubernetes Configuration (In VM)

Update `/home/chanway/SvelteHR/k8s/helm-charts/sveltehr/values-prod.yaml`:

```yaml
ingress:
  enabled: true
  className: traefik
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web # HTTP only
  host: hr.yycholla.com # Change from hr.local
  tls:
    enabled: false # Cloudflare provides TLS at edge
```

Deploy the updated configuration:

```bash
helm upgrade sveltehr k8s/helm-charts/sveltehr \
  -n sveltehr-prod \
  -f k8s/helm-charts/sveltehr/values-prod.yaml
```

## Verification Steps

### 1. Check Tunnel Status (on host)

```bash
# Check tunnel is connected
sudo systemctl status cloudflared

# View tunnel routes
cloudflared tunnel route dns list
```

### 2. Test from VM

```bash
# Test Traefik is responding
curl -H "Host: hr.yycholla.com" http://192.168.1.129

# Should return HTML from frontend
```

### 3. Test from Internet

```bash
# Check DNS (should show Cloudflare IPs)
dig hr.yycholla.com

# Test HTTPS
curl -I https://hr.yycholla.com

# Should return HTTP 200 or 30x
```

### 4. Browser Test

Open in browser: **https://hr.yycholla.com**

You should see:

- ✅ Valid SSL certificate (Cloudflare)
- ✅ No browser warnings
- ✅ SvelteHR login page

## Troubleshooting

### 502 Bad Gateway

**Cause**: Tunnel can't reach VM

**Check on host**:

```bash
# Can host reach VM?
ping 192.168.1.129

# Can host reach Traefik?
curl -I http://192.168.1.129:80
```

**Fix**: Verify VM's IP is correct and Traefik is listening

### 404 Not Found

**Cause**: Reached Traefik, but ingress not configured

**Check in VM**:

```bash
kubectl get ingress -n sveltehr-prod

# Verify host matches
kubectl get ingress -n sveltehr-prod -o yaml | grep host
# Should show: host: hr.yycholla.com
```

### Connection Timeout

**Cause**: Tunnel not configured or disconnected

**Check on host**:

```bash
sudo journalctl -u cloudflared -n 50

# Look for:
# "Connection established" (good)
# "Connection disconnected" (bad)
```

### Certificate Warnings in Browser

**Cause**: Cloudflare SSL mode incorrect

**Fix**: Set to **Flexible** mode in Cloudflare Dashboard

## Testing Matrix

| Test           | Command                           | Expected Result |
| -------------- | --------------------------------- | --------------- |
| VM Traefik     | `curl http://192.168.1.129`       | HTTP 200 or 404 |
| DNS Resolution | `dig hr.yycholla.com`             | Cloudflare IPs  |
| HTTPS Access   | `curl -I https://hr.yycholla.com` | HTTP 200        |
| Browser        | Open https://hr.yycholla.com      | Login page      |

## Summary

**What to do on host machine**:

1. Add public hostname in Cloudflare Dashboard: `hr.yycholla.com` → `http://192.168.1.129:80`
2. Set Cloudflare SSL/TLS to **Flexible** mode

**What to do in VM**:

1. Update values-prod.yaml: `host: hr.yycholla.com`, `tls.enabled: false`
2. Deploy: `helm upgrade sveltehr ...`

**Result**: https://hr.yycholla.com works with valid SSL! 🎉
