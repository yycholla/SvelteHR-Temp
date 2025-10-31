# Emergency Rollback Procedures

**Feature**: Production Docker Deployment with CI/CD and Caddy
**Version**: 1.0.0
**Date**: 2025-10-28

## Overview

This guide provides step-by-step rollback procedures to quickly revert production deployments in case of critical issues. The target is to complete a full rollback within **5 minutes** to minimize downtime.

## When to Rollback

### Critical Issues Requiring Immediate Rollback

**Trigger rollback if**:
- ✅ Application is completely down or inaccessible
- ✅ Critical features are broken (e.g., authentication, payroll)
- ✅ Data corruption or loss is occurring
- ✅ Severe performance degradation (>5x slower)
- ✅ Security vulnerability is actively being exploited
- ✅ Database migration failed and broke application

### Non-Critical Issues (Don't Rollback)

**Fix forward instead of rollback if**:
- ❌ Minor UI bugs or styling issues
- ❌ Non-critical feature not working as expected
- ❌ Performance degradation <2x slower
- ❌ Issues affecting <5% of users
- ❌ Issues with easy hotfix available

**Why fix forward?**:
- Faster resolution (no full redeployment)
- Avoids rollback risk
- Better for team learning
- Maintains forward momentum

## Pre-Rollback Checklist

**Before initiating rollback, verify**:

1. ✅ **Issue is confirmed critical** (see triggers above)
2. ✅ **You have SSH access** to production server
3. ✅ **You know the previous working version** (commit SHA or tag)
4. ✅ **You have notified the team** (Slack, email, incident channel)
5. ✅ **You have identified the root cause** (to prevent repeat)
6. ✅ **Database backup exists** from before bad deployment

**If unsure, consult**:
- Technical lead or senior engineer
- On-call engineer (if off-hours)
- Product manager (for business impact assessment)

## Rollback Types

### Type 1: Application-Only Rollback (No Database Changes)

**Use when**:
- No database migrations in bad deployment
- Database schema unchanged
- Issue is code-only (bugs, performance, etc.)

**Time estimate**: 2-3 minutes
**Risk level**: Low

### Type 2: Database Rollback Required (Migration Rollback)

**Use when**:
- Bad deployment included database migrations
- Migration altered or corrupted data
- Schema change is incompatible

**Time estimate**: 5-10 minutes
**Risk level**: Medium to High (data loss possible)

### Type 3: Full System Restore (Disaster Recovery)

**Use when**:
- Complete system failure
- Multiple components broken
- Database severely corrupted

**Time estimate**: 15-30 minutes
**Risk level**: High

**See**: `docs/deployment/disaster-recovery.md` for full restore procedures

## Type 1: Application-Only Rollback

### Prerequisites

- Previous working version (commit SHA): `abc1234567`
- SSH access to production server
- No database migration rollback needed

### Step-by-Step Procedure

**1. SSH to Production Server** (30 seconds)

```bash
# Connect to production server
ssh deploy@hr.example.com

# Navigate to deployment directory
cd /opt/sveltehr
```

**2. Identify Previous Working Version** (30 seconds)

```bash
# Check currently deployed version
docker inspect sveltehr-frontend-prod --format='{{.Config.Image}}'
# Output: registry.gitlab.com/username/sveltehr/frontend:sha-def7890abc (BROKEN)

# Check deployment history
ls -lt /opt/sveltehr/backups/ | head -5
# Find timestamp before bad deployment

# Or check GitHub commits
# Go to: https://github.com/your_org/sveltehr/commits/main
# Identify last known good commit SHA: abc1234567
```

**3. Update Environment Variables** (30 seconds)

```bash
# Backup current .env (just in case)
cp .env .env.rollback-backup-$(date +%Y%m%d_%H%M%S)

# Set IMAGE_TAG to previous working version
sed -i 's/IMAGE_TAG=.*/IMAGE_TAG=sha-abc1234567/' .env

# Verify change
grep IMAGE_TAG .env
# Should show: IMAGE_TAG=sha-abc1234567
```

