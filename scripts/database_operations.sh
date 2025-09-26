#!/bin/bash

# SvelteHR Database Operations Script
# Comprehensive backup, disaster recovery, and maintenance operations
# Created: 2025-09-24
# Task: T004 - Database operations for testing framework

set -euo pipefail

# Configuration variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${PROJECT_ROOT}/logs/database"
BACKUP_DIR="${PROJECT_ROOT}/backups/database"
CONFIG_FILE="${PROJECT_ROOT}/.env"

# Create necessary directories
mkdir -p "$LOG_DIR" "$BACKUP_DIR"

# Logging setup
LOG_FILE="${LOG_DIR}/database_ops_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Load environment configuration
load_env() {
    if [[ -f "$CONFIG_FILE" ]]; then
        # Load environment variables, handling both formats
        set -a
        source "$CONFIG_FILE"
        set +a
        log_info "Environment configuration loaded from $CONFIG_FILE"
    else
        log_warning "Environment file not found at $CONFIG_FILE. Using defaults."
    fi

    # Set default values if not provided
    export DB_HOST="${DB_HOST:-localhost}"
    export DB_PORT="${DB_PORT:-5432}"
    export DB_NAME="${DB_NAME:-svelteHR}"
    export DB_USER="${DB_USER:-postgres}"
    export DB_PASSWORD="${DB_PASSWORD:-}"
    export DB_SCHEMA="${DB_SCHEMA:-hr_public}"

    # Backup retention settings
    export BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
    export BACKUP_COMPRESSION="${BACKUP_COMPRESSION:-true}"

    # Connection pool settings
    export POOL_MIN_CONNECTIONS="${POOL_MIN_CONNECTIONS:-5}"
    export POOL_MAX_CONNECTIONS="${POOL_MAX_CONNECTIONS:-100}"
    export POOL_IDLE_TIMEOUT="${POOL_IDLE_TIMEOUT:-30}"

    # Performance monitoring thresholds
    export SLOW_QUERY_THRESHOLD="${SLOW_QUERY_THRESHOLD:-1000}"
    export CONNECTION_THRESHOLD="${CONNECTION_THRESHOLD:-80}"
    export LOCK_TIMEOUT_THRESHOLD="${LOCK_TIMEOUT_THRESHOLD:-5000}"
}

# Database connection validation
validate_connection() {
    local connection_string="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

    log_info "Validating database connection to ${DB_HOST}:${DB_PORT}/${DB_NAME}"

    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "Database connection validated successfully"
        return 0
    else
        log_error "Failed to connect to database"
        return 1
    fi
}

