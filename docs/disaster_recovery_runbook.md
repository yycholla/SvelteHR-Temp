# SvelteHR Testing Framework - Disaster Recovery Runbook

## Executive Summary

This runbook provides comprehensive disaster recovery procedures for the SvelteHR Testing Framework database with specific focus on operational excellence and reliability. It includes automated and manual recovery steps with defined RTO/RPO targets.

### Recovery Objectives

- **RTO (Recovery Time Objective):** 4 hours maximum
- **RPO (Recovery Point Objective):** 1 hour maximum data loss
- **Availability Target:** 99.9% uptime
- **Data Integrity:** 100% recovery validation required

---

## 🚨 Emergency Contact Information

### Primary Contacts

- **Database Administrator:** [Your Contact]
- **System Administrator:** [Your Contact]
- **Application Owner:** [Your Contact]

### Escalation Chain

1. **Level 1:** On-call DBA (Response: 15 minutes)
2. **Level 2:** Database Team Lead (Response: 30 minutes)
3. **Level 3:** IT Director (Response: 1 hour)

### External Vendors

- **Cloud Provider Support:** [Contact Information]
- **Database Vendor Support:** [Contact Information]

---

## 📋 Pre-Disaster Checklist

### Daily Verification (Automated)

- [ ] Backup completion verification
- [ ] Backup integrity testing
- [ ] Connection pool health check
- [ ] RLS policy validation
- [ ] Performance metric collection
- [ ] Replication lag monitoring

### Weekly Verification (Manual)

- [ ] Disaster recovery test execution
- [ ] Recovery procedure validation
- [ ] Documentation updates
- [ ] Contact information verification
- [ ] Backup restoration testing

---

## 🔥 Disaster Scenarios & Response

### Scenario 1: Complete Database Server Failure

**Symptoms:**

- Database connection failures
- Application 500 errors
- No response from database server
- Hardware failure alerts

**Immediate Response (0-15 minutes):**

1. **Confirm the Disaster**

   ```bash
   # Test database connectivity
   ./scripts/database_operations.sh health-check

   # Check server status
   ping $DB_HOST
   telnet $DB_HOST $DB_PORT
   ```

2. **Activate Disaster Recovery**

   ```bash
   # Initiate automated disaster recovery
   ./scripts/database_operations.sh disaster-recovery latest
   ```

3. **Notify Stakeholders**
   - Send disaster notification to emergency contacts
   - Update status page
   - Activate incident management process

**Recovery Steps (15-60 minutes):**

4. **Prepare Recovery Environment**

   ```bash
   # Start recovery database server
   docker-compose -f docker-compose.recovery.yml up -d postgres

   # Verify recovery environment
   export DB_HOST=recovery-db-host
   ./scripts/database_operations.sh health-check
   ```

5. **Execute Database Recovery**

   ```bash
   # Find latest full backup
   latest_backup=$(find backups/database -name "*full_backup*.sql*" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)

   # Restore database
   ./scripts/database_operations.sh restore "$latest_backup" svelteHR_recovery

   # Validate recovery
   ./scripts/database_operations.sh health-check
   ```

6. **Application Cutover**

   ```bash
   # Update environment configuration
   sed -i "s/DB_HOST=.*/DB_HOST=recovery-db-host/" .env
   sed -i "s/DB_NAME=.*/DB_NAME=svelteHR_recovery/" .env

   # Restart application services
   docker-compose restart svelteHR-app

   # Verify application health
   curl -f http://localhost:5173/health
   ```

**Expected RTO:** 1-2 hours
**Expected RPO:** 1-6 hours (depending on backup frequency)

### Scenario 2: Database Corruption

**Symptoms:**

- Data inconsistency errors
- Checksum validation failures
- PostgreSQL corruption errors
- Unusual query behaviors

**Immediate Response (0-30 minutes):**

1. **Assess Corruption Extent**

   ```bash
   # Check database integrity
   PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
   SELECT datname, checksum_failures, checksum_last_failure
   FROM pg_stat_database
   WHERE datname = '$DB_NAME';"

   # Validate critical tables
   ./scripts/database_operations.sh monitor
   ```

2. **Isolate Affected Systems**

   ```bash
   # Put application in maintenance mode
   docker-compose stop svelteHR-app

   # Prevent further corruption
   ./scripts/database_operations.sh terminate-connections
   ```

**Recovery Steps (30-120 minutes):**

