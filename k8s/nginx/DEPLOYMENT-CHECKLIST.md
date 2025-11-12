# Pre-Deployment Checklist

**STATUS:** ✅ Ready for deployment after completing this checklist

---

## 📋 Pre-Flight Checks (Complete First)

### 1. Review the Full Analysis
- [ ] Read `REVIEW.md` for detailed analysis of all configurations
- [ ] Understand the 3 deployment strategies (A, B, or C)
- [ ] Choose which strategy to use

### 2. Fix Critical Configuration Values
- [ ] Replace `<K8S_NODE_IP>` with actual Kubernetes node IP in:
  - `k8s/nginx/hr-mtncarerx.conf` (lines 13 and 19)
  - `k8s/nginx/hr-mtncarerx-with-acme-proxy.conf` (if using)
  - `k8s/scripts/export-cert-to-windows.sh` (if using Strategy B)

### 3. Choose Certificate Management Approach

**Option A: Manual SSL (Simplest)**
- [ ] Obtain SSL certificate for hr.mtncarerx.com using certbot or win-acme
- [ ] Update certificate paths in `hr-mtncarerx.conf` (lines 41-42)
- [ ] Skip k8s Certificate resource deployment

**Option B: cert-manager with Export (Recommended)**
- [ ] Use existing `hr-mtncarerx.conf` (already fixed for ACME)
- [ ] Deploy Certificate resource (see step 4)
- [ ] Configure export script with Windows VM credentials

**Option C: TCP Passthrough (Most Efficient)**
- [ ] Follow README.md Option 3 instructions
- [ ] Configure nginx stream module (outside http block)
- [ ] Use `hr-mtncarerx-with-acme-proxy.conf` as reference

---

## 🚀 Deployment Steps

### Step 1: Verify DNS Configuration
```bash
# Verify DNS points to Windows VM
nslookup hr.mtncarerx.com
# Should return: <WINDOWS_VM_IP>

dig hr.mtncarerx.com
# Should show A record pointing to Windows VM
```

### Step 2: Deploy to Windows VM

**Copy nginx configuration:**
```bash
# Copy the fixed config to Windows
scp k8s/nginx/hr-mtncarerx.conf <WINDOWS_USER>@<WINDOWS_VM>:/path/to/nginx/conf.d/

# Or use file sharing, USB drive, etc.
```

**Test and reload nginx:**
```bash
# On Windows VM:
nginx -t                    # Test configuration
nginx -s reload             # Reload if test passes
```

### Step 3: Deploy k8s Resources (If Using Strategy B or C)

**For Strategy B (cert-manager export):**
```bash
# Deploy Certificate resource
kubectl apply -f k8s/manifests/certificates/hr-mtncarerx-certificate.yaml

# Watch certificate issuance (takes 1-3 minutes)
kubectl get certificate -n sveltehr-prod hr-mtncarerx-tls -w

# Once Ready=True, export certificate
cd k8s/scripts
./export-cert-to-windows.sh
```

**For Strategy C (TCP passthrough):**
```bash
# No Certificate resource needed - use ingress annotation
# Verify ingress is deployed with cert-manager annotation
kubectl get ingress -n sveltehr-prod sveltehr-ingress -o yaml
```

### Step 4: Verify Application Ingress

```bash
# Check if application ingress is deployed
kubectl get ingress -n sveltehr-prod

# Should show:
# NAME               CLASS     HOSTS              ADDRESS   PORTS     AGE
# sveltehr-ingress   traefik   hr.mtncarerx.com             80, 443   Xd
```

### Step 5: Verify Traefik Service

```bash
# Check Traefik service and NodePorts
kubectl get svc -n kube-system traefik

# Should show:
# TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE
# LoadBalancer   10.43.xxx.xxx   <pending>     80:30080/TCP,443:30443/TCP   Xd
#                                               ^^^^^^^^^^  ^^^^^^^^^^^^
#                                               These are your NodePorts
```

---

## 🧪 Testing & Validation

### Test 1: Connectivity from Windows VM
```bash
# SSH to Windows VM and test k8s access
curl http://<K8S_NODE_IP>:30080
# Should return: 301 redirect or 200 response

curl -k https://<K8S_NODE_IP>:30443
# Should return: 200 response or application HTML
```

### Test 2: ACME Challenge Path
```bash
# From any machine with internet access
curl -I http://hr.mtncarerx.com/.well-known/acme-challenge/test

# Expected: Should NOT redirect to HTTPS
# Expected: 404 from Traefik (route not found) is OK
# NOT Expected: 301 redirect (this means ACME is broken)
```

### Test 3: HTTP to HTTPS Redirect
```bash
# Test that regular HTTP traffic redirects
curl -I http://hr.mtncarerx.com/

# Expected: 301 Moved Permanently
# Location: https://hr.mtncarerx.com/
```

### Test 4: HTTPS Access
```bash
# Test HTTPS access
curl -I https://hr.mtncarerx.com/

# Expected: 200 OK or 302 redirect to login
# Check certificate: openssl s_client -connect hr.mtncarerx.com:443 -servername hr.mtncarerx.com
```

