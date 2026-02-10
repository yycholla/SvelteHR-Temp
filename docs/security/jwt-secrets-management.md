# JWT Secrets Management

## Overview

This document describes how JWT RSA keys are managed across development, staging, and production environments.

## Key Generation

RSA-2048 key pairs are used for JWT signing with the RS256 algorithm:

```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Extract public key
openssl rsa -in private.pem -pubout -out public.pem
```

**CRITICAL:** The private key must NEVER be committed to version control. The `.gitignore` file includes `*.pem` to prevent accidental commits.

## Development Environment

### Local Development

For local development, RSA keys are stored in:

- `graphql-rust-server/private.pem` (private key)
- `graphql-rust-server/public.pem` (public key)

These files are referenced in `graphql-rust-server/.env`:

```env
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
[contents of private.pem]
-----END PRIVATE KEY-----"

JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
[contents of public.pem]
-----END PUBLIC KEY-----"
```

**Security Notes:**

- Keys are generated locally and never shared
- Each developer should generate their own keys
- Keys are only used for local testing
- `.pem` files are git-ignored

### Docker Development

For Docker-based development, keys are mounted as secrets or environment variables in `docker-compose.dev.yml`.

## Staging Environment

**Recommended: AWS Secrets Manager or HashiCorp Vault**

### AWS Secrets Manager

1. Store keys as SecretString:

   ```bash
   aws secretsmanager create-secret \
     --name staging/jwt/private-key \
     --secret-string "file://private.pem" \
     --description "JWT RS256 private key for staging"

   aws secretsmanager create-secret \
     --name staging/jwt/public-key \
     --secret-string "file://public.pem" \
     --description "JWT RS256 public key for staging"
   ```

2. Application retrieves secrets at runtime:
   - Use AWS SDK to fetch secrets
   - Cache in memory with TTL
   - Rotate keys periodically (every 90 days recommended)

3. IAM Permissions:
   ```json
   {
   	"Version": "2012-10-17",
   	"Statement": [
   		{
   			"Effect": "Allow",
   			"Action": ["secretsmanager:GetSecretValue"],
   			"Resource": ["arn:aws:secretsmanager:*:*:secret:staging/jwt/*"]
   		}
   	]
   }
   ```

### HashiCorp Vault (Alternative)

1. Store keys in Vault KV store:

   ```bash
   vault kv put secret/staging/jwt \
     private_key=@private.pem \
     public_key=@public.pem
   ```

2. Application authenticates with Vault:
   - Kubernetes ServiceAccount token
   - AppRole authentication
   - AWS IAM authentication

3. Retrieve at runtime:
   ```rust
   let vault_client = VaultClient::new();
   let jwt_secrets = vault_client.get_secret("secret/staging/jwt").await?;
   ```

## Production Environment

### AWS Secrets Manager (Recommended)

Same as staging but with:

- Separate secret paths: `production/jwt/private-key`, `production/jwt/public-key`
- Stricter IAM policies (restrict to production role only)
- Automatic rotation enabled (90-day rotation)
- CloudWatch alarms for secret access
- Audit logging enabled

### Key Rotation Strategy

**Rotation Timeline:**

- Development: Rotate when compromised (ad-hoc)
- Staging: Rotate every 90 days
- Production: Rotate every 90 days + when compromised

**Rotation Process:**

1. **Generate new key pair:**

   ```bash
   openssl genrsa -out private-new.pem 2048
   openssl rsa -in private-new.pem -pubout -out public-new.pem
   ```

2. **Upload new keys to secrets manager:**

   ```bash
   aws secretsmanager update-secret \
     --secret-id production/jwt/private-key-new \
     --secret-string "file://private-new.pem"
   ```

3. **Deploy application with dual-key support:**
   - Application loads both old and new public keys
   - Signs new tokens with new private key
   - Validates tokens with both old and new public keys

4. **Grace period (7 days):**
   - All existing refresh tokens remain valid
   - Users seamlessly transition to new tokens

5. **Remove old keys after grace period:**
   ```bash
   aws secretsmanager delete-secret \
     --secret-id production/jwt/private-key \
     --force-delete-without-recovery
   ```

### Key Compromise Response

If a private key is compromised:

1. **Immediate actions:**
   - Revoke all tokens by setting `users.tokens_valid_after = NOW()`
   - Generate new key pair
   - Deploy new keys immediately
   - Force all users to re-login

2. **Investigation:**
   - Review access logs
   - Identify scope of compromise
   - Document incident

3. **Post-incident:**
   - Update rotation schedule
   - Review access controls
   - Conduct security training

## Kubernetes Secrets (Alternative)

For Kubernetes deployments:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: jwt-keys
  namespace: production
type: Opaque
stringData:
  private.pem: |
    -----BEGIN PRIVATE KEY-----
    [base64-encoded private key]
    -----END PRIVATE KEY-----
  public.pem: |
    -----BEGIN PUBLIC KEY-----
    [base64-encoded public key]
    -----END PUBLIC KEY-----
```

Mount as volume in pod:

```yaml
volumes:
  - name: jwt-keys
    secret:
      secretName: jwt-keys
volumeMounts:
  - name: jwt-keys
    mountPath: /etc/secrets/jwt
    readOnly: true
```

Application reads from `/etc/secrets/jwt/private.pem` and `/etc/secrets/jwt/public.pem`.

## Security Best Practices

1. **Never log private keys** - Ensure logs don't contain key material
2. **Restrict file permissions** - `chmod 600 private.pem` in production
3. **Use secrets managers** - Never use environment variables in production
4. **Enable audit logging** - Track all secret access
5. **Rotate regularly** - 90-day rotation schedule
6. **Monitor access** - Alert on unusual secret access patterns
7. **Backup keys securely** - Encrypted backups in separate location
8. **Document key lineage** - Track which keys were used when

## Monitoring & Alerts

### CloudWatch Alarms (AWS)

1. **Secret access frequency:**
   - Alert if secret accessed > 1000 times/hour
   - May indicate key compromise or misconfiguration

2. **Failed secret retrieval:**
   - Alert on any failed secret retrieval
   - May indicate IAM permission issues

3. **Key age:**
   - Alert if key not rotated in 90 days
   - Automated reminder for key rotation

### Application Metrics

1. **JWT verification failures:**
   - Track rate of invalid token signatures
   - May indicate key mismatch or compromise

2. **Token issuance rate:**
   - Monitor rate of token generation
   - Unusual spikes may indicate attack

## Compliance

- **SOC 2:** Keys stored in secrets manager meet SOC 2 requirements
- **GDPR:** Key rotation enables "right to be forgotten" compliance
- **PCI DSS:** Secrets manager meets PCI DSS encryption requirements
- **HIPAA:** Audit logging meets HIPAA requirements

## References

- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [HashiCorp Vault Best Practices](https://developer.hashicorp.com/vault/tutorials/operations/production-hardening)
- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
- [RS256 Algorithm](https://tools.ietf.org/html/rfc7518#section-3.3)
