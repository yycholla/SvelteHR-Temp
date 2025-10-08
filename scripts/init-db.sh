#!/bin/bash
# Database initialization script for SvelteHR
# This script applies all migrations in the correct order
# Can be used for both initial setup and applying new migrations

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-hr_system}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres123}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$(dirname "$0")/../migrations}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if PostgreSQL is accessible
check_database() {
    print_info "Checking database connection..."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connection successful"
        return 0
    else
        print_error "Cannot connect to database"
        print_info "Connection details:"
        echo "  Host: $DB_HOST"
        echo "  Port: $DB_PORT"
        echo "  Database: $DB_NAME"
        echo "  User: $DB_USER"
        return 1
    fi
}

# Create migration tracking table
create_migration_table() {
    print_info "Creating migration tracking table..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum VARCHAR(64),
    execution_time_ms INTEGER
);
EOF
    print_success "Migration tracking table ready"
}

# Check if a migration has already been applied
is_migration_applied() {
    local filename="$1"
    local result=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM public.schema_migrations WHERE filename = '$filename';")
    [ "$result" -gt 0 ]
}

# Apply a single migration file
apply_migration() {
    local filepath="$1"
    local filename=$(basename "$filepath")

    if is_migration_applied "$filename"; then
        print_warning "Skipping $filename (already applied)"
        return 0
    fi

    print_info "Applying migration: $filename"

    local start_time=$(date +%s%3N)

    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$filepath" > /dev/null 2>&1; then
        local end_time=$(date +%s%3N)
        local execution_time=$((end_time - start_time))

        # Calculate checksum
        local checksum=$(sha256sum "$filepath" | awk '{print $1}')

        # Record migration
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
            "INSERT INTO public.schema_migrations (filename, checksum, execution_time_ms) VALUES ('$filename', '$checksum', $execution_time);" > /dev/null

        print_success "Applied $filename (${execution_time}ms)"
        return 0
    else
        print_error "Failed to apply $filename"
        print_error "Migration failed. Check the SQL file for errors."
        return 1
    fi
}

# Get list of migration files in correct order
get_migration_files() {
    # Define the correct migration order
    # Base schema files (01-07)
    local base_migrations=(
        "01-roles.sql"
        "02-schema.sql"
        "03-data.sql"
        "03_create_tasks_table.sql"
        "04-indexes.sql"
        "04_create_current_user_function.sql"
        "05_add_missing_tables.sql"
        "06_create_event_attendees.sql"
        "07_add_employee_details.sql"
    )

    # Feature migrations (sorted by date/name)
    local feature_migrations=(
        "20250930_add_performance_indexes.sql"
        "20250930_add_rls_policies.sql"
        "20250930_create_hr_reports_table.sql"
        "20250930_create_notifications_table.sql"
        "20250930_validate_schema.sql"
        "20251002_001_create_activity_logs.sql"
        "20251002_002_create_rollback_requests.sql"
        "20251002_003_create_bulk_rollback_batches.sql"
        "20251002_004_comprehensive_audit_logging.sql"
        "20251003_001_execute_rollback_function.sql"
        "20251003_002_fix_rollback_requests_schema.sql"
        "20251003_003_add_rollback_requests_requested_at_index.sql"
        "20251003_add_historical_data.sql"
        "20251002_003_remove_hr_prefix_from_roles.sql"
        "20251002_004_cleanup_old_roles.sql"
        "20251007_001_add_review_types_metadata.sql"
        "20251007_001_add_recurring_events.sql"
        "20251007_002_event_waitlist.sql"
        "20251007_003_event_comments.sql"
        "20251007_004_event_history.sql"
        "20251007_005_event_notifications.sql"
        "20251007_006_notification_preferences.sql"
        "20251007_007_event_indexes.sql"
        "20251007_008_fulltext_indexes.sql"
        "20251007_009_waitlist_promotion.sql"
        "20251007_010_audit_trail.sql"
        "20251007_011_capacity_enforcement.sql"
        "20251007_012_updated_at_triggers.sql"
        "20251007_013_rls_policies.sql"
        "20251008_001_add_event_reminder_time.sql"
    )

    # Seed data (always last)
    local seed_migrations=(
        "seed-development-data.sql"
    )

    # Combine all migrations
    echo "${base_migrations[@]}" "${feature_migrations[@]}" "${seed_migrations[@]}"
}

# Apply all migrations
apply_all_migrations() {
    print_info "Starting migration process..."
    print_info "Migrations directory: $MIGRATIONS_DIR"
    echo ""

    local migrations=($(get_migration_files))
    local total=${#migrations[@]}
    local applied=0
    local skipped=0
    local failed=0

    for migration_file in "${migrations[@]}"; do
        local filepath="$MIGRATIONS_DIR/$migration_file"

        if [ ! -f "$filepath" ]; then
            print_warning "Migration file not found: $migration_file"
            continue
        fi

        if apply_migration "$filepath"; then
            if is_migration_applied "$migration_file"; then
                applied=$((applied + 1))
            else
                skipped=$((skipped + 1))
            fi
        else
            failed=$((failed + 1))
            print_error "Migration process stopped due to error in $migration_file"
            return 1
        fi
    done

    echo ""
    print_success "Migration process complete"
    echo "  Total migrations: $total"
    echo "  Applied: $applied"
    echo "  Skipped: $skipped"
    echo "  Failed: $failed"
}

# Show migration status
show_migration_status() {
    print_info "Migration Status:"
    echo ""
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
        "SELECT filename, applied_at, execution_time_ms FROM public.schema_migrations ORDER BY applied_at;"
}

# Main execution
main() {
    echo "═══════════════════════════════════════════════════════"
    echo "  SvelteHR Database Initialization"
    echo "═══════════════════════════════════════════════════════"
    echo ""

    # Check database connection
    if ! check_database; then
        exit 1
    fi

    echo ""

    # Create migration tracking table
    create_migration_table

    echo ""

    # Apply migrations
    if [ "$1" = "--status" ]; then
        show_migration_status
    else
        apply_all_migrations

        echo ""

        # Show final status
        show_migration_status
    fi
}

# Run main function
main "$@"
