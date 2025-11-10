# Kubernetes Backup-First Deployment Checklist

**Version**: 1.0.0
**Date**: 2025-11-10
**Estimated Total Time**: 1 hour 30 minutes

---

## Pre-Deployment Checklist

### Server Preparation

- [ ] **Server Specifications Met**
  - [ ] 4+ CPU cores (8 recommended)
  - [ ] 16+ GB RAM (32 GB recommended)
  - [ ] 100+ GB free disk space (250 GB recommended)
  - [ ] Ubuntu 22.04 LTS installed (or compatible OS)
  - [ ] Static IP address configured
  - [ ] Root/sudo access available

- [ ] **Network Configuration**
  - [ ] DNS A record created: `hr.example.com` → `<server-ip>`
  - [ ] DNS propagated (verify with `dig +short hr.example.com`)
  - [ ] Firewall ports configured:
    - [ ] Port 22 (SSH) - restricted to admin IPs
    - [ ] Port 80 (HTTP) - for Let's Encrypt
    - [ ] Port 443 (HTTPS) - for application traffic
    - [ ] Port 6443 (Kubernetes API) - restricted to admin IPs
  - [ ] Outbound internet access confirmed

### Credentials & Secrets Ready

- [ ] **Doppler Integration**
  - [ ] Doppler service token: `dp.st.prod.xxxxx`
  - [ ] Token has access to `sveltehr` project, `prod` config
  - [ ] Token tested: `curl -H "Authorization: Bearer dp.st.prod.xxxxx" https://api.doppler.com/v3/configs/config`

- [ ] **Tailscale VPN**
  - [ ] OAuth Client ID: `kxxxxxxxxx`
  - [ ] OAuth Client Secret: `tskey-client-xxxxx`
  - [ ] Credentials from: `login.tailscale.com/admin/settings/oauth`

- [ ] **GitHub Container Registry**
  - [ ] GitHub username: `your-username`
  - [ ] GitHub PAT with `read:packages` scope: `ghp_xxxxx`
  - [ ] Token tested: `docker login ghcr.io -u your-username -p ghp_xxxxx`

- [ ] **MinIO Backup Access**
  - [ ] MinIO endpoint known: `http://old-server-ip:9000` or persistent URL
  - [ ] MinIO access key: `your-minio-access-key`
  - [ ] MinIO secret key: `your-minio-secret-key`
  - [ ] Velero bucket name: `velero` (default)
  - [ ] Latest backup verified accessible

### Backup Verification

- [ ] **Backup Status Check**
  - [ ] Latest backup is less than 24 hours old
  - [ ] Backup status is "Completed" (not "PartiallyFailed")
  - [ ] Backup size is reasonable (not 0 bytes)
  - [ ] Backup includes all critical namespaces:
    - [ ] sveltehr-prod
    - [ ] sveltehr-dev
    - [ ] monitoring
    - [ ] cnpg-system

### Tools & Access

- [ ] **SSH Access**
  - [ ] SSH key configured for production server
  - [ ] SSH access tested: `ssh root@hr.example.com "uname -a"`
  - [ ] `known_hosts` entry added or `StrictHostKeyChecking` disabled for first run

- [ ] **Local Workstation Tools** (optional, for monitoring)
  - [ ] `kubectl` installed locally
  - [ ] `argocd` CLI installed locally
  - [ ] `velero` CLI installed locally

---

## Deployment Execution Checklist

### Phase 1: Base Infrastructure (45 minutes)

#### Step 1: System Preparation (10 minutes)

- [ ] SSH into production server
- [ ] Update system packages: `apt update && apt upgrade -y`
- [ ] Install essential tools: `curl wget git vim htop jq`
- [ ] Disable swap: `swapoff -a`
- [ ] Edit `/etc/fstab` to comment out swap
- [ ] Load kernel modules: `overlay`, `br_netfilter`
- [ ] Configure sysctl for Kubernetes networking
- [ ] Install containerd
- [ ] Configure containerd with SystemdCgroup
- [ ] Restart and enable containerd service
- [ ] Verify: `systemctl status containerd` shows active

