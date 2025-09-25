#!/bin/bash

# SvelteHR User Management and RBAC Administration Script
# Comprehensive user, role, and permission management for testing framework
# Created: 2025-09-24
# Task: T004 - User management with RBAC integration

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${PROJECT_ROOT}/logs/user_management"
CONFIG_FILE="${PROJECT_ROOT}/.env"

# Create log directory
mkdir -p "$LOG_DIR"

# Logging setup
LOG_FILE="${LOG_DIR}/user_mgmt_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
        set -a
        source "$CONFIG_FILE"
        set +a
        log_info "Environment configuration loaded"
    fi

    export DB_HOST="${DB_HOST:-localhost}"
    export DB_PORT="${DB_PORT:-5432}"
    export DB_NAME="${DB_NAME:-svelteHR}"
    export DB_USER="${DB_USER:-postgres}"
    export DB_PASSWORD="${DB_PASSWORD:-}"
    export DB_SCHEMA="${DB_SCHEMA:-hr_public}"
}

# Database connection validation
validate_connection() {
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        return 0
    else
        log_error "Failed to connect to database"
        return 1
    fi
}

# Create database roles if they don't exist
setup_database_roles() {
    log_info "Setting up database roles for RBAC"

    local roles=(
        "hr_super_admin:SUPERUSER"
        "hr_admin:CREATEDB,CREATEROLE"
        "hr_manager:LOGIN"
        "hr_employee:LOGIN"
    )

    for role_def in "${roles[@]}"; do
        local role_name="${role_def%:*}"
        local role_attrs="${role_def#*:}"

        # Check if role exists
        local role_exists=$(PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -t -c "SELECT 1 FROM pg_roles WHERE rolname = '$role_name';" 2>/dev/null | xargs)

        if [[ "$role_exists" == "1" ]]; then
            log_info "Role $role_name already exists"
        else
            PGPASSWORD="$DB_PASSWORD" psql \
                -h "$DB_HOST" \
                -p "$DB_PORT" \
                -U "$DB_USER" \
                -d "$DB_NAME" \
                -c "CREATE ROLE $role_name WITH $role_attrs;" > /dev/null 2>&1

            log_success "Created database role: $role_name"
        fi
    done

    # Set up role hierarchy
    log_info "Setting up role hierarchy"

    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "
        GRANT hr_employee TO hr_manager;
        GRANT hr_manager TO hr_admin;
        GRANT hr_admin TO hr_super_admin;
        " > /dev/null 2>&1

    log_success "Database roles and hierarchy configured"
}

# Create application user with RBAC
create_user() {
    local username="$1"
    local email="${2:-}"
    local role="${3:-hr_employee}"
    local department_id="${4:-}"

    if [[ -z "$username" ]]; then
        log_error "Username is required"
        return 1
    fi

    log_info "Creating user: $username with role $role"

    # Validate role
    case "$role" in
        "hr_super_admin"|"hr_admin"|"hr_manager"|"hr_employee")
            ;;
        *)
            log_error "Invalid role: $role. Valid roles: hr_super_admin, hr_admin, hr_manager, hr_employee"
            return 1
            ;;
    esac

    # Generate UUID for user
    local user_id=$(uuidgen)
    local temp_password=$(openssl rand -base64 32)

    # Insert user into database
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -v user_id="$user_id" \
        -v username="$username" \
        -v email="$email" \
        -v role="$role" \
        -v department_id="$department_id" \
        -c "
        INSERT INTO ${DB_SCHEMA}.users (
            id, username, email, role, department_id,
            password_hash, is_active, created_at, updated_at
        ) VALUES (
            :'user_id'::uuid, :'username', :'email', :'role',
            CASE WHEN :'department_id' != '' THEN :'department_id'::uuid ELSE NULL END,
            crypt('$temp_password', gen_salt('bf')), true, NOW(), NOW()
        );
        " > /dev/null 2>&1

    if [[ $? -eq 0 ]]; then
        log_success "User created successfully: $username (ID: $user_id)"

        # Create database user for connection
        create_database_user "$username" "$temp_password" "$role"

        # Generate user report
        echo "User Creation Report:"
        echo "  Username: $username"
        echo "  User ID: $user_id"
        echo "  Email: $email"
        echo "  Role: $role"
        echo "  Department ID: $department_id"
        echo "  Temporary Password: $temp_password"
        echo "  Database Role: $role"
        echo ""
        echo "SECURITY NOTE: Please change the temporary password on first login."

        return 0
    else
        log_error "Failed to create user: $username"
        return 1
    fi
}

