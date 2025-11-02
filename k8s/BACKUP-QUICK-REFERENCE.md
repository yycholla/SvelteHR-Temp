# Velero Backup Quick Reference

## Common Commands

### Backup Operations

```bash
# List all backups
velero backup get

# Create manual backup (entire cluster)
velero backup create manual-backup --wait

# Backup specific namespace
velero backup create ns-backup --include-namespaces sveltehr-prod --wait

# Backup with 7-day retention
velero backup create temp-backup --ttl 168h --wait

# Check backup details
velero backup describe <backup-name> --details

# View backup logs
velero backup logs <backup-name>

# Delete a backup
velero backup delete <backup-name>
```

### Restore Operations

```bash
# List all restores
velero restore get

# Restore from latest backup
velero restore create --from-backup <backup-name>

# Restore specific namespace
velero restore create --from-backup <backup-name> \
  --include-namespaces sveltehr-prod

# Restore to different namespace (testing)
velero restore create --from-backup <backup-name> \
  --namespace-mappings sveltehr-prod:sveltehr-test

# Restore only specific resources
velero restore create --from-backup <backup-name> \
  --include-resources deployments,services

# Check restore status
velero restore describe <restore-name> --details

# View restore logs
velero restore logs <restore-name>
```

### Schedule Management

```bash
# List backup schedules
velero schedule get

# Create new schedule (every 6 hours, 24h retention)
velero schedule create frequent-backup \
  --schedule="0 */6 * * *" \
  --ttl 24h \
  --include-namespaces sveltehr-prod

# Pause a schedule
velero schedule pause <schedule-name>

# Unpause a schedule
velero schedule unpause <schedule-name>

# Delete a schedule
velero schedule delete <schedule-name>
```

### Monitoring

```bash
# Check backup location status
velero backup-location get

# Check volume snapshot locations
velero snapshot-location get

# View recent backup history
velero backup get --selector velero.io/schedule-name=daily-backup

# Check for failed backups
velero backup get | grep -E "(Failed|PartiallyFailed)"

# Watch for new backups
watch -n 5 velero backup get
```

## Doppler Secrets Reference

Required secrets in Doppler (`sveltehr` project, `prod` config):

| Secret | Description | Example |
|--------|-------------|---------|
| `MINIO_ROOT_USER` | MinIO admin username | `minioadmin` |
| `MINIO_ROOT_PASSWORD` | MinIO admin password | `<32-char random>` |
| `VELERO_MINIO_ACCESS_KEY` | Velero's access key | `velero` |
| `VELERO_MINIO_SECRET_KEY` | Velero's secret key | `<32-char random>` |

Generate secrets:
```bash
openssl rand -base64 32
```

## Installation

```bash
# One-command installation
/home/chanway/SvelteHR/k8s/scripts/install-backup-infrastructure.sh
```

## Disaster Recovery Workflow

### Full Cluster Recovery

1. **Setup new cluster** (K3s, RKE2, etc.)

2. **Install prerequisites**:
```bash
# Install cert-manager, traefik, CloudNativePG, External Secrets
```

3. **Install backup infrastructure**:
```bash
/home/chanway/SvelteHR/k8s/scripts/install-backup-infrastructure.sh
```

4. **Restore MinIO data** (if using local MinIO):
```bash
# Transfer MinIO backup from old system
kubectl cp ./minio-backup.tar.gz backup-system/<minio-pod>:/tmp/
kubectl exec -n backup-system <minio-pod> -- tar xzf /tmp/minio-backup.tar.gz -C /
```

5. **Verify backups available**:
```bash
velero backup get
```

6. **Restore application**:
```bash
# Restore latest weekly backup
velero restore create disaster-recovery \
  --from-backup weekly-backup-<latest> \
  --wait

# Monitor restore
velero restore get
kubectl get pods --all-namespaces
```

### Namespace-Only Recovery

If only one namespace is affected:

```bash
# Delete damaged namespace
kubectl delete namespace sveltehr-prod

# Restore from backup
velero restore create ns-restore \
  --from-backup daily-backup-<latest> \
  --include-namespaces sveltehr-prod \
  --wait

# Verify
kubectl get pods -n sveltehr-prod
```