#### Step 2: Kubernetes Installation (15 minutes)

- [ ] Add Kubernetes apt repository
- [ ] Install `kubelet`, `kubeadm`, `kubectl`
- [ ] Hold Kubernetes packages from auto-upgrade
- [ ] Initialize cluster with `kubeadm init`
- [ ] Save kubeadm join command (for future worker nodes)
- [ ] Configure kubectl for root user
- [ ] Install Flannel CNI
- [ ] Wait for Flannel pods to be ready
- [ ] Remove control-plane taint (single-node cluster)
- [ ] Verify: `kubectl get nodes` shows Ready

#### Step 3: Helm Installation (2 minutes)

- [ ] Install Helm 3 using official script
- [ ] Add Helm repositories:
  - [ ] vmware-tanzu (Velero)
  - [ ] minio (MinIO)
- [ ] Update Helm repositories
- [ ] Verify: `helm version` shows v3.x.x

#### Step 4: Namespace Creation (1 minute)

- [ ] Create namespace: `backup-system`
- [ ] Create namespace: `sveltehr-prod`
- [ ] Create namespace: `sveltehr-dev`
- [ ] Verify: `kubectl get namespaces`

#### Step 5: MinIO Deployment (10 minutes)

- [ ] Clone GitHub repository: `SvelteHR`
- [ ] Navigate to repository directory
- [ ] Install MinIO using Helm with values file
- [ ] Wait for MinIO deployment to be ready
- [ ] Verify MinIO service is accessible
- [ ] Configure MinIO to access existing backup data:
  - [ ] **Option A**: Existing PVC mounted ✓
  - [ ] **Option B**: Mirror from old MinIO instance ✓
  - [ ] **Option C**: Copy data to new storage location ✓
- [ ] Verify: `kubectl exec -n backup-system deployment/minio -- mc ls minio/velero`

#### Step 6: Velero Credentials (2 minutes)

- [ ] Extract MinIO credentials from secret
- [ ] Create Velero credentials file (`/tmp/velero-credentials`)
- [ ] Create Kubernetes secret: `velero-credentials`
- [ ] Remove credentials file from filesystem
- [ ] Verify: `kubectl get secret velero-credentials -n backup-system`

### Phase 2: Restore from Backup (30 minutes)

#### Step 7: Velero Installation (5 minutes)

- [ ] Install Velero using Helm with values file
- [ ] Wait for Velero deployment to be ready
- [ ] Download Velero CLI binary
- [ ] Move Velero CLI to `/usr/local/bin/`
- [ ] Make Velero CLI executable
- [ ] Verify: `velero version` shows client and server versions
- [ ] Verify: `velero backup-location get` shows "Available"

#### Step 8: List and Choose Backup (2 minutes)

- [ ] List all available backups: `velero backup get`
- [ ] Identify latest daily backup
- [ ] Store backup name in variable: `$LATEST_BACKUP`
- [ ] Verify backup details: `velero backup describe $LATEST_BACKUP`
- [ ] Check backup is "Completed" status

#### Step 9: Perform Restore (20 minutes)

- [ ] Start restore from latest backup
- [ ] Monitor restore progress: `watch velero restore get`
- [ ] Wait for restore to complete (15-25 minutes)
- [ ] Verify restore status: "Completed"
- [ ] Check restore logs: `velero restore logs <restore-name>`
- [ ] Review any warnings or errors

#### Step 10: Verify Restored Resources (3 minutes)

- [ ] Check all namespaces restored: `kubectl get namespaces`
- [ ] Check pods in all namespaces (excluding kube-system)
- [ ] Verify PostgreSQL clusters exist: `kubectl get cluster --all-namespaces`
- [ ] Verify PVCs are bound: `kubectl get pvc --all-namespaces`
- [ ] Check deployments: `kubectl get deployments --all-namespaces`

### Phase 3: Post-Restore Configuration (15 minutes)

#### Step 11: Apply Critical Secrets (5 minutes)

