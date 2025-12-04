# Cloudflare Domain Setup for SvelteHR

## Overview

Setting up `yycholla.com` with Cloudflare for SvelteHR with automatic Let's Encrypt TLS certificates.

**Your Server's Public IP**: `217.177.210.24`

## Step 1: Configure Cloudflare DNS

### Go to Cloudflare Dashboard

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select the `yycholla.com` domain
3. Go to **DNS** → **Records**

### Add DNS Records

Add an A record for the SvelteHR application:

| Type | Name | Content        | Proxy Status              | TTL  |
| ---- | ---- | -------------- | ------------------------- | ---- |
| A    | hr   | 217.177.210.24 | **DNS only (Gray Cloud)** | Auto |

**CRITICAL**: The proxy status MUST be "DNS only" (gray cloud icon), NOT proxied (orange cloud).

#### Why DNS Only?

Let's Encrypt uses HTTP-01 challenge to verify domain ownership. The challenge works like this:

1. Let's Encrypt asks your server to serve a specific file at `http://hr.yycholla.com/.well-known/acme-challenge/TOKEN`
2. Let's Encrypt fetches that URL from the public internet
3. If it matches, certificate is issued

**If Cloudflare proxy is enabled (orange cloud)**:

- Requests go through Cloudflare's servers first
- Let's Encrypt sees Cloudflare's IP, not your server's IP
- HTTP-01 challenge may fail or have issues
- You'd need to use DNS-01 challenge with Cloudflare API tokens (more complex)

**With DNS only (gray cloud)**:

- DNS resolves directly to your server IP
- Let's Encrypt connects directly to your Traefik ingress
- HTTP-01 challenge works perfectly
- Certificates issue automatically

### Optional: Add Records for Other Services

If you want separate subdomains:

| Type | Name    | Content        | Proxy Status | TTL  |
| ---- | ------- | -------------- | ------------ | ---- |
| A    | pgadmin | 217.177.210.24 | DNS only     | Auto |
| A    | grafana | 217.177.210.24 | DNS only     | Auto |
| A    | argocd  | 217.177.210.24 | DNS only     | Auto |

All should use **DNS only** for the same reasons.

## Step 2: Update Helm Values

Update `/home/chanway/SvelteHR/k8s/helm-charts/sveltehr/values-prod.yaml`:

```yaml
ingress:
  enabled: true
  className: traefik
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
    cert-manager.io/cluster-issuer: letsencrypt-prod # Use production Let's Encrypt
  host: hr.yycholla.com # Change from hr.local
  tls:
    enabled: true
    secretName: sveltehr-tls
```

## Step 3: Verify Port Forwarding (If Behind Router)

Since your server is at `192.168.1.129` (private IP), ensure your router forwards traffic:

**Required Port Forwards**:

- **Port 80 (HTTP)** → 192.168.1.129:80 - Required for Let's Encrypt HTTP-01 challenge
- **Port 443 (HTTPS)** → 192.168.1.129:443 - Required for HTTPS traffic

**How to check**:

1. Log in to your router (typically http://192.168.1.1)
2. Look for "Port Forwarding" or "Virtual Server" settings
3. Add rules to forward ports 80 and 443 to 192.168.1.129

**Test from external network**:

```bash
# From outside your network (use phone hotspot or ask friend)
curl http://217.177.210.24
# Should reach your Traefik ingress
```

## Step 4: Deploy Updated Configuration

After DNS is configured and port forwarding is verified:

```bash
# Deploy with new domain
helm upgrade sveltehr k8s/helm-charts/sveltehr \
  -n sveltehr-prod \
  -f k8s/helm-charts/sveltehr/values-prod.yaml
```

## Step 5: Verify Certificate Issuance

cert-manager will automatically request a certificate from Let's Encrypt.

```bash
# Watch certificate status
kubectl get certificate -n sveltehr-prod -w

# Check certificate details
kubectl describe certificate sveltehr-tls -n sveltehr-prod

# Check cert-manager logs if issues
kubectl logs -n cert-manager -l app.kubernetes.io/name=cert-manager -f
```

**Expected Timeline**:

- DNS propagation: 1-5 minutes (usually fast with Cloudflare)
- Certificate issuance: 30-120 seconds
- Total time: ~2-5 minutes

## Step 6: Access Your Application

Once the certificate is issued (Status: Ready=True):

**Production URL**: https://hr.yycholla.com

The application will be accessible with a valid, trusted TLS certificate. No browser warnings!

## Troubleshooting

### Certificate Stuck in "Pending" or "False"

```bash
# Check certificate order status
kubectl get order -n sveltehr-prod

# Describe the order for errors
kubectl describe order -n sveltehr-prod
```

**Common Issues**:

1. **DNS not propagating**:

   ```bash
   # Check DNS resolution from your server
   dig hr.yycholla.com
   # Should show: hr.yycholla.com. IN A 217.177.210.24
   ```

2. **Port 80 not accessible**:

   ```bash
   # Test from outside network
   curl -v http://hr.yycholla.com
   # Should connect to Traefik
   ```

3. **Cloudflare proxy enabled (orange cloud)**:
   - Go back to Cloudflare DNS settings
   - Click the orange cloud to turn it gray (DNS only)

4. **Firewall blocking ports**:
   ```bash
   # Check if ports are open on server
   sudo netstat -tlnp | grep -E ':(80|443)'
   # Should show traefik listening
   ```

### Let's Encrypt Rate Limits

If you need to test multiple times, use staging issuer first:

```yaml
# In values-prod.yaml temporarily:
ingress:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-staging # For testing
```

Staging certificates will show browser warnings but prove the setup works.

Once confirmed working, change back to `letsencrypt-prod` and upgrade again.

## DNS Propagation Check

Before deploying, verify DNS is working:

```bash
# From your server
dig hr.yycholla.com

# Expected output:
# hr.yycholla.com.    300    IN    A    217.177.210.24
```

If DNS isn't resolving yet, wait a few minutes and try again.

## Security Notes

**With Cloudflare DNS Only**:

- ✅ Let's Encrypt certificates work automatically
- ✅ Full TLS encryption
- ❌ No Cloudflare DDoS protection
- ❌ No Cloudflare CDN caching

**If you want Cloudflare proxy later**:

- You can enable it AFTER certificate is issued
- Or switch to DNS-01 challenge with Cloudflare API token (more complex setup)

For a small HR system, DNS only is perfectly fine. Enable Cloudflare proxy if you need:

- DDoS protection
- Global CDN
- Cloudflare WAF

## Summary Checklist

- [ ] Add DNS A record: `hr.yycholla.com` → `217.177.210.24` (Gray cloud)
- [ ] Verify DNS propagation: `dig hr.yycholla.com`
- [ ] Configure router port forwarding: 80 and 443 → 192.168.1.129
- [ ] Test external access: `curl http://217.177.210.24`
- [ ] Update `values-prod.yaml` with `host: hr.yycholla.com`
- [ ] Deploy: `helm upgrade sveltehr ...`
- [ ] Watch certificate: `kubectl get certificate -n sveltehr-prod -w`
- [ ] Access: https://hr.yycholla.com

🎉 You'll have a production-ready HR system with valid TLS!