### Test 5: Application Functionality
- [ ] Open https://hr.mtncarerx.com in browser
- [ ] Verify SSL certificate is valid (check browser padlock)
  - **Note:** If using letsencrypt-staging, browser will show "not secure" - this is expected
- [ ] Test login page loads
- [ ] Test user login works
- [ ] Test any real-time/WebSocket features
- [ ] Test file upload (if applicable)

---

## 📊 Monitoring & Health Checks

### Certificate Status (If using cert-manager)
```bash
# Check certificate status
kubectl get certificate -n sveltehr-prod

# Check certificate details
kubectl describe certificate hr-mtncarerx-tls -n sveltehr-prod

# Check certificate secret
kubectl get secret hr-mtncarerx-tls-secret -n sveltehr-prod
```

### Application Health
```bash
# Check pod status
kubectl get pods -n sveltehr-prod

# Check logs
kubectl logs -n sveltehr-prod -l app.kubernetes.io/component=frontend -f
kubectl logs -n sveltehr-prod -l app.kubernetes.io/component=backend -f
```

### Nginx Logs (Windows VM)
```bash
# Watch nginx access log
tail -f /var/log/nginx/hr-mtncarerx-access.log

# Watch nginx error log
tail -f /var/log/nginx/hr-mtncarerx-error.log
```

---

## 🔧 Troubleshooting

### Issue: ACME Challenge Fails
**Symptoms:**
- Certificate shows "Not Ready"
- cert-manager logs show "validation failed"

**Check:**
```bash
# Test ACME path
curl http://hr.mtncarerx.com/.well-known/acme-challenge/test

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager -f

# Check challenges
kubectl get challenges -n sveltehr-prod
kubectl describe challenge <challenge-name> -n sveltehr-prod
```

**Fix:**
- Ensure nginx config allows /.well-known/acme-challenge/ to proxy to k8s (already fixed)
- Verify port 80 is accessible from internet
- Check Windows firewall allows port 80

### Issue: 502 Bad Gateway
**Symptoms:**
- nginx returns 502 error
- Can't reach application

**Check:**
```bash
# Test k8s node directly
curl http://<K8S_NODE_IP>:30080
curl -k https://<K8S_NODE_IP>:30443

# Check Traefik service
kubectl get svc -n kube-system traefik

# Check if pods are running
kubectl get pods -n sveltehr-prod
```

**Fix:**
- Verify K8S_NODE_IP is correct in nginx config
- Ensure k8s pods are running
- Check Traefik ingress is deployed

### Issue: SSL Certificate Invalid
**Symptoms:**
- Browser shows "Not Secure" or certificate error
- Certificate is self-signed or expired

**Check:**
```bash
# Check certificate
openssl s_client -connect hr.mtncarerx.com:443 -servername hr.mtncarerx.com | grep -i "verify\|issuer"

# Check cert-manager certificate
kubectl get certificate -n sveltehr-prod
```

**Fix:**
- If using letsencrypt-staging: Browser warnings are expected (staging certs are not trusted)
- Switch to letsencrypt-prod when ready for production
- Verify certificate paths are correct in nginx config

### Issue: WebSocket Connection Failed
**Symptoms:**
- Real-time features don't work
- Browser console shows WebSocket errors

**Check:**
- Verify `Upgrade` and `Connection` headers in nginx config (already configured)
- Check browser developer tools Network tab for WebSocket upgrade

**Fix:**
- Ensure nginx has WebSocket proxy headers (already configured in hr-mtncarerx.conf)

---

## ✅ Final Verification

Before considering deployment complete:

- [ ] All pods in sveltehr-prod namespace are Running
- [ ] Certificate is Ready (if using cert-manager)
- [ ] HTTP redirects to HTTPS (except /.well-known/acme-challenge/)
- [ ] HTTPS site loads correctly
- [ ] SSL certificate is valid (or staging if testing)
- [ ] Application login works
- [ ] No errors in nginx logs
- [ ] No errors in k8s pod logs

---

## 📝 Post-Deployment

### Switch to Production Certificates (When Ready)

1. Update both files to use `letsencrypt-prod`:
   - `k8s/manifests/certificates/hr-mtncarerx-certificate.yaml`
   - `k8s/helm-charts/sveltehr/values-prod.yaml`

2. Apply changes:
   ```bash
   kubectl apply -f k8s/manifests/certificates/hr-mtncarerx-certificate.yaml
   kubectl delete certificate hr-mtncarerx-tls -n sveltehr-prod  # Force recreation
   kubectl apply -f k8s/manifests/certificates/hr-mtncarerx-certificate.yaml
   ```

3. Wait for new certificate and export (if using Strategy B)

### Set Up Automated Certificate Sync (Optional)

```bash
kubectl apply -f k8s/manifests/certificates/cert-sync-cronjob.yaml
```

### Document Your Configuration

Record which strategy you used and any customizations for future reference.

---

**Status:** Ready to deploy! 🚀