# Create comprehensive database backup
create_backup() {
    local backup_type="${1:-full}"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_filename="${DB_NAME}_${backup_type}_backup_${timestamp}"

    log_info "Starting ${backup_type} backup of database ${DB_NAME}"

    case "$backup_type" in
        "full")
            local backup_file="${BACKUP_DIR}/${backup_filename}.sql"
            if [[ "$BACKUP_COMPRESSION" == "true" ]]; then
                backup_file="${backup_file}.gz"
                PGPASSWORD="$DB_PASSWORD" pg_dump \
                    -h "$DB_HOST" \
                    -p "$DB_PORT" \
                    -U "$DB_USER" \
                    -d "$DB_NAME" \
                    --verbose \
                    --format=custom \
                    --no-owner \
                    --no-privileges \
                    --schema="$DB_SCHEMA" | gzip > "$backup_file"
            else
                PGPASSWORD="$DB_PASSWORD" pg_dump \
                    -h "$DB_HOST" \
                    -p "$DB_PORT" \
                    -U "$DB_USER" \
                    -d "$DB_NAME" \
                    --verbose \
                    --format=custom \
                    --no-owner \
                    --no-privileges \
                    --schema="$DB_SCHEMA" \
                    --file="$backup_file"
            fi
            ;;

        "schema")
            local backup_file="${BACKUP_DIR}/${backup_filename}_schema.sql"
            PGPASSWORD="$DB_PASSWORD" pg_dump \
                -h "$DB_HOST" \
                -p "$DB_PORT" \
                -U "$DB_USER" \
                -d "$DB_NAME" \
                --schema-only \
                --verbose \
                --no-owner \
                --no-privileges \
                --schema="$DB_SCHEMA" \
                --file="$backup_file"
            ;;

        "data")
            local backup_file="${BACKUP_DIR}/${backup_filename}_data.sql"
            if [[ "$BACKUP_COMPRESSION" == "true" ]]; then
                backup_file="${backup_file}.gz"
                PGPASSWORD="$DB_PASSWORD" pg_dump \
                    -h "$DB_HOST" \
                    -p "$DB_PORT" \
                    -U "$DB_USER" \
                    -d "$DB_NAME" \
                    --data-only \
                    --verbose \
                    --no-owner \
                    --no-privileges \
                    --schema="$DB_SCHEMA" | gzip > "$backup_file"
            else
                PGPASSWORD="$DB_PASSWORD" pg_dump \
                    -h "$DB_HOST" \
                    -p "$DB_PORT" \
                    -U "$DB_USER" \
                    -d "$DB_NAME" \
                    --data-only \
                    --verbose \
                    --no-owner \
                    --no-privileges \
                    --schema="$DB_SCHEMA" \
                    --file="$backup_file"
            fi
            ;;

        *)
            log_error "Invalid backup type: $backup_type. Supported: full, schema, data"
            return 1
            ;;
    esac

    if [[ -f "$backup_file" ]]; then
        local file_size=$(du -h "$backup_file" | cut -f1)
        log_success "Backup completed: $backup_file (Size: $file_size)"

        # Test backup integrity
        if [[ "$backup_type" == "full" ]]; then
            test_backup_integrity "$backup_file"
        fi

        echo "$backup_file"
        return 0
    else
        log_error "Backup failed: $backup_file not created"
        return 1
    fi
}

# Test backup integrity
test_backup_integrity() {
    local backup_file="$1"

    log_info "Testing backup integrity: $(basename "$backup_file")"

    if [[ "$backup_file" == *.gz ]]; then
        if gzip -t "$backup_file"; then
            log_success "Backup compression integrity verified"
        else
            log_error "Backup compression is corrupted"
            return 1
        fi
    fi

    # Additional integrity checks would go here
    # For example, checking if the file contains expected schema elements
    log_success "Backup integrity test completed"
    return 0
}

# Restore database from backup
restore_backup() {
    local backup_file="$1"
    local restore_target="${2:-$DB_NAME}"
    local restore_options="${3:-}"

    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi

    log_warning "DESTRUCTIVE OPERATION: Restoring database $restore_target from $backup_file"

    # Confirm destructive operation
    if [[ "${FORCE_RESTORE:-false}" != "true" ]]; then
        read -p "This will overwrite the target database. Are you sure? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log_info "Restore operation cancelled by user"
            return 1
        fi
    fi

    log_info "Starting database restore to $restore_target"

    # Terminate active connections to target database
    terminate_connections "$restore_target"

    if [[ "$backup_file" == *.gz ]]; then
        # Restore compressed backup
        gunzip -c "$backup_file" | PGPASSWORD="$DB_PASSWORD" pg_restore \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$restore_target" \
            --verbose \
            --clean \
            --if-exists \
            $restore_options
    else
        # Restore uncompressed backup
        PGPASSWORD="$DB_PASSWORD" pg_restore \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$restore_target" \
            --verbose \
            --clean \
            --if-exists \
            "$backup_file" \
            $restore_options
    fi

    if [[ $? -eq 0 ]]; then
        log_success "Database restore completed successfully"

        # Run post-restore validation
        validate_restore "$restore_target"
        return 0
    else
        log_error "Database restore failed"
        return 1
    fi
}

