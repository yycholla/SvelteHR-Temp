# TLS Certificate Management Guide

## Current Status

✅ **cert-manager installed**: v1.19.1 with production configuration
✅ **ClusterIssuers created**: Let's Encrypt staging and production
❌ **Certificate issuance failed**: `.local` domain not supported by Let's Encrypt

## The Problem: `.local` Domains and Let's Encrypt

**Error Message**:

```
Failed to create Order: 400 urn:ietf:params:acme:error:rejectedIdentifier:
Invalid identifiers requested :: Cannot issue for "hr.local":
Domain name does not end with a valid public suffix (TLD)
```

**Why This Happens**:

- Let's Encrypt can ONLY issue certificates for publicly accessible domains
- `.local` domains are reserved for local networks (mDNS/Bonjour)
- Let's Encrypt validates domain ownership via HTTP-01 or DNS-01 challenges
- Since `hr.local` is not publicly routable, Let's Encrypt cannot reach it

## Solutions for TLS with Local Domains

### Option 1: Self-Signed Certificates (Quick Local Setup) ⭐ RECOMMENDED FOR LOCAL

Use cert-manager's self-signed issuer for local development.

**Pros**:

- Works immediately with `.local` domains
- No external dependencies
- Fully automated by cert-manager

**Cons**:

- Browser security warnings (must manually accept certificate)
- Not suitable for production

**Setup**:

```bash
# Create self-signed ClusterIssuer
kubectl apply -f k8s/cert-manager/self-signed-issuer.yaml

# Update ingress annotation to use self-signed issuer
# In values-prod.yaml:
ingress:
  annotations:
    cert-manager.io/cluster-issuer: selfsigned-issuer
```

### Option 2: Use Real Public Domain (Production Setup) ⭐ RECOMMENDED FOR PRODUCTION

Purchase a domain (e.g., `sveltehr.com`) and use it for the application.

**Pros**:

- Valid, trusted certificates from Let's Encrypt
- No browser warnings
- Professional setup for production

**Cons**:

- Requires domain purchase (~$10-20/year)
- Requires DNS configuration

**Setup**:

1. Purchase domain (e.g., from Cloudflare, Namecheap, GoDaddy)
2. Point domain to your server's public IP
3. Update `values-prod.yaml`:
   ```yaml
   ingress:
     host: hr.sveltehr.com # Your real domain
     annotations:
       cert-manager.io/cluster-issuer: letsencrypt-prod
   ```
4. cert-manager will automatically issue a valid certificate

### Option 3: Testing Domains (nip.io / sslip.io)

Use services like `nip.io` or `sslip.io` that provide DNS for IP addresses.

**Example**: `hr-192-168-1-129.nip.io` resolves to `192.168.1.129`

**Pros**:

- Free and immediate
- Works with Let's Encrypt
- No domain purchase needed

**Cons**:

- Only works if your server is publicly accessible
- Third-party dependency

**Setup**:

```yaml
# In values-prod.yaml:
ingress:
  host: hr-192-168-1-129.nip.io
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
```

### Option 4: Local Certificate Authority (Advanced)

Create your own CA with cert-manager and install the CA certificate on all client devices.

**Pros**:

- No browser warnings once CA is trusted
- Full control over certificate lifecycle

**Cons**:

- Complex setup
- Must install CA certificate on every device

## Recommended Path Forward

### For Current Local Development:

1. Use **Option 1 (Self-Signed)** for immediate local testing
2. Accept browser certificate warnings temporarily
3. Or use HTTP without TLS for local development

### For Production Server:

1. Use **Option 2 (Real Public Domain)** - this is the correct production approach
2. Purchase domain before deploying to production server
3. Configure DNS to point to production server
4. cert-manager will automatically issue trusted certificates

## Implementation: Self-Signed Issuer (Local Development)

Create `/home/chanway/SvelteHR/k8s/helm-charts/cert-manager-selfsigned-issuer.yaml`:

```yaml
---
# Self-Signed ClusterIssuer for local development
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}
```

Apply it:

```bash
kubectl apply -f k8s/helm-charts/cert-manager-selfsigned-issuer.yaml
```

Update your ingress annotation (in Helm values or template):

```yaml
annotations:
  cert-manager.io/cluster-issuer: selfsigned-issuer # Changed from letsencrypt-prod
```

Redeploy:

```bash
helm upgrade sveltehr k8s/helm-charts/sveltehr \
  -n sveltehr-prod \
  -f k8s/helm-charts/sveltehr/values-prod.yaml
```

## Verification

After implementing a solution, verify certificate:

```bash
# Check certificate status
kubectl get certificate -n sveltehr-prod

# Check certificate details
kubectl describe certificate sveltehr-tls -n sveltehr-prod

# Verify TLS secret exists
kubectl get secret sveltehr-tls -n sveltehr-prod

# Test HTTPS access
curl -k https://hr.local  # -k ignores self-signed cert warning
```

## Current Setup Summary

**Installed Components**:

- cert-manager v1.19.1 (namespace: cert-manager)
- ClusterIssuers: `letsencrypt-staging`, `letsencrypt-prod`
- Ingress: hr.local with TLS enabled

**What Works**:

- HTTP access via Tailscale: `http://sveltehr-frontend.dropbear-elnath.ts.net:3000`
- HTTP access via Traefik: `http://hr.local` (if DNS configured)

**What Doesn't Work Yet**:

- HTTPS with Let's Encrypt for `hr.local` (domain not publicly accessible)

**Next Steps**:

1. **Immediate**: Decide on TLS approach (self-signed for local, real domain for production)
2. **Short-term**: Implement chosen solution
3. **Production**: Purchase domain and configure DNS before deploying to production server