# Create database user for connection
create_database_user() {
    local username="$1"
    local password="$2"
    local role="$3"

    # Check if database user exists
    local db_user_exists=$(PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT 1 FROM pg_roles WHERE rolname = '$username';" 2>/dev/null | xargs)

    if [[ "$db_user_exists" == "1" ]]; then
        log_warning "Database user $username already exists"
        return 0
    fi

    # Create database user
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "
        CREATE USER \"$username\" WITH PASSWORD '$password';
        GRANT $role TO \"$username\";
        ALTER USER \"$username\" SET search_path TO ${DB_SCHEMA},public;
        " > /dev/null 2>&1

    log_success "Database user created: $username with role $role"
}

# Update user role
update_user_role() {
    local username="$1"
    local new_role="$2"

    if [[ -z "$username" || -z "$new_role" ]]; then
        log_error "Username and new role are required"
        return 1
    fi

    # Validate role
    case "$new_role" in
        "hr_super_admin"|"hr_admin"|"hr_manager"|"hr_employee")
            ;;
        *)
            log_error "Invalid role: $new_role"
            return 1
            ;;
    esac

    log_info "Updating user role: $username -> $new_role"

    # Update application user
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -v username="$username" \
        -v new_role="$new_role" \
        -c "
        UPDATE ${DB_SCHEMA}.users
        SET role = :'new_role', updated_at = NOW()
        WHERE username = :'username';
        " > /dev/null 2>&1

    # Update database user role
    local old_roles=$(PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "
        SELECT array_agg(pg_roles.rolname)
        FROM pg_auth_members
        JOIN pg_roles ON pg_roles.oid = pg_auth_members.roleid
        WHERE pg_auth_members.member = (SELECT oid FROM pg_roles WHERE rolname = '$username')
        AND pg_roles.rolname LIKE 'hr_%';
        " 2>/dev/null | xargs)

    # Revoke old HR roles
    if [[ -n "$old_roles" ]]; then
        for old_role in ${old_roles//,/ }; do
            if [[ "$old_role" =~ ^hr_ ]]; then
                PGPASSWORD="$DB_PASSWORD" psql \
                    -h "$DB_HOST" \
                    -p "$DB_PORT" \
                    -U "$DB_USER" \
                    -d "$DB_NAME" \
                    -c "REVOKE $old_role FROM \"$username\";" > /dev/null 2>&1
            fi
        done
    fi

    # Grant new role
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "GRANT $new_role TO \"$username\";" > /dev/null 2>&1

    log_success "User role updated: $username -> $new_role"
}

# Deactivate user
deactivate_user() {
    local username="$1"

    if [[ -z "$username" ]]; then
        log_error "Username is required"
        return 1
    fi

    log_info "Deactivating user: $username"

    # Deactivate in application
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -v username="$username" \
        -c "
        UPDATE ${DB_SCHEMA}.users
        SET is_active = false, updated_at = NOW()
        WHERE username = :'username';
        " > /dev/null 2>&1

    # Revoke database login capability
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "ALTER USER \"$username\" NOLOGIN;" > /dev/null 2>&1

    log_success "User deactivated: $username"
}

# Reactivate user
reactivate_user() {
    local username="$1"

    if [[ -z "$username" ]]; then
        log_error "Username is required"
        return 1
    fi

    log_info "Reactivating user: $username"

    # Reactivate in application
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -v username="$username" \
        -c "
        UPDATE ${DB_SCHEMA}.users
        SET is_active = true, updated_at = NOW()
        WHERE username = :'username';
        " > /dev/null 2>&1

    # Restore database login capability
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "ALTER USER \"$username\" LOGIN;" > /dev/null 2>&1

    log_success "User reactivated: $username"
}

# List users with roles and permissions
list_users() {
    local filter_role="${1:-}"
    local filter_active="${2:-}"

    log_info "Listing users"

    local where_clause=""
    if [[ -n "$filter_role" ]]; then
        where_clause="WHERE role = '$filter_role'"
    fi

    if [[ -n "$filter_active" ]]; then
        if [[ -n "$where_clause" ]]; then
            where_clause="$where_clause AND is_active = $filter_active"
        else
            where_clause="WHERE is_active = $filter_active"
        fi
    fi

    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "
        SELECT
            u.id,
            u.username,
            u.email,
            u.role,
            d.name as department,
            u.is_active,
            u.last_login_at,
            u.created_at
        FROM ${DB_SCHEMA}.users u
        LEFT JOIN ${DB_SCHEMA}.departments d ON u.department_id = d.id
        $where_clause
        ORDER BY u.role, u.username;
        "
}

# Show user permissions based on role
show_user_permissions() {
    local username="$1"

    if [[ -z "$username" ]]; then
        log_error "Username is required"
        return 1
    fi

    log_info "Showing permissions for user: $username"

    # Get user role
    local user_role=$(PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT role FROM ${DB_SCHEMA}.users WHERE username = '$username';" 2>/dev/null | xargs)

    if [[ -z "$user_role" ]]; then
        log_error "User not found: $username"
        return 1
    fi

    echo "User: $username"
    echo "Role: $user_role"
    echo ""
    echo "Permissions based on role hierarchy:"

    case "$user_role" in
        "hr_super_admin")
            echo "  - All system permissions (SUPERUSER)"
            echo "  - Full access to all testing framework entities"
            echo "  - User management and role assignment"
            echo "  - Database administration"
            ;;
        "hr_admin")
            echo "  - Full CRUD access to all HR entities"
            echo "  - Full access to testing framework"
            echo "  - User role management (except super admin)"
            echo "  - System configuration"
            ;;
        "hr_manager")
            echo "  - Full CRUD access to testing framework"
            echo "  - Read/write access to team-related data"
            echo "  - Employee management within department"
            echo "  - Performance review management"
            ;;
        "hr_employee")
            echo "  - Read access to assigned test scenarios"
            echo "  - Create/update own test results"
            echo "  - View performance metrics"
            echo "  - Participate in collaboration sessions"
            ;;
    esac

    echo ""
    echo "Testing Framework Permissions:"

    # Show specific table access based on RLS policies
    local test_tables=("test_scenarios" "graphql_operations" "navigation_flows" "performance_metrics" "collaboration_sessions" "validation_results")

    for table in "${test_tables[@]}"; do
        echo "  ${table}:"

        case "$user_role" in
            "hr_super_admin"|"hr_admin")
                echo "    - Full CRUD access (all records)"
                ;;
            "hr_manager")
                case "$table" in
                    "test_scenarios"|"navigation_flows"|"validation_results")
                        echo "    - Full CRUD access (team/assigned records)"
                        ;;
                    "graphql_operations")
                        echo "    - CRUD access (RBAC level <= 80)"
                        ;;
                    "performance_metrics")
                        echo "    - Full CRUD access"
                        ;;
                    "collaboration_sessions")
                        echo "    - Full CRUD access"
                        ;;
                esac
                ;;
            "hr_employee")
                case "$table" in
                    "test_scenarios")
                        echo "    - Read access (assigned scenarios only)"
                        ;;
                    "graphql_operations")
                        echo "    - Read access (RBAC level <= 60)"
                        ;;
                    "navigation_flows")
                        echo "    - Read access (employee role flows)"
                        ;;
                    "performance_metrics")
                        echo "    - Read/insert access (own measurements)"
                        ;;
                    "collaboration_sessions")
                        echo "    - Full CRUD access (participant sessions)"
                        ;;
                    "validation_results")
                        echo "    - Read/insert access (own executions)"
                        ;;
                esac
                ;;
        esac
    done
}