## Migration to New System

### Export from Source

```bash
# On source system
# 1. Get latest backup
velero backup get

# 2. Backup MinIO data
kubectl exec -n backup-system <minio-pod> -- \
  tar czf /tmp/minio-backup.tar.gz /data

# 3. Copy to local machine
kubectl cp backup-system/<minio-pod>:/tmp/minio-backup.tar.gz ./minio-backup.tar.gz
```

### Import to Destination

```bash
# On new system
# 1. Install backup infrastructure
/home/chanway/SvelteHR/k8s/scripts/install-backup-infrastructure.sh

# 2. Restore MinIO data
kubectl cp ./minio-backup.tar.gz backup-system/<new-minio-pod>:/tmp/
kubectl exec -n backup-system <new-minio-pod> -- \
  tar xzf /tmp/minio-backup.tar.gz -C /

# 3. Verify backups available
velero backup get

# 4. Restore application
velero restore create migration \
  --from-backup <latest-backup> \
  --wait
```

## Troubleshooting

### Backup Stuck

```bash
# Check Velero logs
kubectl logs -n backup-system -l app.kubernetes.io/name=velero -f

# Check node agent logs (for PVC backups)
kubectl logs -n backup-system -l name=node-agent -f

# Delete stuck backup
velero backup delete <backup-name> --confirm
```

### MinIO Connection Issues

```bash
# Test MinIO connectivity
kubectl exec -n backup-system deployment/velero -- \
  curl -I http://minio.backup-system.svc.cluster.local:9000

# Check MinIO pods
kubectl get pods -n backup-system -l app.kubernetes.io/name=minio

# Check MinIO logs
kubectl logs -n backup-system -l app.kubernetes.io/name=minio -f
```

### External Secrets Not Syncing

```bash
# Check External Secret status
kubectl describe externalsecret -n backup-system

# Check External Secrets operator logs
kubectl logs -n external-secrets-system \
  -l app.kubernetes.io/name=external-secrets -f

# Force secret refresh
kubectl annotate externalsecret <name> -n backup-system \
  force-sync="$(date +%s)" --overwrite
```

## Storage Management

### Check MinIO Storage Usage

```bash
# Port-forward to MinIO console
kubectl port-forward svc/minio-console -n backup-system 9001:9001

# Open browser: http://localhost:9001
# Login and check "velero-backups" bucket size
```

### Expand MinIO Storage

```bash
# Edit MinIO PVC
kubectl edit pvc -n backup-system <minio-pvc-name>

# Increase size in spec.resources.requests.storage
# Example: 50Gi → 100Gi

# Wait for expansion
kubectl get pvc -n backup-system -w
```

### Clean Old Backups

```bash
# List old backups
velero backup get | grep -E "$(date -d '60 days ago' +%Y%m)"

# Delete backups older than 60 days
velero backup get -o json | \
  jq -r '.items[] | select(.status.startTimestamp < (now - 5184000 | todate)) | .metadata.name' | \
  xargs -I {} velero backup delete {} --confirm
```

## Backup Schedules (Default)

| Schedule | Cron | Retention | Scope |
|----------|------|-----------|-------|
| `daily-backup` | `0 2 * * *` | 30 days | sveltehr-prod, backup-system, cnpg-system, monitoring |
| `weekly-backup` | `0 3 * * 0` | 90 days | All namespaces |

## Performance Tips

1. **Exclude unnecessary data**:
```bash
velero backup create optimized-backup \
  --exclude-namespaces kube-system,kube-public \
  --wait
```

2. **Use volume snapshots for large PVCs** (already enabled by default)

3. **Parallel backups** for faster completion (configured in Velero settings)

4. **Compress backups** (MinIO handles automatically)

## Links

- Full guide: `k8s/BACKUP-SETUP-GUIDE.md`
- Velero docs: https://velero.io/docs/
- MinIO docs: https://min.io/docs/minio/kubernetes/upstream/
