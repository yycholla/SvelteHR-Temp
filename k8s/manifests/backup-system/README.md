# Backup System - MinIO & Velero

This directory contains manifests for the backup infrastructure.

## Components

### MinIO Init Job
**File:** `minio-init-job.yaml`

Automatically creates a Velero service account in MinIO with proper permissions.

**Features:**
- Runs after MinIO deployment (ArgoCD sync wave 1)
- Idempotent - safe to re-run
- Creates service account with pre-defined credentials from Doppler
- Applies custom `velero-readwrite` policy to the velero bucket
- Includes init container to wait for MinIO readiness

**Job Flow:**
1. Init container waits for MinIO API to be healthy
2. Main container configures mc (MinIO Client)
3. Checks if service account exists (idempotent)
4. Creates service account if needed
5. Creates and attaches custom policy for velero bucket

## Prerequisites

Before deploying, ensure these secrets exist in Doppler:

### Required Doppler Secrets

| Secret Key | Description | Example |
|------------|-------------|---------|
| `MINIO_ROOT_USER` | MinIO admin username | `minioadmin` |
| `MINIO_ROOT_PASSWORD` | MinIO admin password | (secure random string) |
| `VELERO_MINIO_ACCESS_KEY` | Velero service account access key | `velero-a1b2c3d4` |
| `VELERO_MINIO_SECRET_KEY` | Velero service account secret key | (secure random string) |

### Generate Velero Credentials

Run these commands to generate secure credentials:

```bash
# Generate access key (16 hex characters)
VELERO_ACCESS_KEY="velero-$(openssl rand -hex 8)"
echo "VELERO_MINIO_ACCESS_KEY=${VELERO_ACCESS_KEY}"

# Generate secret key (32 bytes base64 encoded)
VELERO_SECRET_KEY="$(openssl rand -base64 32)"
echo "VELERO_MINIO_SECRET_KEY=${VELERO_SECRET_KEY}"
```

Then add these to Doppler:
```bash
doppler secrets set VELERO_MINIO_ACCESS_KEY="${VELERO_ACCESS_KEY}"
doppler secrets set VELERO_MINIO_SECRET_KEY="${VELERO_SECRET_KEY}"
```

## Deployment

The manifests are automatically deployed by ArgoCD:

```yaml
# ArgoCD Application: minio
# File: k8s/argocd/infrastructure/minio-app.yaml

Sources:
  1. Helm chart (minio/minio)
  2. Values file (k8s/helm-values/minio-values.yaml)
  3. Additional manifests (k8s/manifests/backup-system/*.yaml)

Deployment Order:
  Wave 0: MinIO StatefulSet, Services
  Wave 1: minio-init-job (after MinIO is running)
```

## Verification

### Check Job Status
```bash
# View all jobs in backup-system namespace
kubectl get jobs -n backup-system

# Expected output:
# NAME                COMPLETIONS   DURATION   AGE
# minio-init-velero   1/1           30s        5m
```

### View Job Logs
```bash
# Check init job logs
kubectl logs -n backup-system job/minio-init-velero

# Expected output includes:
# ✓ Service account created successfully
# ✓ Custom policy created
# ✓ MinIO initialization completed successfully!
```

### Verify Velero Connection
```bash
# Check BackupStorageLocation status
kubectl get backupstoragelocation -n backup-system

# Expected output:
# NAME      PHASE       LAST VALIDATED   AGE
# default   Available   1m               10m

# Check Velero logs for errors
kubectl logs -n backup-system deployment/velero | grep -i error
```

## Troubleshooting

### Job Failed
```bash
# View job logs
kubectl logs -n backup-system job/minio-init-velero

# Common issues:
# - MinIO not ready: Init container will retry
# - Invalid credentials: Check Doppler secrets
# - Service account exists: Job will skip creation (expected)
```

### Re-run Job
```bash
# Delete the job (ArgoCD will recreate it)
kubectl delete job minio-init-velero -n backup-system

# Or manually trigger ArgoCD sync
argocd app sync minio
```

### Velero Cannot Connect
```bash
# Check if credentials are synced
kubectl get secret velero-credentials -n backup-system -o yaml

# Decode credentials to verify
kubectl get secret velero-credentials -n backup-system -o jsonpath='{.data.cloud}' | base64 -d

# Restart Velero to pick up new credentials
kubectl rollout restart deployment/velero -n backup-system
```

### Manual Service Account Creation
If automation fails, create manually via MinIO Console:

```bash
# Port-forward to MinIO Console
kubectl port-forward svc/minio-console -n backup-system 9001:9001

# Open in browser: http://localhost:9001
# Login with MINIO_ROOT_USER / MINIO_ROOT_PASSWORD from Doppler
# Navigate to: Identity > Service Accounts
# Create service account with readwrite policy on velero bucket
# Update Doppler with generated credentials
```

## Credential Rotation

To rotate Velero credentials:

1. **Generate new credentials:**
   ```bash
   VELERO_ACCESS_KEY="velero-$(openssl rand -hex 8)"
   VELERO_SECRET_KEY="$(openssl rand -base64 32)"
   ```

2. **Update Doppler:**
   ```bash
   doppler secrets set VELERO_MINIO_ACCESS_KEY="${VELERO_ACCESS_KEY}"
   doppler secrets set VELERO_MINIO_SECRET_KEY="${VELERO_SECRET_KEY}"
   ```

3. **Delete old service account in MinIO:**
   - Access MinIO Console
   - Delete the old service account

4. **Re-run init job:**
   ```bash
   kubectl delete job minio-init-velero -n backup-system
   # ArgoCD will recreate with new credentials
   ```

5. **Restart Velero:**
   ```bash
   kubectl rollout restart deployment/velero -n backup-system
   ```

## Files

- `minio-init-job.yaml` - Kubernetes Job for service account creation
- `minio-console-ingress.yaml` - Tailscale ingress for MinIO Console access
- `README.md` - This file

## Related Files

- `k8s/manifests/external-secrets/minio-init-external-secret.yaml` - Credentials for init job
- `k8s/manifests/external-secrets/minio-external-secret.yaml` - MinIO root credentials
- `k8s/manifests/external-secrets/velero-external-secret.yaml` - Velero credentials
- `k8s/helm-values/minio-values.yaml` - MinIO Helm chart values
- `k8s/argocd/infrastructure/minio-app.yaml` - ArgoCD application definition