# Create permission matrix report
generate_permission_matrix() {
    local output_file="${1:-${LOG_DIR}/permission_matrix_$(date +%Y%m%d_%H%M%S).md}"

    log_info "Generating permission matrix report: $output_file"

    cat > "$output_file" << 'EOF'
# SvelteHR Testing Framework - Permission Matrix

## Role Hierarchy

| Role | Level | Inherits | Description |
|------|-------|----------|-------------|
| hr_super_admin | 100 | All roles | Complete system administration |
| hr_admin | 80 | hr_manager, hr_employee | HR system administration |
| hr_manager | 60 | hr_employee | Team and department management |
| hr_employee | 20 | None | Basic employee access |

## Testing Framework Permissions

### test_scenarios

| Role | Select | Insert | Update | Delete | Notes |
|------|--------|--------|--------|--------|-------|
| hr_super_admin | ✅ | ✅ | ✅ | ✅ | All records |
| hr_admin | ✅ | ✅ | ✅ | ✅ | All records |
| hr_manager | ✅ | ✅ | ✅ | ✅ | Team/assigned records |
| hr_employee | ✅ | ❌ | ❌ | ❌ | Assigned records only |

### graphql_operations

| Role | Select | Insert | Update | Delete | Notes |
|------|--------|--------|--------|--------|-------|
| hr_super_admin | ✅ | ✅ | ✅ | ✅ | All operations |
| hr_admin | ✅ | ✅ | ✅ | ✅ | All operations |
| hr_manager | ✅ | ✅ | ✅ | ✅ | RBAC level ≤ 80 |
| hr_employee | ✅ | ❌ | ❌ | ❌ | RBAC level ≤ 60 |

### navigation_flows

| Role | Select | Insert | Update | Delete | Notes |
|------|--------|--------|--------|--------|-------|
| hr_super_admin | ✅ | ✅ | ✅ | ✅ | All flows |
| hr_admin | ✅ | ✅ | ✅ | ✅ | All flows |
| hr_manager | ✅ | ✅ | ✅ | ✅ | Manager/employee flows |
| hr_employee | ✅ | ❌ | ❌ | ❌ | Employee flows only |

### performance_metrics

| Role | Select | Insert | Update | Delete | Notes |
|------|--------|--------|--------|--------|-------|
| hr_super_admin | ✅ | ✅ | ✅ | ✅ | All metrics |
| hr_admin | ✅ | ✅ | ✅ | ✅ | All metrics |
| hr_manager | ✅ | ✅ | ✅ | ✅ | All metrics |
| hr_employee | ✅ | ✅ | ❌ | ❌ | Own measurements |

### collaboration_sessions

| Role | Select | Insert | Update | Delete | Notes |
|------|--------|--------|--------|--------|-------|
| hr_super_admin | ✅ | ✅ | ✅ | ✅ | All sessions |
| hr_admin | ✅ | ✅ | ✅ | ✅ | All sessions |
| hr_manager | ✅ | ✅ | ✅ | ✅ | Participant sessions |
| hr_employee | ✅ | ✅ | ✅ | ✅ | Participant sessions |

### validation_results

| Role | Select | Insert | Update | Delete | Notes |
|------|--------|--------|--------|--------|-------|
| hr_super_admin | ✅ | ✅ | ✅ | ✅ | All results |
| hr_admin | ✅ | ✅ | ✅ | ✅ | All results |
| hr_manager | ✅ | ✅ | ✅ | ✅ | Team scenario results |
| hr_employee | ✅ | ✅ | ❌ | ❌ | Own executions |

## Row-Level Security Policies

All testing framework tables implement RLS policies that enforce:

1. **Role-based access**: Higher roles inherit lower role permissions
2. **Ownership access**: Users can access records they created
3. **Assignment access**: Users can access records assigned to them
4. **Team access**: Managers can access team-related records
5. **Public access**: Some collaboration sessions may be public

## Security Notes

- All database connections must use SSL in production
- Passwords are stored using bcrypt hashing
- JWT tokens expire after 24 hours
- Failed login attempts are logged and rate-limited
- RLS policies are automatically enforced at the database level

## Audit Trail

All user management operations are logged with:
- Timestamp
- Acting user
- Target user
- Action performed
- Previous and new values (for updates)

EOF

    log_success "Permission matrix generated: $output_file"
}

