#!/bin/bash
# Database Replication Verification Script

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-hr_system}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres123}"

print_info() { echo -e "\033[0;34mℹ\033[0m $1"; }
print_success() { echo -e "\033[0;32m✓\033[0m $1"; }
print_error() { echo -e "\033[0;31m✗\033[0m $1"; }

verify_connection() {
    print_info "Testing database connection..."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connection successful"
        return 0
    else
        print_error "Cannot connect to database"
        return 1
    fi
}

verify_schema() {
    print_info "Verifying database schema..."
    
    # Check table count
    local table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'hr_public';")
    
    if [ "$table_count" -ge 40 ]; then
        print_success "Schema has $table_count tables (expected: 45+)"
    else
        print_error "Schema incomplete: only $table_count tables found"
        return 1
    fi
    
    # Check key tables exist
    local key_tables=("users" "departments" "tasks" "events" "activity_logs")
    for table in "${key_tables[@]}"; do
        local exists=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'hr_public' AND table_name = '$table';")
        if [ "$exists" -eq 0 ]; then
            print_error "Missing key table: $table"
            return 1
        fi
    done
    
    print_success "All key tables present"
}

verify_admin_user() {
    print_info "Verifying admin user exists..."
    
    local admin_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM hr_public.users WHERE email = 'admin@mountainhr.dev';")
    
    if [ "$admin_count" -eq 1 ]; then
        print_success "Admin user found"
    else
        print_error "Admin user missing"
        return 1
    fi
}

verify_migrations() {
    print_info "Verifying migration tracking..."
    
    local migration_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM public.schema_migrations;")
    
    if [ "$migration_count" -gt 50 ]; then
        print_success "Migration tracking active: $migration_count migrations recorded"
    else
        print_error "Migration tracking incomplete: only $migration_count migrations"
        return 1
    fi
}

main() {
    echo "═══════════════════════════════════════════════════════"
    echo "  Database Replication Verification"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    
    local errors=0
    
    if verify_connection; then
        echo ""
        verify_schema || ((errors++))
        echo ""
        verify_admin_user || ((errors++))
        echo ""
        verify_migrations || ((errors++))
    else
        errors=1
    fi
    
    echo ""
    if [ $errors -eq 0 ]; then
        print_success "Database replication verification PASSED"
        echo ""
        echo "Your database is ready for development!"
        echo "You can now run: npm run dev"
    else
        print_error "Database replication verification FAILED"
        echo ""
        echo "Please check the errors above and re-run the restore process."
        exit 1
    fi
}

main "$@"
