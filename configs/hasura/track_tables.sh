#!/bin/bash

# Script to track all tables in Hasura and set up relationships
HASURA_ENDPOINT="http://localhost:8080"
ADMIN_SECRET="svelteHR-hasura-admin-secret-2024"

# Function to make Hasura API calls
hasura_query() {
    curl -s -X POST "$HASURA_ENDPOINT/v1/metadata" \
         -H "Content-Type: application/json" \
         -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
         -d "$1"
}

echo "Tracking tables in Hasura..."

# Track all tables
tables=(
    "users"
    "user_roles" 
    "user_role_assignments"
    "departments"
    "contact_information"
    "personal_information"
    "job_information"
    "compensation"
    "auth_sessions"
    "oauth_connections"
    "password_reset_tokens"
    "email_verification_tokens"
    "departments_with_stats"
    "users_with_roles"
)

for table in "${tables[@]}"; do
    echo "Tracking table: $table"
    hasura_query "{
        \"type\": \"pg_track_table\",
        \"args\": {
            \"source\": \"default\",
            \"table\": \"$table\"
        }
    }"
done

echo "Setting up relationships..."

# Set up object relationships (many-to-one)
echo "Setting up user_role_assignments -> users relationship"
hasura_query '{
    "type": "pg_create_object_relationship",
    "args": {
        "source": "default",
        "table": "user_role_assignments",
        "name": "user",
        "using": {
            "foreign_key_constraint_on": "user_id"
        }
    }
}'

echo "Setting up user_role_assignments -> user_roles relationship"
hasura_query '{
    "type": "pg_create_object_relationship",
    "args": {
        "source": "default",
        "table": "user_role_assignments",
        "name": "role",
        "using": {
            "foreign_key_constraint_on": "role_id"
        }
    }
}'

echo "Setting up departments -> parent_department relationship"
hasura_query '{
    "type": "pg_create_object_relationship",
    "args": {
        "source": "default",
        "table": "departments",
        "name": "parent_department",
        "using": {
            "foreign_key_constraint_on": "parent_department_id"
        }
    }
}'

echo "Setting up departments -> manager relationship"
hasura_query '{
    "type": "pg_create_object_relationship",
    "args": {
        "source": "default",
        "table": "departments",
        "name": "manager",
        "using": {
            "foreign_key_constraint_on": "manager_id"
        }
    }
}'

echo "Setting up job_information -> department relationship"
hasura_query '{
    "type": "pg_create_object_relationship",
    "args": {
        "source": "default",
        "table": "job_information",
        "name": "department",
        "using": {
            "foreign_key_constraint_on": "department_id"
        }
    }
}'

echo "Setting up job_information -> employee relationship"
hasura_query '{
    "type": "pg_create_object_relationship",
    "args": {
        "source": "default",
        "table": "job_information",
        "name": "employee",
        "using": {
            "foreign_key_constraint_on": "employee_id"
        }
    }
}'

echo "Setting up job_information -> manager relationship"
hasura_query '{
    "type": "pg_create_object_relationship",
    "args": {
        "source": "default",
        "table": "job_information",
        "name": "manager",
        "using": {
            "foreign_key_constraint_on": "manager_id"
        }
    }
}'

# Set up array relationships (one-to-many)
echo "Setting up users -> role_assignments relationship"
hasura_query '{
    "type": "pg_create_array_relationship",
    "args": {
        "source": "default",
        "table": "users",
        "name": "role_assignments",
        "using": {
            "foreign_key_constraint_on": {
                "table": "user_role_assignments",
                "column": "user_id"
            }
        }
    }
}'

echo "Setting up departments -> subdepartments relationship"
hasura_query '{
    "type": "pg_create_array_relationship",
    "args": {
        "source": "default",
        "table": "departments",
        "name": "subdepartments",
        "using": {
            "foreign_key_constraint_on": {
                "table": "departments",
                "column": "parent_department_id"
            }
        }
    }
}'

echo "Setting up departments -> employees relationship"
hasura_query '{
    "type": "pg_create_array_relationship",
    "args": {
        "source": "default",
        "table": "departments",
        "name": "employees",
        "using": {
            "foreign_key_constraint_on": {
                "table": "job_information",
                "column": "department_id"
            }
        }
    }
}'

echo "Hasura setup complete!"
echo "Access Hasura console at: http://localhost:8080/console"
echo "Admin secret: $ADMIN_SECRET"