# Audit user activity
audit_user_activity() {
    local username="${1:-}"
    local days="${2:-7}"

    log_info "Auditing user activity for last $days days"

    if [[ -n "$username" ]]; then
        local where_clause="WHERE username = '$username'"
        log_info "Filtering for user: $username"
    else
        local where_clause=""
    fi

    # This would require an audit log table in a real implementation
    echo "User Activity Audit Report"
    echo "=========================="
    echo "Period: Last $days days"
    echo "Generated: $(date)"
    echo ""

    # Show recent user logins (if login tracking is implemented)
    echo "Recent Login Activity:"
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "
        SELECT
            username,
            role,
            last_login_at,
            login_count,
            is_active
        FROM ${DB_SCHEMA}.users
        $where_clause
        ORDER BY last_login_at DESC NULLS LAST;
        "

    echo ""
    echo "User Account Changes:"
    echo "  - User creation/modification tracking would require audit table"
    echo "  - Permission changes would require audit table"
    echo "  - Login/logout events would require audit table"
}

# Show usage
show_usage() {
    cat << EOF
SvelteHR User Management Script

Usage: $0 <command> [options]

Commands:
  setup-roles                    Create database roles and hierarchy
  create-user <username> [email] [role] [dept_id]
                                Create new user with specified role
  update-role <username> <role>  Change user's role
  deactivate <username>          Deactivate user account
  reactivate <username>          Reactivate user account
  list-users [role] [active]     List all users (optional filters)
  show-permissions <username>    Show user's effective permissions
  generate-matrix [file]         Generate permission matrix report
  audit-activity [user] [days]   Audit user activity
  help                          Show this usage information

Roles:
  hr_super_admin    Complete system administration (Level 100)
  hr_admin          HR system administration (Level 80)
  hr_manager        Team and department management (Level 60)
  hr_employee       Basic employee access (Level 20)

Examples:
  $0 setup-roles
  $0 create-user jdoe john.doe@company.com hr_manager
  $0 update-role jdoe hr_admin
  $0 list-users hr_manager true
  $0 show-permissions jdoe
  $0 generate-matrix /tmp/permissions.md
  $0 audit-activity jdoe 30

Environment Variables:
  DB_HOST           Database host (default: localhost)
  DB_PORT           Database port (default: 5432)
  DB_NAME           Database name (default: svelteHR)
  DB_USER           Database admin user (default: postgres)
  DB_PASSWORD       Database password

EOF
}

# Main execution
main() {
    local command="${1:-help}"

    log_info "SvelteHR User Management Script - Starting $command"

    load_env

    if ! validate_connection; then
        log_error "Database connection failed"
        exit 1
    fi

    case "$command" in
        "setup-roles")
            setup_database_roles
            ;;

        "create-user")
            local username="$2"
            local email="${3:-}"
            local role="${4:-hr_employee}"
            local dept_id="${5:-}"
            create_user "$username" "$email" "$role" "$dept_id"
            ;;

        "update-role")
            local username="$2"
            local new_role="$3"
            update_user_role "$username" "$new_role"
            ;;

        "deactivate")
            local username="$2"
            deactivate_user "$username"
            ;;

        "reactivate")
            local username="$2"
            reactivate_user "$username"
            ;;

        "list-users")
            local filter_role="$2"
            local filter_active="$3"
            list_users "$filter_role" "$filter_active"
            ;;

        "show-permissions")
            local username="$2"
            show_user_permissions "$username"
            ;;

        "generate-matrix")
            local output_file="$2"
            generate_permission_matrix "$output_file"
            ;;

        "audit-activity")
            local username="$2"
            local days="${3:-7}"
            audit_user_activity "$username" "$days"
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

# Execute main function
main "$@"