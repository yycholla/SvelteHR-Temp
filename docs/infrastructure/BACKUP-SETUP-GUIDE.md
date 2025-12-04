# Kubernetes Backup Setup with Velero + MinIO

## Overview

Complete backup solution for SvelteHR Kubernetes cluster using:

- **Velero**: Kubernetes backup and restore tool
- **MinIO**: S3-compatible object storage for backup data
- **Doppler**: Secure credential management

## Architecture

```
Velero → MinIO (in-cluster) → Persistent Volume
   ↓
Automated Schedules:
- Daily backups (30 day retention)
- Weekly backups (90 day retention)
```

## Step 1: Add Secrets to Doppler

Go to [Doppler Dashboard](https://dashboard.doppler.com/) → Project: `sveltehr` → Config: `prod`

Add these secrets:

| Secret Name               | Description               | Example Value           |
| ------------------------- | ------------------------- | ----------------------- |
| `MINIO_ROOT_USER`         | MinIO admin username      | `minioadmin`            |
| `MINIO_ROOT_PASSWORD`     | MinIO admin password      | Generate 32-char random |
| `VELERO_MINIO_ACCESS_KEY` | Velero's MinIO access key | `velero`                |
| `VELERO_MINIO_SECRET_KEY` | Velero's MinIO secret key | Generate 32-char random |

**Generate secure passwords**:

```bash
# For passwords
openssl rand -base64 32

# Or use Doppler's generator in the UI
```

## Step 2: Install MinIO

Add MinIO Helm repository:

```bash
helm repo add minio https://charts.min.io/
helm repo update
```

Create namespace and External Secrets:

```bash
# Apply External Secret configuration
kubectl apply -f /home/chanway/SvelteHR/k8s/backup-infrastructure/minio-external-secrets.yaml

# Wait for secrets to sync from Doppler
kubectl wait --for=condition=Ready externalsecret/minio-external-secret -n backup-system --timeout=60s
kubectl wait --for=condition=Ready externalsecret/velero-minio-external-secret -n backup-system --timeout=60s

# Verify secrets created
kubectl get secret -n backup-system
```

Install MinIO:

```bash
helm install minio minio/minio \
  --namespace backup-system \
  -f /home/chanway/SvelteHR/k8s/helm-charts/minio-values.yaml
```

Verify MinIO is running:

```bash
kubectl get pods -n backup-system
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=minio -n backup-system --timeout=120s
```

## Step 3: Install Velero

Add Velero Helm repository:

```bash
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm repo update
```

Create Velero credentials External Secret:

```bash
# Apply Velero External Secret configuration
kubectl apply -f /home/chanway/SvelteHR/k8s/backup-infrastructure/velero-external-secrets.yaml

# Wait for secret to sync
kubectl wait --for=condition=Ready externalsecret/velero-credentials-external-secret -n backup-system --timeout=60s

# Verify secret created
kubectl get secret velero-credentials -n backup-system
```

Install Velero:

```bash
helm install velero vmware-tanzu/velero \
  --namespace backup-system \
  -f /home/chanway/SvelteHR/k8s/helm-charts/velero-values.yaml
```

Verify Velero is running:

```bash
kubectl get pods -n backup-system
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=velero -n backup-system --timeout=120s
```

## Step 4: Verify Backup Configuration

Check backup storage location:

```bash
velero backup-location get
# Should show: default (Available)
```

Check scheduled backups:

```bash
velero schedule get
# Should show:
# - daily-backup (Enabled, every day at 2 AM)
# - weekly-backup (Enabled, every Sunday at 3 AM)
```

## Step 5: Test Manual Backup

Create a test backup:

```bash
# Full backup of sveltehr-prod namespace
velero backup create test-backup \
  --include-namespaces sveltehr-prod \
  --wait

# Check backup status
velero backup describe test-backup --details
```

Verify backup in MinIO:

```bash
# Port-forward to MinIO console
kubectl port-forward svc/minio-console -n backup-system 9001:9001

# Open in browser: http://localhost:9001
# Login with MINIO_ROOT_USER and MINIO_ROOT_PASSWORD from Doppler
# Navigate to "velero-backups" bucket to see backup files
```

## Backup Schedules

### Daily Backup (2 AM)

- **Namespaces**: sveltehr-prod, backup-system, cnpg-system, monitoring
- **Retention**: 30 days
- **Includes**: PVC snapshots

### Weekly Backup (Sunday 3 AM)

- **Namespaces**: All (\*)
- **Retention**: 90 days
- **Includes**: Full cluster state

## Restore Operations

### Restore Entire Namespace

```bash
# List available backups
velero backup get

# Restore from backup
velero restore create --from-backup daily-backup-20251101020000

# Monitor restore progress
velero restore get
velero restore describe <restore-name> --details
```

### Restore Specific Resources

```bash
# Restore only deployments
velero restore create --from-backup daily-backup-20251101020000 \
  --include-resources deployments

# Restore specific namespace
velero restore create --from-backup weekly-backup-20251027030000 \
  --include-namespaces sveltehr-prod
```

### Restore to Different Namespace

```bash
# Restore to a different namespace (for testing)
velero restore create --from-backup daily-backup-20251101020000 \
  --namespace-mappings sveltehr-prod:sveltehr-test
```

## Migration to New System

### Export Backup Data (Source System)

**Option 1: Copy MinIO Data** (Recommended)

```bash
# On source system, backup MinIO PVC data
kubectl get pvc -n backup-system

# Create a backup of the MinIO PVC
kubectl exec -n backup-system <minio-pod-name> -- tar czf /tmp/minio-backup.tar.gz /data

# Copy to local machine
kubectl cp backup-system/<minio-pod-name>:/tmp/minio-backup.tar.gz ./minio-backup.tar.gz

# Transfer minio-backup.tar.gz to new system
```

**Option 2: Use External S3** (For large backups)

- Configure Velero to use external S3 (AWS, Cloudflare R2, etc.)
- Backups accessible from any system

### Setup New System

On the new Kubernetes cluster:

1. **Apply same configuration files**:

```bash
# On new system, clone the repo
git clone <your-repo>
cd SvelteHR
```

2. **Configure Doppler with same secrets**:
   - Use same Doppler project or copy secrets to new config

3. **Install backup infrastructure**:

```bash
# Follow Steps 2-3 from this guide
# MinIO + Velero installation
```

4. **Restore MinIO data** (if using Option 1):

```bash
# Copy backup to new system's MinIO pod
kubectl cp ./minio-backup.tar.gz backup-system/<new-minio-pod>:/tmp/

# Extract backup
kubectl exec -n backup-system <new-minio-pod> -- tar xzf /tmp/minio-backup.tar.gz -C /
```

5. **Verify backups available**:

```bash
velero backup get
# Should show all backups from source system
```

6. **Restore application**:

```bash
# Choose most recent backup
velero restore create --from-backup daily-backup-20251101020000

# Wait for restore to complete
velero restore get
```

7. **Verify application**:

```bash
kubectl get pods -n sveltehr-prod
kubectl get ingress -n sveltehr-prod
```

## Disaster Recovery

### Complete Cluster Loss

If entire cluster is lost:

1. **Setup new Kubernetes cluster** (K3s, RKE2, etc.)
2. **Install core dependencies**:
   - cert-manager
   - traefik (or ingress controller)
   - CloudNativePG operator
   - External Secrets operator
3. **Install backup infrastructure** (Velero + MinIO)
4. **Restore MinIO data** with backups
5. **Restore all namespaces**:
   ```bash
   velero restore create --from-backup weekly-backup-<latest>
   ```
6. **Verify and reconnect**:
   - Check all pods are running
   - Reconnect Tailscale
   - Reconfigure Cloudflare Tunnel

## Backup Monitoring

### Check Backup Health

```bash
# List recent backups
velero backup get

# Check for failed backups
velero backup get --selector velero.io/schedule-name=daily-backup

# View backup logs
velero backup logs <backup-name>
```

### Prometheus Alerts (Optional)

Velero exposes metrics at `/metrics`. Configure alerts for:

- Backup failures
- Old backups (> 7 days)
- Storage space issues

## Backup Best Practices

1. **Test restores regularly** - Monthly restore tests to verify backup integrity
2. **Monitor backup size** - Adjust MinIO PVC size as needed
3. **Offsite backups** - Consider replicating to external S3 for disaster recovery
4. **Document restore procedures** - Keep runbooks updated
5. **Secure credentials** - Keep Doppler secrets secure and rotated

## Troubleshooting

### Backup Stuck in "InProgress"

```bash
# Check Velero logs
kubectl logs -n backup-system -l app.kubernetes.io/name=velero -f

# Check node agent logs (for PVC snapshots)
kubectl logs -n backup-system -l name=node-agent -f
```

### MinIO Connection Errors

```bash
# Verify MinIO is accessible
kubectl exec -n backup-system deployment/velero -- \
  curl -I http://minio.backup-system.svc.cluster.local:9000

# Check MinIO credentials
kubectl get secret velero-credentials -n backup-system -o yaml
```

### External Secrets Not Syncing

```bash
# Check External Secret status
kubectl describe externalsecret minio-external-secret -n backup-system

# Verify Doppler connection
kubectl logs -n external-secrets-system -l app.kubernetes.io/name=external-secrets -f
```

## Storage Requirements

**Estimate backup sizes**:

- Small deployment (< 10 PVCs): ~5-10 GB per backup
- Medium deployment (10-50 PVCs): ~50-100 GB per backup
- Large deployment (> 50 PVCs): ~500+ GB per backup

**Recommended MinIO PVC sizes**:

- Development: 20 GB
- Production (30-day retention): 50-100 GB
- Production (90-day retention): 200-500 GB

Adjust `persistence.size` in `minio-values.yaml` based on your needs.

## Cost Optimization

**For external S3 storage**:

- Use Cloudflare R2 (no egress fees)
- Use AWS S3 with lifecycle policies
- Use Backblaze B2 (cost-effective)

**Backup retention tuning**:

```bash
# Shorter retention for dev environments
velero backup create dev-backup --ttl 168h  # 7 days

# Longer retention for compliance
velero backup create compliance-backup --ttl 8760h  # 1 year
```

## Summary

✅ **Automated daily and weekly backups**
✅ **Complete cluster disaster recovery**
✅ **Easy migration to new systems**
✅ **Secure credential management with Doppler**
✅ **S3-compatible storage with MinIO**

**Next Steps**:

1. Add secrets to Doppler
2. Install MinIO and Velero
3. Perform test backup and restore
4. Schedule first production backup
