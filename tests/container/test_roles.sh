#!/bin/bash
# T006: Role permissions test using psql commands
# This test validates PostgreSQL roles are created with proper hierarchy and permissions
# MUST fail initially to demonstrate TDD approach

set -e

echo "=== Role Permissions Validation Test ==="
echo "Testing PostgreSQL roles and permission hierarchy..."

# Configuration
CONTAINER_NAME="sveltehr-postgres-dev"
DB_NAME="hr_system"
DB_USER="postgres"
DB_PASSWORD="postgres123"

# Helper function to run SQL query
run_query() {
    local query="$1"
    docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME \
        psql -U $DB_USER -d $DB_NAME -t -c "$query" 2>/dev/null | xargs
}

# Test 1: Verify all required roles exist
echo "Test 1: Checking required roles exist..."
REQUIRED_ROLES="hr_guest hr_employee hr_manager hr_admin hr_super_admin postgraphile_app"
for role in $REQUIRED_ROLES; do
    exists=$(run_query "SELECT COUNT(*) FROM pg_roles WHERE rolname = '$role';")
    if [ "$exists" = "1" ]; then
        echo "✓ Role '$role' exists"
    else
        echo "✗ FAIL: Role '$role' not found"
        exit 1
    fi
done

# Test 2: Verify role hierarchy (role memberships)
echo "Test 2: Checking role hierarchy..."
ROLE_MEMBERSHIPS="hr_employee:hr_guest hr_manager:hr_employee hr_admin:hr_manager hr_super_admin:hr_admin"
for membership in $ROLE_MEMBERSHIPS; do
    parent_role=$(echo $membership | cut -d: -f1)
    child_role=$(echo $membership | cut -d: -f2)

    has_membership=$(run_query "SELECT COUNT(*) FROM pg_auth_members am JOIN pg_roles r1 ON am.roleid = r1.oid JOIN pg_roles r2 ON am.member = r2.oid WHERE r1.rolname = '$parent_role' AND r2.rolname = '$child_role';")

    if [ "$has_membership" = "1" ]; then
        echo "✓ Role hierarchy: $parent_role inherits from $child_role"
    else
        echo "✗ FAIL: Role hierarchy missing: $parent_role should inherit from $child_role"
        exit 1
    fi
done

# Test 3: Verify schema permissions
echo "Test 3: Checking schema access permissions..."
SCHEMA_PERMISSIONS="hr_public:hr_guest hr_public:hr_employee hr_private:hr_admin hr_hidden:hr_super_admin"
for permission in $SCHEMA_PERMISSIONS; do
    schema=$(echo $permission | cut -d: -f1)
    role=$(echo $permission | cut -d: -f2)

    has_usage=$(run_query "SELECT COUNT(*) FROM information_schema.usage_privileges WHERE grantee = '$role' AND object_schema = '$schema' AND privilege_type = 'USAGE';")

    if [ "$has_usage" -ge "1" ]; then
        echo "✓ Schema permission: $role has access to $schema"
    else
        echo "✗ FAIL: Schema permission missing: $role should have access to $schema"
        exit 1
    fi
done

# Test 4: Verify PostGraphile app role has super admin privileges
echo "Test 4: Checking PostGraphile app role permissions..."
postgraphile_has_superadmin=$(run_query "SELECT COUNT(*) FROM pg_auth_members am JOIN pg_roles r1 ON am.roleid = r1.oid JOIN pg_roles r2 ON am.member = r2.oid WHERE r1.rolname = 'postgraphile_app' AND r2.rolname = 'hr_super_admin';")

if [ "$postgraphile_has_superadmin" = "1" ]; then
    echo "✓ PostGraphile app role has hr_super_admin privileges"
else
    echo "✗ FAIL: PostGraphile app role missing hr_super_admin privileges"
    exit 1
fi

# Test 5: Verify table access permissions for guest role (should have SELECT only)
echo "Test 5: Checking guest role table permissions..."
guest_table_privs=$(run_query "SELECT COUNT(*) FROM information_schema.table_privileges WHERE grantee = 'hr_guest' AND table_schema = 'hr_public' AND privilege_type = 'SELECT';")

if [ "$guest_table_privs" -gt "0" ]; then
    echo "✓ Guest role has SELECT permissions on $guest_table_privs tables"
else
    echo "✗ FAIL: Guest role missing SELECT permissions on hr_public tables"
    exit 1
fi

# Test 6: Verify higher roles have full permissions
echo "Test 6: Checking admin role permissions..."
FULL_PERMISSION_ROLES="hr_employee hr_manager hr_admin hr_super_admin"
for role in $FULL_PERMISSION_ROLES; do
    full_privs=$(run_query "SELECT COUNT(DISTINCT privilege_type) FROM information_schema.table_privileges WHERE grantee = '$role' AND table_schema = 'hr_public' AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE');")

    if [ "$full_privs" = "4" ]; then
        echo "✓ Role '$role' has full CRUD permissions"
    else
        echo "✗ FAIL: Role '$role' missing full CRUD permissions (has $full_privs/4)"
        exit 1
    fi
done

# Test 7: Verify roles can login (for application roles)
echo "Test 7: Checking role login capabilities..."
APP_ROLES="postgraphile_app"
for role in $APP_ROLES; do
    can_login=$(run_query "SELECT COUNT(*) FROM pg_roles WHERE rolname = '$role' AND rolcanlogin = true;")

    if [ "$can_login" = "1" ]; then
        echo "✓ Application role '$role' can login"
    else
        echo "! Warning: Application role '$role' cannot login (may be intentional)"
    fi
done

echo "=== Role Permissions Test PASSED ==="
echo "All roles properly configured with correct hierarchy and permissions"