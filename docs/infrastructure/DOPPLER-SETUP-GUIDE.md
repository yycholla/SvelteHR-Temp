# Doppler Integration Setup Guide

This guide walks you through configuring Doppler for secure secrets management in your Kubernetes cluster.

## Current Secrets (Exported)

Your current production secrets have been exported. Here they are:

```
POSTGRES_PASSWORD=secure-postgres-password-changeme
JWT_SECRET=secure-jwt-secret-changeme
JWT_REFRESH_SECRET=secure-jwt-refresh-secret-changeme
SERVICE_AUTH_KEY=secure-service-auth-key-changeme
PGADMIN_PASSWORD=admin
```

**⚠️ SECURITY NOTE**: These are demo values. You should generate strong secrets for production.

---

## Step-by-Step Setup

### Step 1: Create Doppler Account (if you don't have one)

1. Go to https://doppler.com/
2. Sign up for a free account (supports unlimited secrets)
3. Verify your email

---

### Step 2: Create Project and Config

1. **Create Project**:
   - In Doppler dashboard, click **"+ New Project"**
   - Name: `sveltehr`
   - Description: "SvelteHR Production Secrets"
   - Click **"Create Project"**

2. **Create Config**:
   - Inside the `sveltehr` project, you'll see configs
   - Click **"+ Add Config"**
   - Name: `prod`
   - Environment: Production
   - Click **"Create Config"**

---

### Step 3: Add Secrets to Doppler

In the `prod` config, add these secrets with **UPPERCASE** keys:

#### Required Secrets

Click **"Add Secret"** for each:

| Secret Key (UPPERCASE) | Current Value                        | Notes                               |
| ---------------------- | ------------------------------------ | ----------------------------------- |
| `POSTGRES_PASSWORD`    | `secure-postgres-password-changeme`  | Change to strong password           |
| `JWT_SECRET`           | `secure-jwt-secret-changeme`         | Change to random string (32+ chars) |
| `JWT_REFRESH_SECRET`   | `secure-jwt-refresh-secret-changeme` | Change to random string (32+ chars) |
| `SERVICE_AUTH_KEY`     | `secure-service-auth-key-changeme`   | Change to random string (32+ chars) |
| `PGADMIN_PASSWORD`     | `admin`                              | Change to secure password           |

#### Generating Strong Secrets (Optional)

Use these commands to generate secure random secrets:

```bash
# For passwords (32 characters, alphanumeric)
openssl rand -base64 32

# For JWT secrets (64 characters, hex)
openssl rand -hex 64

# Example results:
# POSTGRES_PASSWORD: xK9mP2wQ5vL8nR4tY6uH3jA7sD1fG0zA
# JWT_SECRET: a3f8e2c9d1b4f7e6a8c3d5b2e9f4a7c1d6b8e3a2f9c4d7b5e8a1c6f3d9b2e4a7
```

**After adding each secret**, they should appear in the Doppler dashboard under the `prod` config.

---

### Step 4: Generate Service Token

1. In the `sveltehr` project, go to **"prod" config**
2. Click **"Access"** tab at the top
3. Click **"Service Tokens"** on the left sidebar
4. Click **"Generate Service Token"**
5. **Settings**:
   - Name: `kubernetes-prod-readonly`
   - Access: **"Read"** (NOT "Read/Write" - security best practice)
   - Expires: Never (or set expiration if desired)