- [ ] Create/update Doppler token secret in `sveltehr-prod`
- [ ] Create/update Tailscale OAuth secret in `tailscale`
- [ ] Create/update GHCR pull secret in `sveltehr-prod`
- [ ] Create/update GHCR pull secret in `sveltehr-dev`
- [ ] Verify all secrets exist: `kubectl get secrets -n sveltehr-prod`

#### Step 12: Restart Components (5 minutes)

- [ ] Restart External Secrets Operator
- [ ] Wait for External Secrets to be ready
- [ ] Restart Tailscale Operator
- [ ] Wait for Tailscale to be ready
- [ ] Restart all production deployments
- [ ] Restart all development deployments
- [ ] Wait for all production pods to be ready (timeout 10 minutes)
- [ ] Wait for all development pods to be ready (timeout 10 minutes)

#### Step 13: Install ArgoCD (Optional, 5 minutes)

- [ ] Create argocd namespace (if not restored)
- [ ] Install ArgoCD manifests
- [ ] Wait for ArgoCD server to be ready
- [ ] Extract ArgoCD admin password
- [ ] Save admin password securely
- [ ] Install ArgoCD CLI
- [ ] Setup port-forward for ArgoCD UI
- [ ] Login to ArgoCD via CLI

#### Step 14: Configure ArgoCD Applications (Optional)

- [ ] Apply ArgoCD projects (infrastructure, applications, security)
- [ ] Apply infrastructure app-of-apps
- [ ] Apply dev-apps app-of-apps
- [ ] Apply prod-apps app-of-apps
- [ ] Sync ArgoCD apps without pruning (adopt existing resources)
- [ ] Verify ArgoCD apps are synced

---

## Post-Deployment Verification Checklist

### Health Checks (10 minutes)

#### Cluster Health

- [ ] All nodes in Ready state: `kubectl get nodes`
- [ ] All system pods running: `kubectl get pods -n kube-system`
- [ ] CoreDNS operational: `kubectl get pods -n kube-system -l k8s-app=kube-dns`
- [ ] No crashlooping pods: `kubectl get pods --all-namespaces | grep -vE "Running|Completed"`

#### Infrastructure Components

- [ ] **Monitoring Stack**
  - [ ] Prometheus pods running: `kubectl get pods -n monitoring | grep prometheus`
  - [ ] Grafana pod running: `kubectl get pods -n monitoring | grep grafana`
  - [ ] Alertmanager pod running: `kubectl get pods -n monitoring | grep alertmanager`

- [ ] **PostgreSQL Operator**
  - [ ] CloudNativePG operator running: `kubectl get pods -n cnpg-system`
  - [ ] PostgreSQL clusters healthy: `kubectl get cluster --all-namespaces`

- [ ] **Ingress & TLS**
  - [ ] Traefik pods running: `kubectl get pods -n traefik`
  - [ ] cert-manager pods running: `kubectl get pods -n cert-manager`
  - [ ] TLS certificates issued: `kubectl get certificate --all-namespaces`

- [ ] **Backup System**
  - [ ] MinIO pod running: `kubectl get pods -n backup-system | grep minio`
  - [ ] Velero pod running: `kubectl get pods -n backup-system | grep velero`
  - [ ] Backup schedules active: `velero schedule get`

- [ ] **Secret Management**
  - [ ] External Secrets Operator running: `kubectl get pods -n external-secrets-system`
  - [ ] ClusterSecretStore healthy: `kubectl get clustersecretstore`
  - [ ] ExternalSecrets syncing: `kubectl get externalsecret --all-namespaces`

- [ ] **VPN & Networking**
  - [ ] Tailscale operator running: `kubectl get pods -n tailscale`
  - [ ] Tailscale connected: Check Tailscale admin console

#### Application Health

- [ ] **Production Application (sveltehr-prod)**
  - [ ] Frontend deployment ready: `kubectl get deployment -n sveltehr-prod sveltehr-prod-frontend`
  - [ ] Backend deployment ready: `kubectl get deployment -n sveltehr-prod sveltehr-prod-backend`
  - [ ] PostgreSQL cluster healthy: `kubectl get cluster -n sveltehr-prod`
  - [ ] All pods running: `kubectl get pods -n sveltehr-prod`