**4. Pull Previous Images** (60 seconds)

```bash
# Pull previous working images from GitLab Container Registry
docker compose -f docker-compose.prod.yml pull

# Expected output:
# [+] Pulling 2/2
#  ✔ frontend Pulled
#  ✔ hr-graphql-rust Pulled
```

**5. Restart Services with Previous Version** (30 seconds)

```bash
# Stop current (broken) services
docker compose -f docker-compose.prod.yml down

# Start with previous (working) images
docker compose -f docker-compose.prod.yml up -d --no-build

# Expected output:
# [+] Running 5/5
#  ✔ Container sveltehr-postgres-prod       Running
#  ✔ Container sveltehr-redis-prod          Running
#  ✔ Container sveltehr-graphql-rust-prod   Started
#  ✔ Container sveltehr-frontend-prod       Started
#  ✔ Container sveltehr-caddy-prod          Started
```

**6. Verify Rollback Success** (30 seconds)

```bash
# Check all services are healthy
docker compose -f docker-compose.prod.yml ps

# Expected output (all should show "healthy"):
# NAME                         STATUS
# sveltehr-postgres-prod       Up (healthy)
# sveltehr-redis-prod          Up (healthy)
# sveltehr-graphql-rust-prod   Up (healthy)
# sveltehr-frontend-prod       Up (healthy)
# sveltehr-caddy-prod          Up (healthy)

# Test application health endpoints
curl -k https://localhost/health
# Should return: {"status":"healthy"}

# Check application is accessible
curl -I https://hr.example.com
# Should return: HTTP/2 200
```

**Total time: ~3 minutes**

### Quick Rollback Script

**Create**: `/opt/sveltehr/scripts/quick-rollback.sh`

```bash
#!/bin/bash
set -e

PREVIOUS_VERSION=$1

if [ -z "$PREVIOUS_VERSION" ]; then
    echo "Usage: ./quick-rollback.sh <commit-sha>"
    echo "Example: ./quick-rollback.sh abc1234567"
    exit 1
fi

echo "Rolling back to version: sha-$PREVIOUS_VERSION"

# Update .env
cp .env .env.rollback-backup-$(date +%Y%m%d_%H%M%S)
sed -i "s/IMAGE_TAG=.*/IMAGE_TAG=sha-$PREVIOUS_VERSION/" .env

# Pull and restart
cd /opt/sveltehr
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --no-build

# Verify
echo "Waiting 30 seconds for services to start..."
sleep 30

docker compose -f docker-compose.prod.yml ps

echo "Rollback complete! Verify application at https://hr.example.com"
```

**Usage**:
```bash
chmod +x /opt/sveltehr/scripts/quick-rollback.sh
./scripts/quick-rollback.sh abc1234567
```

## Type 2: Database Rollback Required

### Prerequisites

- Database backup from before bad deployment
- Previous working version (commit SHA): `abc1234567`
- SSH access to production server
- **CRITICAL**: Understand data loss implications

### Warning

⚠️ **DATABASE ROLLBACK CAN CAUSE DATA LOSS**

Restoring a database backup will **permanently delete** all data changes since the backup:
- User registrations
- Updated employee records
- New transactions
- Changed passwords
- Uploaded documents

**Only proceed if**:
- Data loss is acceptable (e.g., broken deployment was minutes ago)
- OR bad deployment corrupted data (restore is better than corrupt data)
- OR you have confirmed with business stakeholders

### Step-by-Step Procedure

**1. Enable Maintenance Mode** (30 seconds)

```bash
# SSH to production server
ssh deploy@hr.example.com
cd /opt/sveltehr

# Take Caddy offline to prevent user access
docker compose -f docker-compose.prod.yml stop caddy

# Optional: Show maintenance page
# (Requires pre-configured maintenance.html in Caddy)
```

**2. Stop Application Services** (30 seconds)

