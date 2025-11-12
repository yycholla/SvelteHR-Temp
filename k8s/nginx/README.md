# Nginx Configuration for hr.mtncarerx.com

This directory contains nginx configurations for routing traffic from a Windows VM to the SvelteHR application running in Kubernetes.

## Architecture

```
Internet → Windows VM (Nginx) → k8s Traefik (NodePort) → SvelteHR Application
```

## SSL Certificate Options

### Option 1: Nginx SSL Termination (Manual Certificate Management)

**File:** `hr-mtncarerx.conf`

- SSL certificates managed on Windows VM
- Nginx terminates SSL and proxies to Traefik over HTTPS
- Requires manual certificate renewal or Windows-based ACME client (certbot, win-acme)

**Setup:**
1. Obtain SSL certificate for hr.mtncarerx.com
2. Update certificate paths in the config
3. Copy config to Windows nginx directory
4. Manually renew certificates when they expire

**Pros:**
- Simple setup
- Full control over SSL configuration
- No dependency on k8s for SSL

**Cons:**
- Manual certificate management
- Need to renew certificates on Windows VM

---

### Option 2: cert-manager in k8s with Certificate Export

**Files:**
- `k8s/manifests/certificates/hr-mtncarerx-certificate.yaml` - Certificate resource
- `k8s/scripts/export-cert-to-windows.sh` - Export script
- `k8s/manifests/certificates/cert-sync-cronjob.yaml` - Automated sync (optional)

**How it works:**
1. cert-manager in k8s issues and manages Let's Encrypt certificates
2. Certificates are stored as k8s Secrets
3. Export script extracts certificates and copies them to Windows VM
4. Optional CronJob automates periodic sync

**Setup:**
```bash
# 1. Create Certificate resource in k8s
kubectl apply -f k8s/manifests/certificates/hr-mtncarerx-certificate.yaml

# 2. Wait for certificate to be issued (can take a few minutes)
kubectl get certificate -n sveltehr-prod hr-mtncarerx-tls -w

# 3. Export certificate to Windows
cd k8s/scripts
chmod +x export-cert-to-windows.sh
# Edit script to add Windows VM IP and credentials
./export-cert-to-windows.sh

# 4. (Optional) Set up automated sync
kubectl apply -f k8s/manifests/certificates/cert-sync-cronjob.yaml
```

**Pros:**
- Automatic Let's Encrypt certificate renewal by cert-manager
- Centralized certificate management in k8s
- Can be automated with CronJob

**Cons:**
- Requires sync mechanism between k8s and Windows
- Need SSH or file sharing access to Windows VM
- Slight delay between renewal and sync

---

### Option 3: TCP Passthrough to Traefik (Recommended - Zero Certificate Management)

**File:** `hr-mtncarerx-with-acme-proxy.conf`

**How it works:**
1. Nginx proxies ACME challenges (port 80) to k8s for cert-manager validation
2. Nginx uses TCP passthrough (stream module) for HTTPS traffic
3. Traefik in k8s handles SSL termination with cert-manager certificates
4. No certificates stored on Windows VM

**Setup:**
```nginx
# Add to Windows nginx.conf (main context, outside http block):
stream {
    upstream k8s_traefik_https_stream {
        server <K8S_NODE_IP>:30443 max_fails=3 fail_timeout=30s;
    }

    # SNI routing with SSL preread (doesn't decrypt)
    map $ssl_preread_server_name $upstream {
        hr.mtncarerx.com k8s_traefik_https_stream;
        portal.mtncarerx.com portal_backend;  # Your other service
        default k8s_traefik_https_stream;
    }

    server {
        listen 443;
        proxy_pass $upstream;
        ssl_preread on;  # Read SNI without decrypting
    }
}

# In http block:
http {
    # ... other configs ...

    # Proxy ACME challenges to k8s
    server {
        listen 80;
        server_name hr.mtncarerx.com;

        location /.well-known/acme-challenge/ {
            proxy_pass http://<K8S_NODE_IP>:30080;
            proxy_set_header Host $host;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }
}
```

**Pros:**
- Zero certificate management on Windows VM
- Automatic renewals handled entirely by cert-manager
- Simple nginx configuration
- Works alongside portal.mtncarerx.com seamlessly

**Cons:**
- Requires nginx with stream module (usually included)
- Can't inspect/modify HTTPS traffic at nginx level
- Slight learning curve for stream module

---

## DNS Configuration

Ensure your DNS points to the Windows VM:

```
hr.mtncarerx.com    A    <WINDOWS_VM_IP>
```

## Deployment Checklist

- [ ] Update `<K8S_NODE_IP>` in nginx configs
- [ ] Update certificate paths (if using Option 1 or 2)
- [ ] Choose SSL certificate management approach
- [ ] Copy config to Windows nginx directory
- [ ] Test nginx config: `nginx -t`
- [ ] Reload nginx: `nginx -s reload`
- [ ] Verify DNS resolves to Windows VM
- [ ] Test HTTP redirect: `curl -I http://hr.mtncarerx.com`
- [ ] Test HTTPS: `curl -I https://hr.mtncarerx.com`

## Troubleshooting

### Certificate Issues
```bash
# Check certificate in k8s
kubectl describe certificate hr-mtncarerx-tls -n sveltehr-prod

# Check certificate secret
kubectl get secret hr-mtncarerx-tls-secret -n sveltehr-prod -o yaml

# Verify certificate expiry
openssl x509 -in /path/to/cert.crt -noout -dates
```

### Connectivity Issues
```bash
# Test Traefik NodePort from Windows VM
curl http://<K8S_NODE_IP>:30080
curl -k https://<K8S_NODE_IP>:30443

# Check nginx error logs
tail -f /var/log/nginx/hr-mtncarerx-error.log

# Test from outside
curl -I http://hr.mtncarerx.com
curl -I https://hr.mtncarerx.com
```

### cert-manager ACME Challenge Issues
```bash
# Check ACME challenge status
kubectl get challenges -n sveltehr-prod

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager -f

# Manually test ACME challenge endpoint
curl http://hr.mtncarerx.com/.well-known/acme-challenge/test
```

## Recommended Approach

**For Production:** Use **Option 3 (TCP Passthrough)** - it's the cleanest approach with zero certificate management overhead on the Windows VM.

**For Development/Testing:** Use **Option 1 (Manual Certificates)** - simplest to set up initially.
