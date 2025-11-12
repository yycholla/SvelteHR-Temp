# Configuration Review - Measure Twice, Cut Once

## ✅ What's Correct

### Traefik Configuration
- ✅ NodePort 30080 for HTTP traffic
- ✅ NodePort 30443 for HTTPS traffic
- ✅ Service type: LoadBalancer (NodePorts still accessible)
- ✅ IngressClass: traefik (default)
- ✅ Metrics enabled for Prometheus

### K8s Application Configuration
- ✅ Ingress host: hr.mtncarerx.com
- ✅ Frontend service: port 3000 (production)
- ✅ Backend service: port 4000
- ✅ Namespace: sveltehr-prod

### Nginx Configurations
- ✅ Upstream pointing to correct NodePorts (30080, 30443)
- ✅ Server name matches domain: hr.mtncarerx.com
- ✅ WebSocket support configured
- ✅ Proper headers for X-Forwarded-*
- ✅ Client max body size set to 50M
- ✅ proxy_ssl_verify off (needed for Traefik's certificates)

---

## ⚠️ Issues Found & Fixes Required

### 🔴 CRITICAL ISSUE #1: ACME Challenge Blocked in Main Config

**File:** `k8s/nginx/hr-mtncarerx.conf`

**Problem:**
```nginx
server {
    listen 80;
    server_name hr.mtncarerx.com;

    # This redirects EVERYTHING including ACME challenges!
    return 301 https://$host$request_uri;
}
```

**Impact:**
- Let's Encrypt HTTP-01 validation will FAIL
- Certificates cannot be issued or renewed by cert-manager
- /.well-known/acme-challenge/ requests get redirected to HTTPS instead of being served

**Fix Required:**
```nginx
server {
    listen 80;
    server_name hr.mtncarerx.com;

    # Allow ACME challenges to pass through to k8s
    location /.well-known/acme-challenge/ {
        proxy_pass http://k8s_traefik_http;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Redirect everything else to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}
```

---

### 🟡 ISSUE #2: Certificate Issuer Mismatch

**Files:**
- `k8s/manifests/certificates/hr-mtncarerx-certificate.yaml` uses `letsencrypt-prod`
- `k8s/helm-charts/sveltehr/values-prod.yaml` annotation uses `letsencrypt-staging`

**Problem:**
If both are used simultaneously, you might get two different certificates:
- One from the Certificate resource (production)
- One from the ingress annotation (staging)

**Recommendation:**
Choose ONE approach:

**Option A: Use Certificate Resource (Recommended)**
- Keep `hr-mtncarerx-certificate.yaml` with `letsencrypt-prod`
- Remove cert-manager annotation from ingress (values-prod.yaml)
- Certificate resource is more explicit and controllable

**Option B: Use Ingress Annotation**
- Delete `hr-mtncarerx-certificate.yaml`
- Update values-prod.yaml annotation to `letsencrypt-prod` when ready for production

---

### 🟡 ISSUE #3: Inefficient Double SSL Encryption

**File:** `k8s/nginx/hr-mtncarerx.conf`

**Problem:**
Traffic flow is: Internet (HTTPS) → nginx (decrypt) → Traefik (encrypt) → Traefik (decrypt) → Frontend (HTTP)

This means:
1. Windows nginx terminates SSL
2. Windows nginx re-encrypts to Traefik over HTTPS (proxy_pass https://...)
3. Traefik terminates SSL again
4. Traefik forwards to frontend over HTTP

**Impact:**
- Unnecessary CPU overhead
- More complex debugging
- Two layers of SSL to manage

**Solution:**
Use Option 3 (TCP Passthrough) from README instead - single SSL termination at Traefik level.

---

### 🟡 ISSUE #4: Incomplete TCP Passthrough Config

**File:** `k8s/nginx/hr-mtncarerx-with-acme-proxy.conf`

**Problem:**
The HTTPS server block is incomplete - it mentions stream module but doesn't provide working config.

**Status:**
This file is for reference only. If you choose Option 3, you'll need to use nginx stream module (outside http block).

---

### 🟢 INFORMATIONAL: Traefik Service Type

**File:** `k8s/helm-values/traefik-values.yaml`

**Current Setting:**
```yaml
service:
  type: LoadBalancer
```

**Note:**
- LoadBalancer type might assign an external IP in k3s (via MetalLB/ServiceLB)
- If that happens, traffic could bypass Windows nginx entirely
- NodePorts (30080, 30443) will still work regardless

**Recommendation:**
- Monitor if LoadBalancer gets external IP: `kubectl get svc -n kube-system traefik`
- If you only want traffic through Windows nginx, consider changing to `type: NodePort`
- Current setup should work fine as long as DNS points to Windows VM, not the LoadBalancer IP

---

## 📋 Recommended Deployment Strategy

### Strategy A: Quick Fix (Manual SSL on Windows)

1. **Fix ACME challenge blocking** in `hr-mtncarerx.conf`
2. **Get SSL certificate manually** for Windows nginx (via certbot or win-acme)
3. **Update certificate paths** in config
4. **Deploy** to Windows VM

**Pros:**
- Quick to set up
- No dependency on k8s for SSL
- Simple troubleshooting

**Cons:**
- Manual certificate renewal needed
- Double SSL encryption overhead
- Need to manage certs on Windows

---

### Strategy B: Full cert-manager Integration (Recommended)

1. **Choose certificate management approach:**
   - Use Certificate resource (remove ingress annotation)
   - OR use ingress annotation (delete Certificate resource)
   - DON'T use both

2. **Deploy corrected nginx config** with ACME challenge proxy

3. **Apply Certificate resource** (if chosen):
   ```bash
   kubectl apply -f k8s/manifests/certificates/hr-mtncarerx-certificate.yaml
   kubectl get certificate -n sveltehr-prod -w
   ```

4. **Export certificate to Windows:**
   ```bash
   k8s/scripts/export-cert-to-windows.sh
   ```

5. **Set up automated sync** (optional):
   ```bash
   kubectl apply -f k8s/manifests/certificates/cert-sync-cronjob.yaml
   ```

**Pros:**
- Automated renewals via cert-manager
- Centralized certificate management
- Can be automated

**Cons:**
- More complex setup
- Need SSH/file share to Windows
- Still has double SSL overhead

---

### Strategy C: TCP Passthrough (Most Efficient)

1. **Let Traefik handle ALL SSL** with cert-manager
2. **Configure nginx stream module** for TCP passthrough (no SSL on Windows)
3. **Proxy ACME challenges** on port 80 to k8s

**Pros:**
- Zero certificate management on Windows
- Single SSL termination (efficient)
- Automatic renewals by cert-manager
- Simplest long-term maintenance

**Cons:**
- Requires nginx with stream module
- Can't inspect HTTPS traffic at nginx level
- Slightly more complex nginx config

**Implementation:** See README.md Option 3

---

## 🔧 Required Actions Before Deployment

### Must Fix (Critical)
- [ ] Fix ACME challenge blocking in `hr-mtncarerx.conf`
- [ ] Choose ONE certificate management approach (resolve issuer mismatch)

### Should Configure
- [ ] Replace `<K8S_NODE_IP>` with actual k8s node IP in all configs
- [ ] Choose deployment strategy (A, B, or C above)
- [ ] Update SSL certificate paths if using Strategy A or B
- [ ] Verify DNS points to Windows VM IP

### Recommended
- [ ] Test ACME challenge endpoint: `curl http://hr.mtncarerx.com/.well-known/acme-challenge/test`
- [ ] Monitor Traefik service for external IP assignment
- [ ] Set up monitoring/alerting for certificate expiration
- [ ] Document which strategy you chose for future reference

---

## 🧪 Testing Checklist

After deployment:

### Connectivity Tests
```bash
# Test HTTP redirect
curl -I http://hr.mtncarerx.com

# Test HTTPS
curl -I https://hr.mtncarerx.com

# Test ACME challenge path (should not redirect)
curl -I http://hr.mtncarerx.com/.well-known/acme-challenge/test
# Expected: Should reach k8s, not redirect to HTTPS

# Test from k8s node directly
curl http://<K8S_NODE_IP>:30080
curl -k https://<K8S_NODE_IP>:30443
```

### Certificate Tests
```bash
# Check certificate in k8s
kubectl get certificate -n sveltehr-prod
kubectl describe certificate hr-mtncarerx-tls -n sveltehr-prod

# Check certificate secret
kubectl get secret sveltehr-tls-cert -n sveltehr-prod -o yaml

# Check certificate on Windows nginx
openssl s_client -connect hr.mtncarerx.com:443 -servername hr.mtncarerx.com
```

### Application Tests
- [ ] Access https://hr.mtncarerx.com in browser
- [ ] Verify SSL certificate is valid (not self-signed or staging)
- [ ] Test login functionality
- [ ] Test WebSocket features (if any real-time features exist)
- [ ] Test file upload (verify 50M limit works)

---

## 📝 Summary

**Current Status:** Configurations are 80% correct, but have 2 critical issues that will prevent SSL from working properly.

**Action Required:**
1. Fix ACME challenge blocking in main nginx config
2. Resolve certificate issuer mismatch
3. Choose and implement one of the three deployment strategies

**Recommended Path:**
Start with **Strategy B** for production-ready automated SSL, or **Strategy C** for maximum efficiency if you're comfortable with stream module configuration.

**Time Estimate:**
- Strategy A (manual): 30 minutes
- Strategy B (cert-manager export): 1-2 hours
- Strategy C (TCP passthrough): 2-3 hours

All configurations are saved and ready - just need the critical fixes applied before deployment.