```bash
# Stop frontend and backend (keep database running)
docker compose -f docker-compose.prod.yml stop frontend hr-graphql-rust

# Verify database is still running
docker ps | grep postgres
# Should show: sveltehr-postgres-prod ... Up (healthy)
```

**3. Create Current Database Backup** (60 seconds)

```bash
# Backup current (broken) database state
# In case rollback fails and we need to restore forward
docker exec sveltehr-postgres-prod pg_dump -U postgres hr_system > \
  /var/backups/postgresql/pre_rollback_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup size (should be >0 bytes)
ls -lh /var/backups/postgresql/pre_rollback_backup_*.sql
```

**4. Identify and Restore Previous Backup** (120 seconds)

```bash
# List available backups
ls -lt /var/backups/postgresql/ | head -10

# Identify backup from before bad deployment
# Example: backup_20251028_143000.sql (from 2:30 PM, bad deploy was 3:00 PM)

# Drop current database (DESTRUCTIVE!)
docker exec -it sveltehr-postgres-prod psql -U postgres -c "DROP DATABASE hr_system;"

# Recreate database
docker exec -it sveltehr-postgres-prod psql -U postgres -c "CREATE DATABASE hr_system;"

# Restore from backup
cat /var/backups/postgresql/backup_20251028_143000.sql | \
  docker exec -i sveltehr-postgres-prod psql -U postgres -d hr_system

# Verify restore
docker exec sveltehr-postgres-prod psql -U postgres -d hr_system -c "\dt"
# Should show all tables
```

**5. Rollback Application Code** (90 seconds)

```bash
# Update IMAGE_TAG to previous working version
cp .env .env.rollback-backup-$(date +%Y%m%d_%H%M%S)
sed -i 's/IMAGE_TAG=.*/IMAGE_TAG=sha-abc1234567/' .env

# Pull previous images
docker compose -f docker-compose.prod.yml pull

# Start services with previous code
docker compose -f docker-compose.prod.yml up -d --no-build
```

**6. Verify Rollback Success** (60 seconds)

```bash
# Wait for health checks
sleep 30

# Check all services healthy
docker compose -f docker-compose.prod.yml ps

# Test database connection
docker exec sveltehr-graphql-rust-prod curl http://localhost:4000/health
# Should return: {"status":"healthy","database":"connected"}

# Test application
curl -k https://hr.example.com/health
# Should return: {"status":"healthy"}
```

**7. Re-enable Production Access** (30 seconds)

```bash
# Start Caddy to restore user access
docker compose -f docker-compose.prod.yml start caddy

# Verify HTTPS access
curl -I https://hr.example.com
# Should return: HTTP/2 200
```

**Total time: ~6-7 minutes**

### Database Rollback Script

**Create**: `/opt/sveltehr/scripts/database-rollback.sh`

```bash
#!/bin/bash
set -e

BACKUP_FILE=$1
PREVIOUS_VERSION=$2

if [ -z "$BACKUP_FILE" ] || [ -z "$PREVIOUS_VERSION" ]; then
    echo "Usage: ./database-rollback.sh <backup-file> <commit-sha>"
    echo "Example: ./database-rollback.sh /var/backups/postgresql/backup_20251028_143000.sql abc1234567"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will restore database from backup and lose all data since then!"
echo "Backup file: $BACKUP_FILE"
echo "Code version: sha-$PREVIOUS_VERSION"
read -p "Are you sure? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelled"
    exit 1
fi

# Stop Caddy (maintenance mode)
echo "Enabling maintenance mode..."
docker compose -f docker-compose.prod.yml stop caddy

# Stop app services
echo "Stopping application services..."
docker compose -f docker-compose.prod.yml stop frontend hr-graphql-rust

# Backup current state
echo "Backing up current database state..."
docker exec sveltehr-postgres-prod pg_dump -U postgres hr_system > \
  /var/backups/postgresql/pre_rollback_backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
echo "Restoring database from backup..."
docker exec -it sveltehr-postgres-prod psql -U postgres -c "DROP DATABASE hr_system;"
docker exec -it sveltehr-postgres-prod psql -U postgres -c "CREATE DATABASE hr_system;"
cat "$BACKUP_FILE" | docker exec -i sveltehr-postgres-prod psql -U postgres -d hr_system

# Rollback code
echo "Rolling back application code..."
cp .env .env.rollback-backup-$(date +%Y%m%d_%H%M%S)
sed -i "s/IMAGE_TAG=.*/IMAGE_TAG=sha-$PREVIOUS_VERSION/" .env
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --no-build

# Wait and verify
echo "Waiting 30 seconds for services to start..."
sleep 30
docker compose -f docker-compose.prod.yml ps

echo "✅ Rollback complete! Verify application at https://hr.example.com"
```