6. Click **"Generate Token"**
7. **COPY THE TOKEN IMMEDIATELY** - it starts with `dp.st.prod.xxxx`
   - ⚠️ You can only see it once!
   - Save it somewhere secure (we'll use it in the next step)

Example token format: `dp.st.prod.a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

---

### Step 5: Update Helm Values

Now we'll configure your Helm chart to use Doppler.

**Edit** `k8s/helm-charts/sveltehr/values-prod.yaml`:

Find the `externalSecrets` section and update it:

```yaml
# External Secrets Operator with Doppler (production)
externalSecrets:
  enabled: true # ← Change from false to true
  refreshInterval: 15m

  doppler:
    serviceToken: 'dp.st.prod.YOUR_TOKEN_HERE' # ← Paste your token here
    project: 'sveltehr' # ← Matches your Doppler project name
    config: 'prod' # ← Matches your Doppler config name
```

**Example with token**:

```yaml
externalSecrets:
  enabled: true
  refreshInterval: 15m

  doppler:
    serviceToken: 'dp.st.prod.a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
    project: 'sveltehr'
    config: 'prod'
```

---

### Step 6: Deploy with Updated Configuration

#### Option A: Using Helm Directly

```bash
helm upgrade sveltehr-prod k8s/helm-charts/sveltehr \
  -n sveltehr-prod \
  -f k8s/helm-charts/sveltehr/values.yaml \
  -f k8s/helm-charts/sveltehr/values-prod.yaml
```

#### Option B: Using ArgoCD (Recommended)

If you've set up ArgoCD:

```bash
# 1. Commit changes to Git
git add k8s/helm-charts/sveltehr/values-prod.yaml
git commit -m "Enable External Secrets with Doppler"
git push origin main

# 2. ArgoCD will auto-sync within 3 minutes
# Or manually sync:
argocd app sync sveltehr-prod

# Or via kubectl:
kubectl apply -f k8s/argocd/sveltehr-application.yaml
```

---

### Step 7: Verify External Secrets Synced

```bash
# Check ExternalSecret status
kubectl get externalsecret -n sveltehr-prod

# Expected output:
# NAME                        STORE                  REFRESH INTERVAL   STATUS         READY
# sveltehr-external-secrets   doppler-secret-store   15m                SecretSynced   True
# pgadmin-external-secret     doppler-secret-store   15m                SecretSynced   True
```

**If STATUS is "SecretSynced" and READY is "True"**, you're all set! ✅

**If STATUS shows errors**, see troubleshooting below.

---

### Step 8: Verify Kubernetes Secrets Updated

```bash
# Check that secrets exist
kubectl get secret sveltehr-secrets -n sveltehr-prod
kubectl get secret pgadmin-secret -n sveltehr-prod

# Verify secret keys (should show the 4 keys from Doppler)
kubectl get secret sveltehr-secrets -n sveltehr-prod -o jsonpath='{.data}' | jq -r 'keys'

# Expected output:
# [
#   "JWT_REFRESH_SECRET",
#   "JWT_SECRET",
#   "POSTGRES_PASSWORD",
#   "SERVICE_AUTH_KEY"
# ]
```

---

### Step 9: Restart Pods to Pick Up New Secrets

```bash
# Restart backend to use new secrets
kubectl rollout restart deployment sveltehr-backend -n sveltehr-prod

# Restart frontend
kubectl rollout restart deployment sveltehr-frontend -n sveltehr-prod

# Restart pgAdmin
kubectl rollout restart deployment pgadmin -n sveltehr-prod

# Watch pods restart
kubectl get pods -n sveltehr-prod -w
```

---

### Step 10: Verify Application Still Works

```bash
# Check backend logs
kubectl logs -n sveltehr-prod deployment/sveltehr-backend --tail=50

# Test login via frontend
# Visit: http://sveltehr-frontend.dropbear-elnath.ts.net
# Or: http://192.168.1.129
```

---

## How It Works

```
┌─────────────────────────────────────────────────────┐
│              Doppler Dashboard                       │
│  Project: sveltehr / Config: prod                   │
│                                                      │
│  Secrets:                                           │
│    POSTGRES_PASSWORD=xK9mP2wQ...                    │
│    JWT_SECRET=a3f8e2c9d1b4f7e6...                   │
│    JWT_REFRESH_SECRET=b2d9f5a1...                   │
│    SERVICE_AUTH_KEY=c4e7b3d2...                     │
│    PGADMIN_PASSWORD=secure123                       │
└─────────────────────────────────────────────────────┘
                        ↓
              (API request every 15 min)
                        ↓
┌─────────────────────────────────────────────────────┐
│      External Secrets Operator                      │
│                                                      │
│  SecretStore → Doppler API (with service token)     │
│  ExternalSecret → pulls matching secrets            │
└─────────────────────────────────────────────────────┘
                        ↓
                  (creates/updates)
                        ↓
┌─────────────────────────────────────────────────────┐
│      Kubernetes Secrets (Auto-managed)              │
│                                                      │
│  sveltehr-secrets:                                  │
│    POSTGRES_PASSWORD: <from Doppler>                │
│    JWT_SECRET: <from Doppler>                       │
│    JWT_REFRESH_SECRET: <from Doppler>               │
│    SERVICE_AUTH_KEY: <from Doppler>                 │
│                                                      │
│  pgadmin-secret:                                    │
│    pgadmin-password: <from Doppler>                 │
└─────────────────────────────────────────────────────┘
                        ↓
                  (mounted in pods)
                        ↓
┌─────────────────────────────────────────────────────┐
│            Application Pods                          │
│  Frontend, Backend, pgAdmin                         │
│  (use secrets as environment variables)             │
└─────────────────────────────────────────────────────┘
```

---

## Benefits of Doppler Integration

### ✅ Security

- No plaintext secrets in Git repository
- Centralized access control and audit logs
- Service token can be revoked instantly
- Secrets encrypted at rest and in transit

### ✅ Operational

- Change secrets in Doppler dashboard → auto-syncs to K8s
- No need to run `kubectl` commands to update secrets
- Team members can access secrets via Doppler UI
- Secret rotation without deployment downtime

### ✅ Compliance

- Audit trail: who accessed/changed secrets and when
- Secret versioning and rollback capability
- Compliance-ready (SOC 2, GDPR, HIPAA)

---

## Secret Rotation Workflow

To rotate a secret (e.g., JWT_SECRET):

1. **Update in Doppler**:
   - Go to Doppler dashboard → `sveltehr` → `prod`
   - Click on `JWT_SECRET`
   - Click "Edit" and enter new value
   - Save

2. **Wait for sync** (up to 15 minutes):
   - External Secrets Operator polls every 15 minutes
   - Or force immediate sync:
     ```bash
     kubectl annotate externalsecret sveltehr-external-secrets -n sveltehr-prod \
       force-sync=$(date +%s) --overwrite
     ```

3. **Restart affected pods**:
   ```bash
   kubectl rollout restart deployment sveltehr-backend -n sveltehr-prod
   ```

That's it! No Helm upgrades, no kubectl secret commands.

---

## Troubleshooting

### ExternalSecret shows "SecretSyncFailed"

**Check the error**:

```bash
kubectl describe externalsecret sveltehr-external-secrets -n sveltehr-prod
```

**Common issues**:

1. **Invalid Doppler token**:
   - Error: `401 Unauthorized`
   - Fix: Regenerate token in Doppler, update values-prod.yaml

2. **Wrong project/config name**:
   - Error: `404 Not Found`
   - Fix: Verify project and config names match Doppler exactly

3. **Secrets not matching regex**:
   - Error: `No secrets found`
   - Fix: Ensure Doppler secret keys are UPPERCASE (POSTGRES_PASSWORD, not postgres_password)

4. **Token has wrong permissions**:
   - Error: `403 Forbidden`
   - Fix: Ensure token has at least "Read" access to the config

---

### Pods not picking up new secrets

**Symptoms**: Secrets updated in K8s but pods still use old values

**Fix**: Restart pods to remount secrets:

```bash
kubectl rollout restart deployment <deployment-name> -n sveltehr-prod
```

---

### External Secrets Operator not running

**Check operator status**:

```bash
kubectl get pods -n external-secrets-system
```

**If not running**, reinstall:

```bash
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace \
  --set installCRDs=true
```

---

### Want to temporarily disable External Secrets

**Option 1: Disable in values and redeploy**:

```yaml
externalSecrets:
  enabled: false # Reverts to hardcoded secrets in values.yaml
```

**Option 2: Delete ExternalSecrets (keeps secrets in place)**:

```bash
kubectl delete externalsecret --all -n sveltehr-prod
# Secrets remain in K8s but won't auto-sync anymore
```

---

## Security Best Practices

### ✅ DO

- Use **read-only** service tokens for Kubernetes
- Rotate Doppler service tokens periodically (e.g., every 90 days)
- Use separate Doppler configs for dev/staging/prod
- Enable Doppler audit logs and monitor access
- Set token expiration if possible

### ❌ DON'T

- Don't commit Doppler tokens to Git (use values-prod.yaml which is gitignored in secrets)
- Don't use full-access tokens (read/write) for Kubernetes
- Don't share service tokens between environments
- Don't give developers production token access (use Doppler RBAC)

---

## Monitoring and Alerts

### Check sync status regularly

```bash
# Quick status check
kubectl get externalsecret -n sveltehr-prod

# Detailed status
kubectl describe externalsecret sveltehr-external-secrets -n sveltehr-prod
```

### Set up alerts (optional)

Configure Prometheus to alert on ExternalSecret failures:

```yaml
# Alert when ExternalSecret fails to sync
- alert: ExternalSecretSyncFailed
  expr: external_secrets_sync_calls_total{status="error"} > 0
  for: 10m
  annotations:
    summary: 'External Secret sync failed'
    description: 'Check Doppler token and connectivity'
```

---

## Cost

**Doppler Pricing**:

- **Free tier**: Unlimited secrets, 5 users, perfect for this use case
- **Team tier**: $12/user/month if you need more than 5 users

**No additional cost** for External Secrets Operator (open source, runs in your cluster).

---

## Next Steps After Setup

1. ✅ Change all demo passwords to strong production secrets
2. ✅ Set up Doppler team access for your developers
3. ✅ Configure Doppler audit log exports (optional)
4. ✅ Document secret rotation schedule (e.g., every 90 days)
5. ✅ Set up alerts for ExternalSecret sync failures

---

## Support

- **Doppler Docs**: https://docs.doppler.com/
- **External Secrets Docs**: https://external-secrets.io/
- **Doppler Kubernetes Integration**: https://docs.doppler.com/docs/kubernetes

---

## Summary

You've successfully configured:

- ✅ External Secrets Operator installed
- ✅ Doppler project and config created
- ✅ Secrets migrated from K8s to Doppler
- ✅ Service token generated
- ✅ Helm chart configured with Doppler integration
- ✅ Auto-sync every 15 minutes

**Your secrets are now managed centrally via Doppler!** 🎉

To verify everything is working:

```bash
kubectl get externalsecret -n sveltehr-prod
# Should show "SecretSynced" status
```