- [ ] **Development Application (sveltehr-dev)**
  - [ ] Frontend deployment ready: `kubectl get deployment -n sveltehr-dev`
  - [ ] Backend deployment ready: `kubectl get deployment -n sveltehr-dev`
  - [ ] PostgreSQL cluster healthy: `kubectl get cluster -n sveltehr-dev`
  - [ ] All pods running: `kubectl get pods -n sveltehr-dev`

#### Database Connectivity

- [ ] **Production Database**
  - [ ] Connect to PostgreSQL: `kubectl exec -it -n sveltehr-prod <postgres-pod> -- psql -U postgres -d hr_system`
  - [ ] List tables: `\dt`
  - [ ] Verify data exists: `SELECT COUNT(*) FROM employees;`
  - [ ] Check for recent data (verify restore timestamp)

- [ ] **Development Database**
  - [ ] Connect to PostgreSQL: `kubectl exec -it -n sveltehr-dev <postgres-pod> -- psql -U postgres -d hr_system`
  - [ ] Verify tables exist

#### Ingress & External Access

- [ ] **DNS Resolution**
  - [ ] Production domain resolves: `dig +short hr.example.com`
  - [ ] DNS points to correct IP

- [ ] **TLS Certificates**
  - [ ] Production certificate valid: `kubectl get certificate -n sveltehr-prod`
  - [ ] Certificate ready: `Ready` status is `True`
  - [ ] Certificate not expired: Check `kubectl describe certificate`

- [ ] **HTTPS Access**
  - [ ] Production URL accessible: `curl -I https://hr.example.com`
  - [ ] Returns HTTP 200 OK
  - [ ] TLS certificate valid (no warnings)
  - [ ] Health endpoint responds: `curl https://hr.example.com/health`

- [ ] **Application Functionality**
  - [ ] Access production URL in browser
  - [ ] Login page loads correctly
  - [ ] Test login with credentials
  - [ ] Verify dashboard loads
  - [ ] Check API connectivity

#### Monitoring & Observability

- [ ] **Prometheus**
  - [ ] Port-forward: `kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090 &`
  - [ ] Access UI: `http://localhost:9090`
  - [ ] Check targets: All targets "UP"
  - [ ] Run test query: `up{job="kubernetes-nodes"}`

- [ ] **Grafana**
  - [ ] Port-forward: `kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80 &`
  - [ ] Access UI: `http://localhost:3000`
  - [ ] Login with default credentials (admin/prom-operator)
  - [ ] Browse dashboards
  - [ ] Verify data sources connected

- [ ] **Loki (Logs)**
  - [ ] Loki pod running: `kubectl get pods -n monitoring | grep loki`
  - [ ] Grafana Loki datasource configured
  - [ ] Test log query in Grafana

#### Backup Verification

- [ ] **Backup Schedules**
  - [ ] Daily backup schedule active: `velero schedule get | grep daily`
  - [ ] Weekly backup schedule active: `velero schedule get | grep weekly`
  - [ ] Next backup time is correct

- [ ] **Backup Storage**
  - [ ] MinIO accessible: `kubectl exec -n backup-system deployment/minio -- mc ls minio/velero`
  - [ ] Previous backups visible
  - [ ] Storage space sufficient: `df -h`

- [ ] **Create Test Backup**
  - [ ] Run on-demand backup: `velero backup create post-restore-test --wait`
  - [ ] Verify backup completes successfully
  - [ ] Check backup details: `velero backup describe post-restore-test`

---

## Post-Deployment Tasks

### Immediate (Within 1 hour)

- [ ] **Change Default Passwords**
  - [ ] ArgoCD admin password
  - [ ] Grafana admin password
  - [ ] Any other default credentials

- [ ] **Configure Firewall**
  - [ ] Restrict SSH to admin IPs only
  - [ ] Restrict Kubernetes API to admin IPs
  - [ ] Allow HTTP/HTTPS for application traffic
  - [ ] Test firewall rules

- [ ] **Update DNS** (if migrating from old server)
  - [ ] Update A record to new server IP
  - [ ] Wait for DNS propagation (5-60 minutes)
  - [ ] Verify with `dig +short hr.example.com`