3. **Point-in-Time Recovery**

   ```bash
   # Identify corruption timeline
   corruption_time="2025-09-24 14:30:00"

   # Create recovery database
   createdb -h recovery-host -U postgres svelteHR_pit_recovery

   # Restore to point before corruption
   pg_restore -h recovery-host -U postgres -d svelteHR_pit_recovery \
     --clean --if-exists \
     "$latest_clean_backup"
   ```

4. **Data Validation and Repair**

   ```bash
   # Run comprehensive validation
   ./scripts/database_operations.sh health-check

   # Validate testing framework data
   PGPASSWORD="$DB_PASSWORD" psql -h recovery-host -U postgres -d svelteHR_pit_recovery -c "
   SELECT
     'test_scenarios' as table_name,
     COUNT(*) as record_count,
     MIN(created_at) as earliest_record,
     MAX(created_at) as latest_record
   FROM hr_public.test_scenarios
   UNION ALL
   SELECT
     'validation_results' as table_name,
     COUNT(*) as record_count,
     MIN(start_time) as earliest_record,
     MAX(end_time) as latest_record
   FROM hr_public.validation_results;
   "
   ```

**Expected RTO:** 2-4 hours
**Expected RPO:** 1-4 hours (depending on corruption discovery time)

### Scenario 3: Ransomware/Security Incident

**Symptoms:**

- Encrypted database files
- Unauthorized access alerts
- Suspicious database activities
- Security tool alerts

**Immediate Response (0-15 minutes):**

1. **Incident Containment**

   ```bash
   # Immediately isolate database server
   # (Network-level isolation - contact network team)

   # Terminate all database connections
   ./scripts/database_operations.sh terminate-connections

   # Take server offline
   docker-compose stop postgres pgbouncer
   ```

2. **Security Assessment**
   ```bash
   # Check for data encryption/damage
   # Verify backup integrity
   # Contact security team for forensic analysis
   ```

**Recovery Steps (15-240 minutes):**

3. **Clean Environment Preparation**

   ```bash
   # Provision new, clean database server
   # Implement enhanced security measures
   # Update all credentials and certificates
   ```

4. **Secure Recovery Process**

   ```bash
   # Use oldest known-clean backup
   clean_backup=$(find backups/database -name "*full_backup*" -type f -mtime +7 | head -1)

   # Restore to isolated environment first
   ./scripts/database_operations.sh restore "$clean_backup" svelteHR_secure_recovery

   # Full security validation before going live
   ```

**Expected RTO:** 4-8 hours (includes security validation)
**Expected RPO:** 24-48 hours (using older clean backups)

---

## 🔧 Manual Recovery Procedures

### Manual Backup Creation

```bash
#!/bin/bash
# Manual backup creation when automated systems fail

# Set variables
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/database/manual_backup_${BACKUP_DATE}.sql.gz"

# Create backup
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --verbose \
  --format=custom \
  --no-owner \
  --no-privileges \
  --schema=hr_public \
  | gzip > "$BACKUP_FILE"

# Verify backup
if [[ -f "$BACKUP_FILE" && -s "$BACKUP_FILE" ]]; then
  echo "Manual backup created successfully: $BACKUP_FILE"
  gzip -t "$BACKUP_FILE" && echo "Backup compression verified"
else
  echo "ERROR: Manual backup failed"
  exit 1
fi
```

### Manual Database Restoration

```bash
#!/bin/bash
# Manual restoration procedure

BACKUP_FILE="$1"
TARGET_DB="${2:-svelteHR_manual_recovery}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will overwrite database $TARGET_DB"
read -p "Continue? (yes/no): " confirm

if [[ "$confirm" == "yes" ]]; then
  # Create target database
  PGPASSWORD="$DB_PASSWORD" createdb \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    "$TARGET_DB"

  # Restore from backup
  if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" pg_restore \
      -h "$DB_HOST" \
      -p "$DB_PORT" \
      -U "$DB_USER" \
      -d "$TARGET_DB" \
      --verbose \
      --clean \
      --if-exists
  else
    PGPASSWORD="$DB_PASSWORD" pg_restore \
      -h "$DB_HOST" \
      -p "$DB_PORT" \
      -U "$DB_USER" \
      -d "$TARGET_DB" \
      --verbose \
      --clean \
      --if-exists \
      "$BACKUP_FILE"
  fi

  echo "Manual restoration completed: $TARGET_DB"
fi
```

### Connection Pool Recovery