## Post-Rollback Actions

### 1. Document the Incident

**Create incident report** including:
- Timestamp of bad deployment
- Timestamp of rollback completion
- Root cause of issue
- Commit SHA of bad version
- Commit SHA of rolled-back version
- Data loss (if any)
- Users affected
- Total downtime duration

**Template**: `docs/incidents/YYYY-MM-DD-rollback-incident.md`

### 2. Notify Stakeholders

**Notify**:
- Team via Slack/email
- Management (if significant downtime)
- Users (if data loss or extended outage)

**Message template**:
```
Subject: Production Rollback Completed - Service Restored

We experienced an issue with deployment at [TIME] which required an
emergency rollback. The application has been restored to the previous
working version.

- Issue detected: [TIME]
- Rollback initiated: [TIME]
- Service restored: [TIME]
- Total downtime: [MINUTES] minutes
- Data loss: [YES/NO - if yes, describe]
- Root cause: [BRIEF DESCRIPTION]

The issue is under investigation. We will provide an update with
preventive measures within 24 hours.
```

### 3. Prevent Future CI/CD Deploys

**Stop automatic deployments** until issue is fixed:

```bash
# Option 1: Disable GitHub Actions workflow
# Go to GitHub → Actions → Deploy to Production → Disable workflow

# Option 2: Add protection rule
# Go to GitHub → Settings → Branches → main → Add rule
# Enable "Require manual deployment approval"

# Option 3: Pause CI/CD in .env
# Add: CI_CD_ENABLED=false
```

### 4. Investigate and Fix Root Cause

**Investigation checklist**:
- [ ] Review GitHub commit diff for bad deployment
- [ ] Check CI/CD logs for warnings
- [ ] Review test results (did tests pass?)
- [ ] Identify why issue wasn't caught in testing
- [ ] Determine if rollback was necessary (could we have fixed forward?)

**Fix and prevent**:
1. Fix the bug in development environment
2. Add tests to prevent regression
3. Test production build locally (see `local-testing.md`)
4. Create new deployment after review
5. Document lessons learned

### 5. Re-enable CI/CD

**Once issue is fixed**:
1. Merge fix to `main` branch
2. Re-enable GitHub Actions workflow
3. Monitor deployment closely
4. Have rollback procedure ready (just in case)

## Rollback Decision Tree

```
Critical issue detected
         |
         v
Is application completely down or critical feature broken?
         |
    YES  |  NO
         |          |
         v          v
Is database         Fix forward
changed?            (hotfix)
    |
YES |  NO
    |          |
    v          v
DATABASE    APPLICATION-ONLY
ROLLBACK    ROLLBACK
(Type 2)    (Type 1)
 ~7 min      ~3 min
```

## Common Rollback Scenarios

### Scenario 1: Bad Deployment Breaks Authentication

**Symptoms**:
- Users cannot log in
- "Authentication failed" errors
- JWT token validation errors

**Rollback type**: Application-only (Type 1)
**Time**: 3 minutes

**Procedure**:
```bash
# Quick rollback to previous version
./scripts/quick-rollback.sh abc1234567
```

