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
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$(dirname "$0")/../db/migrations}"

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
    # Automatically discover and order migration files
    # Priority order: main directory, then remediation, then _archive (for historical reference)

    local all_files=()

    # Find all .sql files (excluding .bak files) in main migrations directory
    while IFS= read -r -d '' file; do
        # Skip backup files and disabled files
        if [[ "$file" != *.bak && "$file" != *.disabled ]]; then
            all_files+=("$file")
        fi
    done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name "*.sql" -print0 2>/dev/null | sort -z)

    # Find files in remediation directory (higher priority than archive)
    while IFS= read -r -d '' file; do
        if [[ "$file" != *.bak && "$file" != *.disabled ]]; then
            all_files+=("$file")
        fi
    done < <(find "$MIGRATIONS_DIR/remediation" -name "*.sql" -print0 2>/dev/null | sort -z)

    # Find files in _archive directory (lowest priority)
    while IFS= read -r -d '' file; do
        if [[ "$file" != *.bak && "$file" != *.disabled ]]; then
            all_files+=("$file")
        fi
    done < <(find "$MIGRATIONS_DIR/_archive" -name "*.sql" -print0 2>/dev/null | sort -z)

    # Sort all files by their migration key (date + sequence)
    local sorted_files=()
    while IFS= read -r file; do
        sorted_files+=("$file")
    done < <(printf '%s\n' "${all_files[@]}" | awk -F'/' '
    {
        filename = $NF
        dirname = ""
        for (i=1; i<NF; i++) {
            if (dirname) dirname = dirname "/"
            dirname = dirname $i
        }

        # Extract migration key from filename
        key = "99999999_999"  # Default fallback

        # Handle remediation files: remediation/YYYYMMDD_HHMMSS_NNN_description.sql
        if (match(filename, /^([0-9]{8}_[0-9]{6})_([0-9]+)_.*\.sql$/, arr) && dirname ~ /remediation/) {
            key = arr[1] "_" arr[2]
        }
        # Handle standard date files: YYYYMMDD_NNN_description.sql
        else if (match(filename, /^([0-9]{8})_([0-9]+)_.*\.sql$/, arr)) {
            key = arr[1] "_" arr[2]
        }
        # Handle sequence-only files: NNN_description.sql
        else if (match(filename, /^([0-9]+)_.*\.sql$/, arr)) {
            key = "20240101_" sprintf("%03d", arr[1])  # Put sequence-only files early
        }

        printf "%s\t%s\n", key, $0
    }' | sort | cut -f2)

    # Return just the filenames (not full paths)
    local result=()
    for file in "${sorted_files[@]}"; do
        result+=("$(basename "$file")")
    done

    echo "${result[@]}"
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
        # Handle files from subdirectories (remediation/, _archive/)
        local filepath=""
        if [ -f "$MIGRATIONS_DIR/$migration_file" ]; then
            filepath="$MIGRATIONS_DIR/$migration_file"
        elif [ -f "$MIGRATIONS_DIR/remediation/$migration_file" ]; then
            filepath="$MIGRATIONS_DIR/remediation/$migration_file"
        elif [ -f "$MIGRATIONS_DIR/_archive/$migration_file" ]; then
            filepath="$MIGRATIONS_DIR/_archive/$migration_file"
        else
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
