# Doppler Integration - Quick Start

## Your Current Secrets (Ready to Migrate)

```bash
POSTGRES_PASSWORD=secure-postgres-password-changeme
JWT_SECRET=secure-jwt-secret-changeme
JWT_REFRESH_SECRET=secure-jwt-refresh-secret-changeme
SERVICE_AUTH_KEY=secure-service-auth-key-changeme
PGADMIN_PASSWORD=admin
```

**⚠️ IMPORTANT**: Change these to strong production values!

---

## Two Ways to Set Up

### Option A: Interactive Script (Recommended)

Just run this script and follow the prompts:

```bash
/home/chanway/SvelteHR/k8s/scripts/setup-doppler.sh
```

The script will:
1. Check External Secrets Operator is installed ✓
2. Show you your current secrets
3. Ask for Doppler project name (default: `sveltehr`)
4. Ask for Doppler config name (default: `prod`)
5. Ask for your Doppler service token
6. Update `values-prod.yaml` automatically
7. Deploy with Helm upgrade
8. Verify External Secrets are syncing

---

### Option B: Manual Setup

#### Step 1: Create Doppler Project

1. Go to https://dashboard.doppler.com/
2. Create project: `sveltehr`
3. Create config: `prod`
4. Add these secrets with **UPPERCASE** keys:
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `SERVICE_AUTH_KEY`
   - `PGADMIN_PASSWORD`

#### Step 2: Generate Service Token

1. In Doppler: `sveltehr` → `prod` → Access → Service Tokens
2. Create token: `kubernetes-prod-readonly`
3. Access: **Read** (not Read/Write)
4. Copy token (starts with `dp.st.prod.xxxx`)

#### Step 3: Update Helm Values

Edit `k8s/helm-charts/sveltehr/values-prod.yaml`:

```yaml
externalSecrets:
  enabled: true  # ← Change from false
  refreshInterval: 15m

  doppler:
    serviceToken: "dp.st.prod.YOUR_TOKEN_HERE"  # ← Paste your token
    project: "sveltehr"
    config: "prod"
```

#### Step 4: Deploy

```bash
helm upgrade sveltehr-prod k8s/helm-charts/sveltehr \
  -n sveltehr-prod \
  -f k8s/helm-charts/sveltehr/values.yaml \
  -f k8s/helm-charts/sveltehr/values-prod.yaml
```

#### Step 5: Verify

```bash
# Check sync status
kubectl get externalsecret -n sveltehr-prod

# Should show:
# NAME                        STATUS         READY
# sveltehr-external-secrets   SecretSynced   True
# pgadmin-external-secret     SecretSynced   True
```

#### Step 6: Restart Pods

```bash
kubectl rollout restart deployment sveltehr-backend -n sveltehr-prod
kubectl rollout restart deployment sveltehr-frontend -n sveltehr-prod
kubectl rollout restart deployment pgadmin -n sveltehr-prod
```

---

## Verification Commands

```bash
# Check External Secrets sync status
kubectl get externalsecret -n sveltehr-prod

# Verify secrets exist
kubectl get secret sveltehr-secrets -n sveltehr-prod
kubectl get secret pgadmin-secret -n sveltehr-prod

# Check secret keys
kubectl get secret sveltehr-secrets -n sveltehr-prod -o jsonpath='{.data}' | jq -r 'keys'

# Watch pods restart
kubectl get pods -n sveltehr-prod -w
```

---

## What Happens After Setup

✅ **Secrets managed in Doppler** - Update secrets in Doppler dashboard, they auto-sync to Kubernetes every 15 minutes

✅ **No more Git secrets** - Service token is the only secret in your values file

✅ **Audit trail** - Doppler logs all secret access and changes

✅ **Easy rotation** - Change in Doppler → auto-syncs → restart pods → done

---

## Troubleshooting

### ExternalSecret shows "SecretSyncFailed"

```bash
# Check detailed error
kubectl describe externalsecret sveltehr-external-secrets -n sveltehr-prod

# Common fixes:
# 1. Invalid token → regenerate in Doppler
# 2. Wrong project/config → verify names match
# 3. Keys not uppercase → ensure UPPERCASE in Doppler
```

### Secrets not syncing

```bash
# Force immediate sync (don't wait 15 minutes)
kubectl annotate externalsecret sveltehr-external-secrets -n sveltehr-prod \
  force-sync=$(date +%s) --overwrite
```

### Pods not picking up new secrets

```bash
# Restart pods to remount secrets
kubectl rollout restart deployment <deployment-name> -n sveltehr-prod
```

---

## Full Documentation

- **Detailed guide**: `k8s/DOPPLER-SETUP-GUIDE.md`
- **Export script**: `k8s/scripts/export-secrets-for-doppler.sh`
- **Setup script**: `k8s/scripts/setup-doppler.sh`

---

## Quick Links

- **Doppler Dashboard**: https://dashboard.doppler.com/
- **Doppler Docs**: https://docs.doppler.com/docs/kubernetes
- **External Secrets Docs**: https://external-secrets.io/

---

## Summary

**Before Doppler**:
- Secrets hardcoded in `values-prod.yaml` (plaintext in Git)
- Manual `kubectl` commands to update secrets
- No audit trail

**After Doppler**:
- Secrets in Doppler dashboard (encrypted, never in Git)
- Auto-syncs to Kubernetes every 15 minutes
- Complete audit trail of all secret access
- Easy rotation: update in Doppler → auto-syncs → restart pods

🎉 **Your infrastructure is now production-ready with secure secrets management!**