```bash
#!/bin/bash
# Manual connection pool recovery

# Stop PgBouncer
docker-compose stop pgbouncer

# Clear connection pool configuration
rm -f /tmp/pgbouncer_*

# Restart with clean configuration
./scripts/database_operations.sh setup-pooling

# Start PgBouncer
docker-compose up -d pgbouncer

# Verify connection pooling
echo "Testing connection through pool:"
PGPASSWORD="$DB_PASSWORD" psql \
  -h localhost \
  -p 6432 \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -c "SELECT current_database(), current_user, inet_server_addr();"
```

---

## ⚡ Automated Recovery Steps

### Automated Failover Process

The automated recovery system monitors:

- Database connectivity (every 30 seconds)
- Replication lag (if applicable)
- Response time thresholds
- Error rate monitoring

**Trigger Conditions:**

- 3 consecutive connection failures
- Response time > 30 seconds for 5 minutes
- Error rate > 50% for 2 minutes

**Automated Actions:**

1. Health check validation
2. Backup integrity verification
3. Recovery environment preparation
4. Database restoration
5. Application configuration update
6. Health validation
7. Stakeholder notification

### Automated Backup Verification

```bash
#!/bin/bash
# Automated backup verification script (runs daily)

LATEST_BACKUP=$(find backups/database -name "*full_backup*.sql*" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)

if [[ -z "$LATEST_BACKUP" ]]; then
  echo "ALERT: No backup found" | mail -s "Backup Alert" admin@company.com
  exit 1
fi

# Test backup integrity
if [[ "$LATEST_BACKUP" == *.gz ]]; then
  if ! gzip -t "$LATEST_BACKUP"; then
    echo "ALERT: Backup corruption detected: $LATEST_BACKUP" | mail -s "Backup Corruption" admin@company.com
    exit 1
  fi
fi

# Test restoration (to temporary database)
TEST_DB="backup_test_$(date +%s)"
./scripts/database_operations.sh restore "$LATEST_BACKUP" "$TEST_DB"

if [[ $? -eq 0 ]]; then
  echo "SUCCESS: Backup verification passed: $LATEST_BACKUP"
  # Cleanup test database
  PGPASSWORD="$DB_PASSWORD" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$TEST_DB"
else
  echo "ALERT: Backup restoration test failed: $LATEST_BACKUP" | mail -s "Backup Test Failed" admin@company.com
  exit 1
fi
```

---

## 📊 Recovery Validation Checklist

### Database Recovery Validation

After any recovery procedure, complete this checklist:

#### Connectivity Tests

- [ ] Database server responds to ping
- [ ] PostgreSQL port is accessible
- [ ] Authentication works correctly
- [ ] SSL connections function properly

#### Data Integrity Checks

- [ ] All essential tables present
- [ ] Row counts match expectations
- [ ] Foreign key constraints valid
- [ ] Index integrity verified

#### Testing Framework Validation

```bash
# Validate testing framework tables
./scripts/database_operations.sh health-check

# Check record counts
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
  'test_scenarios' as table_name, COUNT(*) as records
FROM hr_public.test_scenarios
UNION ALL
SELECT
  'graphql_operations' as table_name, COUNT(*) as records
FROM hr_public.graphql_operations
UNION ALL
SELECT
  'navigation_flows' as table_name, COUNT(*) as records
FROM hr_public.navigation_flows
UNION ALL
SELECT
  'performance_metrics' as table_name, COUNT(*) as records
FROM hr_public.performance_metrics
UNION ALL
SELECT
  'collaboration_sessions' as table_name, COUNT(*) as records
FROM hr_public.collaboration_sessions
UNION ALL
SELECT
  'validation_results' as table_name, COUNT(*) as records
FROM hr_public.validation_results;
"
```

#### Security Validation

- [ ] RLS policies active and correct
- [ ] User roles and permissions intact
- [ ] Database users can authenticate
- [ ] Unauthorized access prevented

#### Application Integration

- [ ] Application connects successfully
- [ ] User authentication works
- [ ] Critical business functions operational
- [ ] Performance within acceptable ranges

#### Performance Validation

```bash
# Test query performance
time PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT COUNT(*) FROM hr_public.test_scenarios ts
JOIN hr_public.validation_results vr ON ts.id = vr.test_scenario_id
WHERE ts.status = 'active' AND vr.result = 'pass';
"

# Check connection pooling
PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 6432 -U "$DB_USER" -d "$DB_NAME" -c "SHOW pool_mode;"
```

---

## 📈 Post-Recovery Actions

### Immediate Actions (0-2 hours)

