#!/bin/bash
# Complete Database Schema Replication Script
# Creates exact replica of current SvelteHR database

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-hr_system}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres123}"
OUTPUT_DIR="${OUTPUT_DIR:-./database_backup}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  SvelteHR Database Schema Replication${NC}"
    echo -e "${BLUE}  Generated: $(date)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

check_database() {
    print_info "Checking database connection..."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connection successful"
        return 0
    else
        print_error "Cannot connect to database"
        echo "Connection details:"
        echo "  Host: $DB_HOST"
        echo "  Port: $DB_PORT"
        echo "  Database: $DB_NAME"
        echo "  User: $DB_USER"
        return 1
    fi
}

create_output_directory() {
    mkdir -p "$OUTPUT_DIR"
    print_info "Output directory: $OUTPUT_DIR"
}

dump_schema_only() {
    print_info "Creating schema-only dump..."
    local output_file="$OUTPUT_DIR/hr_system_schema_$TIMESTAMP.sql"
    
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --schema-only \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        --verbose \
        --format=plain \
        --file="$output_file"
    
    print_success "Schema dump created: $output_file"
    echo "$output_file"
}

dump_complete_database() {
    print_info "Creating complete database dump (schema + data)..."
    local output_file="$OUTPUT_DIR/hr_system_complete_$TIMESTAMP.backup"
    
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        --verbose \
        --format=custom \
        --compress=9 \
        --file="$output_file"
    
    print_success "Complete dump created: $output_file"
    echo "$output_file"
}

dump_migration_status() {
    print_info "Dumping migration status..."
    local output_file="$OUTPUT_DIR/migration_status_$TIMESTAMP.txt"
    
    {
        echo "Migration Status - $(date)"
        echo "========================================"
        echo ""
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
            "SELECT filename, applied_at, execution_time_ms FROM public.schema_migrations ORDER BY applied_at;"
        echo ""
        echo "Total migrations applied: $(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM public.schema_migrations;")"
    } > "$output_file"
    
    print_success "Migration status saved: $output_file"
}

dump_database_info() {
    print_info "Dumping database information..."
    local output_file="$OUTPUT_DIR/database_info_$TIMESTAMP.txt"
    
    {
        echo "Database Information - $(date)"
        echo "========================================"
        echo ""
        echo "PostgreSQL Version:"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();"
        echo ""
        echo "Database Size:"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));"
        echo ""
        echo "Table Count by Schema:"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
            "SELECT schemaname, COUNT(*) as tables FROM pg_tables GROUP BY schemaname ORDER BY schemaname;"
        echo ""
        echo "hr_public Schema Tables:"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
            "SELECT tablename FROM pg_tables WHERE schemaname = 'hr_public' ORDER BY tablename;"
        echo ""
        echo "User Count:"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
            "SELECT COUNT(*) FROM hr_public.users;"
        echo ""
        echo "Admin User Check:"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
            "SELECT id, email, first_name, last_name FROM hr_public.users WHERE email = 'admin@mountainhr.dev';"
    } > "$output_file"
    
    print_success "Database info saved: $output_file"
}

create_restore_script() {
    print_info "Creating restore script..."
    local restore_script="$OUTPUT_DIR/restore_database_$TIMESTAMP.sh"
    
    cat > "$restore_script" << RESTORE_EOF
#!/bin/bash
# Database Restore Script
# Generated: $(date)
# Source: $DB_HOST:$DB_PORT/$DB_NAME

set -e

# Configuration - MODIFY THESE FOR YOUR TARGET DATABASE
TARGET_HOST="\${TARGET_HOST:-localhost}"
TARGET_PORT="\${TARGET_PORT:-5432}"
TARGET_DB="\${TARGET_DB:-hr_system}"
TARGET_USER="\${TARGET_USER:-postgres}"
TARGET_PASSWORD="\${TARGET_PASSWORD:-postgres123}"

echo "Restoring SvelteHR database..."
echo "Target: \$TARGET_HOST:\$TARGET_PORT/\$TARGET_DB"
echo ""

# Set password for non-interactive use
export PGPASSWORD="\$TARGET_PASSWORD"

# Option 1: Restore from schema-only dump (recommended for development)
if [ -f "$(basename "$1")" ]; then
    echo "Restoring schema from: $(basename "$1")"
    psql -h "\$TARGET_HOST" -p "\$TARGET_PORT" -U "\$TARGET_USER" -d "\$TARGET_DB" -f "$(basename "$1")"
    echo "✅ Schema restored successfully"
fi

# Option 2: Restore from complete dump (includes data)
if [ -f "$(basename "$2")" ]; then
    echo "Restoring complete database from: $(basename "$2")"
    pg_restore --verbose --clean --if-exists --create \\
        --host="\$TARGET_HOST" \\
        --port="\$TARGET_PORT" \\
        --username="\$TARGET_USER" \\
        --dbname="\$TARGET_DB" \\
        "$(basename "$2")"
    echo "✅ Complete database restored successfully"
fi

echo ""
echo "Database restore complete!"
echo "You can now run your application against the restored database."
RESTORE_EOF
    
    chmod +x "$restore_script"
    print_success "Restore script created: $restore_script"
}

main() {
    print_header
    
    # Check prerequisites
    if ! command -v pg_dump &> /dev/null; then
        print_error "pg_dump not found. Please install PostgreSQL client tools."
        exit 1
    fi
    
    if ! check_database; then
        exit 1
    fi
    
    create_output_directory
    
    echo ""
    print_info "Starting database replication process..."
    echo ""
    
    # Create dumps
    local schema_file=$(dump_schema_only)
    local complete_file=$(dump_complete_database)
    
    echo ""
    
    # Create metadata
    dump_migration_status
    dump_database_info
    
    echo ""
    
    # Create restore script
    create_restore_script "$schema_file" "$complete_file"
    
    echo ""
    print_success "Database replication complete!"
    echo ""
    echo "Generated files in: $OUTPUT_DIR"
    echo "  📄 Schema dump: $(basename "$schema_file")"
    echo "  📦 Complete dump: $(basename "$complete_file")"
    echo "  📋 Migration status: migration_status_$TIMESTAMP.txt"
    echo "  ℹ️  Database info: database_info_$TIMESTAMP.txt"
    echo "  🔧 Restore script: restore_database_$TIMESTAMP.sh"
    echo ""
    print_info "To restore on another computer:"
    echo "  1. Copy the files to your target machine"
    echo "  2. Run: ./restore_database_$TIMESTAMP.sh"
    echo "  3. Or manually: psql -U postgres -d hr_system -f hr_system_schema_$TIMESTAMP.sql"
}

# Run main function
main "$@"