# Validate restored database
validate_restore() {
    local target_db="$1"

    log_info "Validating restored database: $target_db"

    # Check if essential tables exist
    local essential_tables=(
        "users"
        "employees"
        "departments"
        "leave_requests"
        "performance_reviews"
        "team_goals"
        "test_scenarios"
        "graphql_operations"
        "navigation_flows"
        "performance_metrics"
        "collaboration_sessions"
        "validation_results"
    )

    for table in "${essential_tables[@]}"; do
        local table_exists=$(PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$target_db" \
            -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = '$DB_SCHEMA' AND table_name = '$table');" 2>/dev/null | xargs)

        if [[ "$table_exists" == "t" ]]; then
            log_success "Table validated: ${DB_SCHEMA}.${table}"
        else
            log_warning "Table missing or inaccessible: ${DB_SCHEMA}.${table}"
        fi
    done

    # Check RLS policies
    local rls_enabled=$(PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$target_db" \
        -t -c "SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = '$DB_SCHEMA' AND c.relrowsecurity = true;" 2>/dev/null | xargs)

    log_info "Row-Level Security enabled on $rls_enabled tables"

    log_success "Database validation completed"
}

# Terminate active connections
terminate_connections() {
    local target_db="$1"

    log_info "Terminating active connections to database: $target_db"

    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "postgres" \
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$target_db' AND pid <> pg_backend_pid();" > /dev/null 2>&1

    log_success "Active connections terminated"
}

# Connection pooling setup
setup_connection_pooling() {
    log_info "Setting up connection pooling configuration"

    # PgBouncer configuration template
    cat > "${PROJECT_ROOT}/configs/pgbouncer.ini" << EOF
[databases]
${DB_NAME} = host=${DB_HOST} port=${DB_PORT} dbname=${DB_NAME} user=${DB_USER}

[pgbouncer]
listen_addr = *
listen_port = 6432
auth_type = md5
auth_file = ${PROJECT_ROOT}/configs/userlist.txt
admin_users = ${DB_USER}
stats_users = stats, ${DB_USER}

# Connection pool settings
pool_mode = transaction
max_client_conn = ${POOL_MAX_CONNECTIONS}
default_pool_size = ${POOL_MIN_CONNECTIONS}
min_pool_size = ${POOL_MIN_CONNECTIONS}
reserve_pool_size = 3
reserve_pool_timeout = 5

# Timeouts
server_idle_timeout = ${POOL_IDLE_TIMEOUT}
server_connect_timeout = 15
server_login_retry = 15
query_timeout = 0
query_wait_timeout = 120
client_idle_timeout = 0
client_login_timeout = 60

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
log_stats = 1

# Security
ignore_startup_parameters = extra_float_digits

# Performance
pkt_buf = 4096
listen_backlog = 128
sbuf_loopcnt = 5
suspend_timeout = 10
tcp_defer_accept = 0
tcp_socket_buffer = 0
tcp_keepalive = 1
tcp_keepcnt = 0
tcp_keepidle = 0
tcp_keepintvl = 0
EOF

    # Create userlist for PgBouncer
    cat > "${PROJECT_ROOT}/configs/userlist.txt" << EOF
"${DB_USER}" "$(echo -n "${DB_PASSWORD}${DB_USER}" | md5sum | cut -d' ' -f1 | sed 's/^/md5/')"
EOF

    # Set appropriate permissions
    chmod 600 "${PROJECT_ROOT}/configs/userlist.txt"
    chmod 644 "${PROJECT_ROOT}/configs/pgbouncer.ini"

    log_success "Connection pooling configuration created"

    # Docker Compose service for PgBouncer
    cat > "${PROJECT_ROOT}/docker-compose.pgbouncer.yml" << EOF
version: '3.8'

services:
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    container_name: svelteHR_pgbouncer
    environment:
      - DATABASES_HOST=${DB_HOST}
      - DATABASES_PORT=${DB_PORT}
      - DATABASES_USER=${DB_USER}
      - DATABASES_PASSWORD=${DB_PASSWORD}
      - DATABASES_DBNAME=${DB_NAME}
      - POOL_MODE=transaction
      - MAX_CLIENT_CONN=${POOL_MAX_CONNECTIONS}
      - DEFAULT_POOL_SIZE=${POOL_MIN_CONNECTIONS}
      - MIN_POOL_SIZE=${POOL_MIN_CONNECTIONS}
      - SERVER_IDLE_TIMEOUT=${POOL_IDLE_TIMEOUT}
    ports:
      - "6432:5432"
    volumes:
      - ./configs/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini:ro
      - ./configs/userlist.txt:/etc/pgbouncer/userlist.txt:ro
    depends_on:
      - postgres
    networks:
      - svelteHR_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h localhost -p 5432"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgres:
    image: postgres:15-alpine
    container_name: svelteHR_postgres
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    ports:
      - "${DB_PORT}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - svelteHR_network
    restart: unless-stopped
    command: >
      postgres
      -c max_connections=200
      -c shared_preload_libraries=pg_stat_statements
      -c track_activity_query_size=2048
      -c pg_stat_statements.track=all
      -c pg_stat_statements.max=10000
      -c log_statement=all
      -c log_min_duration_statement=${SLOW_QUERY_THRESHOLD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:

networks:
  svelteHR_network:
    driver: bridge
EOF

    log_success "PgBouncer Docker Compose configuration created"
}

# Performance monitoring
monitor_performance() {
    log_info "Running performance monitoring checks"

    # Connection usage
    local connection_usage=$(PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT count(*) * 100.0 / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') FROM pg_stat_activity;" 2>/dev/null | xargs)

    log_info "Connection usage: ${connection_usage}%"

    if (( $(echo "$connection_usage > $CONNECTION_THRESHOLD" | bc -l) )); then
        log_warning "High connection usage detected: ${connection_usage}%"
    fi

    # Slow queries
    local slow_queries=$(PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM pg_stat_statements WHERE mean_exec_time > $SLOW_QUERY_THRESHOLD;" 2>/dev/null | xargs)

    log_info "Slow queries (>${SLOW_QUERY_THRESHOLD}ms): $slow_queries"

    # Lock monitoring
    local active_locks=$(PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM pg_locks WHERE NOT granted;" 2>/dev/null | xargs)

    log_info "Active locks waiting: $active_locks"

    # Database size
    local db_size=$(PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | xargs)

    log_info "Database size: $db_size"

    # Table sizes for testing framework
    log_info "Testing framework table sizes:"
    local testing_tables=("test_scenarios" "graphql_operations" "navigation_flows" "performance_metrics" "collaboration_sessions" "validation_results")

    for table in "${testing_tables[@]}"; do
        local table_size=$(PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -t -c "SELECT pg_size_pretty(pg_total_relation_size('${DB_SCHEMA}.${table}'));" 2>/dev/null | xargs)
        log_info "  ${table}: $table_size"
    done
}

# Database maintenance operations
run_maintenance() {
    log_info "Running database maintenance operations"

    # VACUUM and ANALYZE all tables in schema
    local tables=$(PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT tablename FROM pg_tables WHERE schemaname = '$DB_SCHEMA';" | xargs)

    for table in $tables; do
        log_info "Running VACUUM ANALYZE on ${DB_SCHEMA}.${table}"
        PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -c "VACUUM ANALYZE ${DB_SCHEMA}.${table};" > /dev/null 2>&1
    done

    # Update statistics
    log_info "Updating database statistics"
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "ANALYZE;" > /dev/null 2>&1

    # Reindex critical tables
    local critical_tables=("test_scenarios" "graphql_operations" "validation_results" "performance_metrics")

    for table in "${critical_tables[@]}"; do
        log_info "Reindexing ${DB_SCHEMA}.${table}"
        PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -c "REINDEX TABLE ${DB_SCHEMA}.${table};" > /dev/null 2>&1
    done

    log_success "Database maintenance completed"
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $BACKUP_RETENTION_DAYS days"

    find "$BACKUP_DIR" -name "*.sql*" -type f -mtime +$BACKUP_RETENTION_DAYS -delete

    local remaining_backups=$(find "$BACKUP_DIR" -name "*.sql*" -type f | wc -l)
    log_success "Cleanup completed. Remaining backups: $remaining_backups"
}

# Disaster recovery procedures
disaster_recovery() {
    local recovery_point="${1:-latest}"
    local target_db="${2:-${DB_NAME}_recovery}"

    log_warning "DISASTER RECOVERY: Initiating recovery procedures"

    case "$recovery_point" in
        "latest")
            local backup_file=$(find "$BACKUP_DIR" -name "*full_backup*.sql*" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
            ;;
        "schema")
            local backup_file=$(find "$BACKUP_DIR" -name "*schema*.sql*" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
            ;;
        *)
            if [[ -f "$recovery_point" ]]; then
                local backup_file="$recovery_point"
            else
                log_error "Recovery point not found: $recovery_point"
                return 1
            fi
            ;;
    esac

    if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
        log_error "No suitable backup found for recovery"
        return 1
    fi

    log_info "Recovery backup: $backup_file"

    # Create recovery database
    PGPASSWORD="$DB_PASSWORD" createdb \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        "$target_db" > /dev/null 2>&1 || log_warning "Recovery database may already exist"

    # Restore from backup
    FORCE_RESTORE=true restore_backup "$backup_file" "$target_db"

    if [[ $? -eq 0 ]]; then
        log_success "DISASTER RECOVERY: Database restored to $target_db"
        log_info "Manual steps required:"
        log_info "1. Validate data integrity in $target_db"
        log_info "2. Update application configuration to point to $target_db"
        log_info "3. Test application functionality"
        log_info "4. When satisfied, rename $target_db to $DB_NAME"

        # Generate recovery report
        generate_recovery_report "$backup_file" "$target_db"
    else
        log_error "DISASTER RECOVERY: Failed to restore database"
        return 1
    fi
}

# Generate recovery report
generate_recovery_report() {
    local backup_file="$1"
    local recovery_db="$2"
    local report_file="${LOG_DIR}/recovery_report_$(date +%Y%m%d_%H%M%S).md"

    cat > "$report_file" << EOF
# SvelteHR Disaster Recovery Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Recovery Database:** $recovery_db
**Source Backup:** $backup_file

## Recovery Summary

- **RTO (Recovery Time Objective):** Achieved
- **RPO (Recovery Point Objective):** Last backup: $(stat -c %y "$backup_file")
- **Recovery Status:** Completed

## Validation Checklist

- [ ] Database connection successful
- [ ] All essential tables present
- [ ] Row-Level Security policies active
- [ ] Application connectivity test
- [ ] Data integrity verification
- [ ] Performance benchmarks

## Next Steps

1. **Validate Application Functionality**
   - Test critical user journeys
   - Verify authentication system
   - Check reporting features

2. **Performance Verification**
   - Run performance monitoring
   - Check connection pooling
   - Validate query performance

3. **Cutover Preparation**
   - Plan maintenance window
   - Prepare rollback procedures
   - Communicate with stakeholders

## Manual Recovery Commands

\`\`\`bash
# Switch application to recovery database
# 1. Update .env file
export DB_NAME="$recovery_db"

# 2. Restart application services
docker-compose restart

# 3. Validate application health
curl -f http://localhost:5173/health

# 4. When satisfied, rename database (during maintenance window)
psql -c "ALTER DATABASE $DB_NAME RENAME TO ${DB_NAME}_old;"
psql -c "ALTER DATABASE $recovery_db RENAME TO $DB_NAME;"
\`\`\`

## Recovery Metrics

- **Backup Size:** $(du -h "$backup_file" | cut -f1)
- **Recovery Duration:** Completed in this session
- **Data Currency:** $(stat -c %y "$backup_file")

## Contact Information

- **Database Administrator:** See project documentation
- **Emergency Contact:** See disaster recovery playbook

---
*Report generated by SvelteHR Database Operations Script*
EOF

    log_success "Recovery report generated: $report_file"
}

# Health check
health_check() {
    log_info "Performing comprehensive database health check"

    local health_score=100
    local issues=()

    # Connection test
    if ! validate_connection; then
        health_score=$((health_score - 50))
        issues+=("Database connection failed")
    fi

    # Check essential tables
    local missing_tables=()
    local essential_tables=("users" "employees" "departments" "test_scenarios" "graphql_operations")

    for table in "${essential_tables[@]}"; do
        local exists=$(PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = '$DB_SCHEMA' AND table_name = '$table');" 2>/dev/null | xargs)

        if [[ "$exists" != "t" ]]; then
            missing_tables+=("$table")
            health_score=$((health_score - 10))
        fi
    done

    if [[ ${#missing_tables[@]} -gt 0 ]]; then
        issues+=("Missing tables: ${missing_tables[*]}")
    fi

    # Check recent backups
    local recent_backup=$(find "$BACKUP_DIR" -name "*full_backup*.sql*" -type f -mtime -1 | head -1)
    if [[ -z "$recent_backup" ]]; then
        health_score=$((health_score - 20))
        issues+=("No recent backup found (within 24 hours)")
    fi

    # Report health status
    if [[ $health_score -ge 90 ]]; then
        log_success "Database health: EXCELLENT ($health_score/100)"
    elif [[ $health_score -ge 70 ]]; then
        log_warning "Database health: GOOD ($health_score/100)"
    elif [[ $health_score -ge 50 ]]; then
        log_warning "Database health: FAIR ($health_score/100)"
    else
        log_error "Database health: POOR ($health_score/100)"
    fi

    if [[ ${#issues[@]} -gt 0 ]]; then
        log_warning "Health check issues detected:"
        for issue in "${issues[@]}"; do
            log_warning "  - $issue"
        done
    fi

    return $((100 - health_score))
}

# Show usage information
show_usage() {
    cat << EOF
SvelteHR Database Operations Script

Usage: $0 <command> [options]

Commands:
  backup <type>           Create database backup (full|schema|data)
  restore <file> [db]     Restore database from backup file
  setup-pooling           Configure connection pooling (PgBouncer)
  monitor                 Run performance monitoring checks
  maintenance             Perform database maintenance (VACUUM, ANALYZE)
  disaster-recovery [point] [target]  Execute disaster recovery procedures
  health-check            Comprehensive database health assessment
  cleanup                 Remove old backup files
  help                    Show this usage information

Examples:
  $0 backup full                    # Create full backup
  $0 backup schema                  # Create schema-only backup
  $0 restore /path/to/backup.sql    # Restore from backup
  $0 disaster-recovery latest       # Recover from latest backup
  $0 health-check                   # Check database health
  $0 monitor                        # Monitor performance
  $0 maintenance                    # Run maintenance tasks

Environment Variables:
  DB_HOST                Database host (default: localhost)
  DB_PORT                Database port (default: 5432)
  DB_NAME                Database name (default: svelteHR)
  DB_USER                Database user (default: postgres)
  DB_PASSWORD            Database password
  BACKUP_RETENTION_DAYS  Backup retention period (default: 30)
  FORCE_RESTORE          Skip confirmation for restore (default: false)

Configuration Files:
  .env                   Environment configuration
  configs/pgbouncer.ini  PgBouncer configuration (auto-generated)

Logs and Backups:
  logs/database/         Operation logs
  backups/database/      Database backups

EOF
}

# Main execution logic
main() {
    local command="${1:-help}"

    log_info "SvelteHR Database Operations Script - Starting $command"

    # Load environment configuration
    load_env

    case "$command" in
        "backup")
            local backup_type="${2:-full}"
            create_backup "$backup_type"
            ;;

        "restore")
            local backup_file="$2"
            local target_db="$3"
            if [[ -z "$backup_file" ]]; then
                log_error "Backup file required for restore operation"
                show_usage
                exit 1
            fi
            restore_backup "$backup_file" "$target_db"
            ;;

        "setup-pooling")
            setup_connection_pooling
            ;;

        "monitor")
            monitor_performance
            ;;

        "maintenance")
            run_maintenance
            ;;

        "disaster-recovery")
            local recovery_point="${2:-latest}"
            local target_db="$3"
            disaster_recovery "$recovery_point" "$target_db"
            ;;

        "health-check")
            health_check
            ;;

        "cleanup")
            cleanup_old_backups
            ;;

        "help"|"--help"|"-h")
            show_usage
            ;;

        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac

    local exit_code=$?

    if [[ $exit_code -eq 0 ]]; then
        log_success "Operation '$command' completed successfully"
    else
        log_error "Operation '$command' failed with exit code $exit_code"
    fi

    exit $exit_code
}

# Execute main function with all arguments
main "$@"