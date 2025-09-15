#!/bin/bash

# Script to track all tables and relationships in Hasura
# Run with: doppler run -- ./configs/hasura/track-tables.sh

HASURA_ENDPOINT="http://localhost:8080/v1/metadata"
ADMIN_SECRET_HEADER="X-Hasura-Admin-Secret: $HASURA_ADMIN_SECRET"

echo "🔧 Tracking all tables in Hasura..."

# List of tables to track
tables=(
  "users"
  "departments"
  "job_information"
  "compensation"
  "contact_information"
  "personal_information"
  "user_roles"
  "user_role_assignments"
  "auth_sessions"
  "email_verification_tokens"
  "password_reset_tokens"
  "oauth_connections"
  "audit_log"
)

# Track each table
for table in "${tables[@]}"; do
  echo "📋 Tracking table: $table"
  curl -s -X POST "$HASURA_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "$ADMIN_SECRET_HEADER" \
    -d "{\"type\": \"pg_track_table\", \"args\": {\"source\": \"default\", \"table\": \"$table\"}}" \
    | jq -r '.message // .error // .'
done

# Track views
views=(
  "departments_with_stats"
  "users_with_roles"
)

for view in "${views[@]}"; do
  echo "👁️  Tracking view: $view"
  curl -s -X POST "$HASURA_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "$ADMIN_SECRET_HEADER" \
    -d "{\"type\": \"pg_track_table\", \"args\": {\"source\": \"default\", \"table\": \"$view\"}}" \
    | jq -r '.message // .error // .'
done

echo "🔗 Setting up relationships..."

# Define relationships
relationships=(
  # Users -> Job Information (one-to-many)
  '{"type": "pg_create_array_relationship", "args": {"source": "default", "table": "users", "name": "job_information", "using": {"foreign_key_constraint_on": {"column": "employee_id", "table": "job_information"}}}}'
  
  # Users -> Role Assignments (one-to-many)
  '{"type": "pg_create_array_relationship", "args": {"source": "default", "table": "users", "name": "role_assignments", "using": {"foreign_key_constraint_on": {"column": "user_id", "table": "user_role_assignments"}}}}'
  
  # Users -> Compensation (one-to-one)
  '{"type": "pg_create_object_relationship", "args": {"source": "default", "table": "users", "name": "compensation", "using": {"foreign_key_constraint_on": {"column": "employee_id", "table": "compensation"}}}}'
  
  # Users -> Contact Information (one-to-one)
  '{"type": "pg_create_object_relationship", "args": {"source": "default", "table": "users", "name": "contact_information", "using": {"foreign_key_constraint_on": {"column": "employee_id", "table": "contact_information"}}}}'
  
  # Job Information -> User (many-to-one)
  '{"type": "pg_create_object_relationship", "args": {"source": "default", "table": "job_information", "name": "employee", "using": {"foreign_key_constraint_on": "employee_id"}}}'
  
  # Job Information -> Department (many-to-one)
  '{"type": "pg_create_object_relationship", "args": {"source": "default", "table": "job_information", "name": "department", "using": {"foreign_key_constraint_on": "department_id"}}}'
  
  # Departments -> Manager (many-to-one)
  '{"type": "pg_create_object_relationship", "args": {"source": "default", "table": "departments", "name": "manager", "using": {"foreign_key_constraint_on": "manager_id"}}}'
  
  # Departments -> Employees (one-to-many)
  '{"type": "pg_create_array_relationship", "args": {"source": "default", "table": "departments", "name": "employees", "using": {"foreign_key_constraint_on": {"column": "department_id", "table": "job_information"}}}}'
  
  # Departments -> Subdepartments (one-to-many)
  '{"type": "pg_create_array_relationship", "args": {"source": "default", "table": "departments", "name": "subdepartments", "using": {"foreign_key_constraint_on": {"column": "parent_department_id", "table": "departments"}}}}'
  
  # Departments -> Parent Department (many-to-one)
  '{"type": "pg_create_object_relationship", "args": {"source": "default", "table": "departments", "name": "parent_department", "using": {"foreign_key_constraint_on": "parent_department_id"}}}'
  
  # Role Assignments -> User (many-to-one)
  '{"type": "pg_create_object_relationship", "args": {"source": "default", "table": "user_role_assignments", "name": "user", "using": {"foreign_key_constraint_on": "user_id"}}}'
  
  # Role Assignments -> Role (many-to-one)
  '{"type": "pg_create_object_relationship", "args": {"source": "default", "table": "user_role_assignments", "name": "role", "using": {"foreign_key_constraint_on": "role_id"}}}'
)

for relationship in "${relationships[@]}"; do
  echo "🔗 Creating relationship..."
  curl -s -X POST "$HASURA_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "$ADMIN_SECRET_HEADER" \
    -d "$relationship" \
    | jq -r '.message // .error // .'
done

echo "✅ All tables and relationships tracked!"
echo "🌐 Hasura Console: http://localhost:8080/console"
echo "🔍 GraphQL Endpoint: http://localhost:8080/v1/graphql"