### Scenario 2: Database Migration Corrupts Data

**Symptoms**:
- Application crashes on startup
- Database connection errors
- Data integrity violations

**Rollback type**: Database rollback (Type 2)
**Time**: 7 minutes

**Procedure**:
```bash
# Rollback database and code
./scripts/database-rollback.sh /var/backups/postgresql/backup_20251028_143000.sql abc1234567
```

### Scenario 3: Performance Regression (5x Slower)

**Symptoms**:
- Page load times >5 seconds (was <1 second)
- API response times >2 seconds (was <200ms)
- Database query timeouts

**Rollback type**: Application-only (Type 1)
**Time**: 3 minutes

**Alternative**: If performance degradation is <2x, consider fix-forward instead

### Scenario 4: Security Vulnerability Introduced

**Symptoms**:
- Security scan detects critical CVE
- Sensitive data exposed
- Authentication bypass possible

**Rollback type**: Application-only (Type 1) - IMMEDIATE
**Time**: 3 minutes (no delay, security critical)

**Additional actions**:
1. Rollback immediately (don't wait for approval)
2. Notify security team
3. Check logs for exploitation attempts
4. Rotate secrets if compromised

## Preventing the Need for Rollbacks

### 1. Comprehensive Testing

- ✅ Run full test suite before deployment (`npm run test`)
- ✅ Test production builds locally (`docs/deployment/local-testing.md`)
- ✅ Perform smoke tests after deployment
- ✅ Use staging environment for validation

### 2. Gradual Rollout

**Feature flags**:
- Deploy code with new features disabled
- Enable features gradually for subset of users
- Monitor metrics before full rollout

**Blue-green deployment** (future enhancement):
- Deploy to secondary environment
- Test before switching traffic
- Instant rollback by switching back

### 3. Automated Monitoring

- ✅ Set up health check alerts
- ✅ Monitor error rates after deployment
- ✅ Track performance metrics (response times, CPU, memory)
- ✅ Alert on anomalies within 1 minute of deployment

### 4. Deployment Windows

**Avoid deployments during**:
- Peak business hours
- Friday afternoons / weekends
- Holidays
- When key personnel are unavailable

**Best deployment times**:
- Tuesday-Thursday mornings
- Low-traffic periods
- When full team is available for monitoring

## Emergency Contacts

**On-Call Engineer**: [PHONE NUMBER]
**Technical Lead**: [PHONE NUMBER]
**DevOps/SRE**: [PHONE NUMBER]

**Escalation Path**:
1. On-call engineer (immediate)
2. Technical lead (if on-call unavailable)
3. CTO/VP Engineering (if critical business impact)

## Additional Resources

- **Container Registry**: `docs/deployment/container-registry.md`
- **Local Production Testing**: `docs/deployment/local-testing.md`
- **GitHub Secrets Setup**: `docs/deployment/github-secrets.md`
- **Monitoring Guide**: `docs/deployment/monitoring.md`
- **Disaster Recovery**: `docs/deployment/disaster-recovery.md` (to be created)

## Rollback Checklist Template

**Print and keep near on-call workstation**:

```
[ ] Critical issue confirmed (application down or critical feature broken)
[ ] Team notified (Slack, incident channel)
[ ] SSH access to production server verified
[ ] Previous working version identified (commit SHA: _________)
[ ] Database backup identified (if needed): _______________
[ ] Rollback script ready: ./scripts/quick-rollback.sh OR ./scripts/database-rollback.sh

ROLLBACK STEPS:
[ ] Initiate rollback procedure (Type 1 or Type 2)
[ ] Monitor rollback progress
[ ] Verify all services healthy
[ ] Test application accessibility
[ ] Notify stakeholders of completion
[ ] Document incident
[ ] Disable automatic deployments
[ ] Schedule root cause investigation

ESTIMATED COMPLETION TIME:
- Application-only: 3 minutes
- With database: 7 minutes

ACTUAL COMPLETION TIME: _______ minutes
```