1. **System Monitoring**
   - Enable enhanced monitoring
   - Check all alerts and thresholds
   - Monitor application error rates
   - Validate user access patterns

2. **Communication**
   - Notify stakeholders of recovery completion
   - Update status page
   - Document incident timeline
   - Schedule post-mortem meeting

3. **Performance Tuning**

   ```bash
   # Run maintenance after recovery
   ./scripts/database_operations.sh maintenance

   # Update database statistics
   PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE;"
   ```

### Short-term Actions (2-24 hours)

1. **Backup Verification**
   - Create new full backup
   - Test backup restoration
   - Verify backup schedule resumption

2. **Security Review**
   - Review access logs
   - Validate security configurations
   - Update credentials if needed

3. **Documentation Updates**
   - Update recovery procedures based on lessons learned
   - Document any configuration changes
   - Update contact information if needed

### Long-term Actions (1-7 days)

1. **Root Cause Analysis**
   - Investigate disaster cause
   - Implement preventive measures
   - Update monitoring and alerting

2. **Disaster Recovery Testing**
   - Schedule comprehensive DR test
   - Update and refine procedures
   - Train team on any new processes

3. **Infrastructure Improvements**
   - Evaluate infrastructure resilience
   - Consider additional redundancy
   - Implement automation improvements

---

## 🔍 Monitoring and Alerting

### Critical Alerts

**Database Unavailable**

- Trigger: 3 consecutive connection failures
- Response: Immediate (< 5 minutes)
- Action: Automated failover initiation

**Backup Failure**

- Trigger: Backup job failure or corruption
- Response: Within 30 minutes
- Action: Manual backup creation and investigation

**Replication Lag**

- Trigger: Lag > 60 seconds
- Response: Within 15 minutes
- Action: Replication health check and potential failover

**Performance Degradation**

- Trigger: Query time > 5 seconds for critical queries
- Response: Within 30 minutes
- Action: Performance analysis and optimization

### Monitoring Commands

```bash
# Real-time monitoring dashboard
watch -n 5 './scripts/database_operations.sh monitor'

# Connection pool status
docker exec pgbouncer psql -p 6432 -U pgbouncer -d pgbouncer -c "SHOW pools;"

# Database size growth tracking
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'hr_public'
ORDER BY size_bytes DESC;
"
```

---

## 📞 Emergency Procedures

### 3 AM Emergency Response

When woken up at 3 AM by alerts:

1. **Don't Panic** - Follow the runbook
2. **Assess Quickly** - Use health-check command
3. **Get Help** - Contact secondary on-call if needed
4. **Document Everything** - Log all actions taken
5. **Communicate** - Update stakeholders appropriately

### Quick Reference Commands

```bash
# Emergency status check
./scripts/database_operations.sh health-check

# Emergency backup
./scripts/database_operations.sh backup full

# Emergency restore
./scripts/database_operations.sh disaster-recovery latest

# Emergency user creation (if locked out)
./scripts/user_management.sh create-user emergency_admin admin@company.com hr_super_admin

# Connection pool restart
docker-compose restart pgbouncer

# Application restart
docker-compose restart svelteHR-app
```

---

## 🧪 Testing and Validation

### Monthly DR Test Schedule

**Week 1:** Backup restoration test
**Week 2:** Connection pool failover test
**Week 3:** Database corruption simulation
**Week 4:** Full disaster recovery simulation

### Test Execution

```bash
# Schedule automated DR test
./scripts/database_operations.sh disaster-recovery latest dr_test_$(date +%Y%m%d)

# Validate DR test results
./scripts/database_operations.sh health-check

# Generate test report
echo "DR Test Report - $(date)" > dr_test_report.txt
echo "=========================" >> dr_test_report.txt
./scripts/database_operations.sh monitor >> dr_test_report.txt
```

---

## 📋 Change Management

### Runbook Updates

This runbook should be updated:

- After any disaster recovery event
- When infrastructure changes
- Quarterly for accuracy verification
- When contact information changes

### Version Control

- All changes must be reviewed
- Test procedures after updates
- Maintain change history
- Archive old versions

---

## 🔐 Security Considerations

### Access Control

- Limit runbook access to authorized personnel
- Use role-based access for all procedures
- Audit all emergency access activities
- Rotate credentials regularly

### Encryption

- All backups must be encrypted at rest
- Use encrypted connections for all database access
- Protect recovery credentials
- Secure communication channels for incident response

---

_Last Updated: 2025-09-24_
_Version: 1.0_
_Next Review: 2025-12-24_