- [ ] **Test Disaster Recovery**
  - [ ] Document restore process
  - [ ] Note any issues encountered
  - [ ] Update runbooks

### Within 24 Hours

- [ ] **Configure Monitoring Alerts**
  - [ ] Setup Alertmanager email/Slack notifications
  - [ ] Test alert delivery
  - [ ] Configure alert routing

- [ ] **Setup Automated Backups Monitoring**
  - [ ] Create alerts for backup failures
  - [ ] Configure backup success notifications
  - [ ] Test backup alert delivery

- [ ] **Security Hardening**
  - [ ] Rotate any temporary credentials used during setup
  - [ ] Review RBAC permissions
  - [ ] Enable audit logging (if required)
  - [ ] Run vulnerability scan

- [ ] **Documentation**
  - [ ] Document server IP address
  - [ ] Document all credentials in password manager
  - [ ] Update team runbooks
  - [ ] Share access information with team

### Within 1 Week

- [ ] **Performance Baseline**
  - [ ] Collect resource usage metrics
  - [ ] Document baseline CPU/memory usage
  - [ ] Set up resource alerts

- [ ] **Backup Validation**
  - [ ] Perform test restore to dev environment
  - [ ] Verify data integrity
  - [ ] Document restore time

- [ ] **Team Training**
  - [ ] Train team on ArgoCD usage
  - [ ] Train team on Velero restore procedures
  - [ ] Share troubleshooting guides

---

## Rollback Plan (If Deployment Fails)

### Immediate Rollback (< 30 minutes into deployment)

- [ ] Stop deployment script if running
- [ ] Document failure point and error messages
- [ ] Keep old server running (if migrating)
- [ ] DNS still points to old server
- [ ] No user impact

### Partial Deployment Rollback (30-90 minutes in)

- [ ] Document current cluster state
- [ ] Export critical logs for debugging
- [ ] Keep new cluster for troubleshooting
- [ ] Repoint DNS to old server if necessary
- [ ] Investigate and fix issues before retry

### Complete Cluster Rebuild

- [ ] Destroy new cluster: `kubeadm reset`
- [ ] Clean up directories: `/etc/kubernetes`, `/var/lib/kubelet`
- [ ] Review deployment checklist for missed steps
- [ ] Retry deployment with corrections

---

## Success Criteria

Deployment is considered successful when:

- [ ] ✅ All infrastructure components healthy
- [ ] ✅ All applications running and accessible
- [ ] ✅ Database connectivity verified with existing data
- [ ] ✅ HTTPS access working with valid TLS certificates
- [ ] ✅ Monitoring and logging operational
- [ ] ✅ Backup schedules active and running
- [ ] ✅ ArgoCD tracking all applications
- [ ] ✅ No critical errors in any pod logs
- [ ] ✅ External access confirmed from multiple locations
- [ ] ✅ Team has access to cluster and monitoring

---

## Troubleshooting Quick Reference

### Common Issues

**Issue**: Pods stuck in Pending
- **Check**: `kubectl describe pod <pod-name> -n <namespace>`
- **Common Cause**: Insufficient resources, PVC not bound
- **Fix**: Check `kubectl get pvc` and node resources

**Issue**: Velero restore fails
- **Check**: `velero restore logs <restore-name>`
- **Common Cause**: MinIO not accessible, storage incompatibility
- **Fix**: Verify MinIO connectivity and storage class

**Issue**: External Secrets not syncing
- **Check**: `kubectl get externalsecret --all-namespaces`
- **Common Cause**: Doppler token invalid or missing
- **Fix**: Recreate doppler-token-secret

**Issue**: PostgreSQL cluster not starting
- **Check**: `kubectl logs -n sveltehr-prod <postgres-pod>`
- **Common Cause**: PVC restore incomplete, insufficient resources
- **Fix**: Check PVC status, verify disk space

**Issue**: HTTPS not working
- **Check**: `kubectl get certificate -n sveltehr-prod`
- **Common Cause**: DNS not propagated, cert-manager issues
- **Fix**: Wait for DNS, check cert-manager logs

---

**End of Deployment Checklist**
