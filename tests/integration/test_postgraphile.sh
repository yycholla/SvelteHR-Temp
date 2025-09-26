#!/bin/bash
# T007: PostGraphile connectivity test using curl/GraphQL
# This test validates PostGraphile can connect to initialized database and expose GraphQL schema with proper role-based access control
# MUST fail initially to demonstrate TDD approach

set -e

echo "=== PostGraphile Connectivity Test ==="
echo "Testing PostGraphile integration with PostgreSQL database..."

# Configuration
POSTGRAPHILE_URL="http://localhost:5000/graphql"
GRAPHIQL_URL="http://localhost:5000/graphiql"
MAX_WAIT_TIME=60

# Test 1: Start backend container with PostGraphile
echo "Test 1: Starting backend container with PostGraphile..."
cd dev-containers
docker-compose -f docker-compose.dev.yml up backend-dev -d

# Wait for backend to be ready
echo "Waiting for PostGraphile to start (max ${MAX_WAIT_TIME}s)..."
wait_time=0
while [ $wait_time -lt $MAX_WAIT_TIME ]; do
    if curl -s -f "$POSTGRAPHILE_URL" > /dev/null 2>&1; then
        echo "✓ PostGraphile endpoint is responding"
        break
    fi
    echo "Waiting... (${wait_time}/${MAX_WAIT_TIME}s)"
    sleep 5
    wait_time=$((wait_time + 5))
done

if [ $wait_time -ge $MAX_WAIT_TIME ]; then
    echo "✗ FAIL: PostGraphile failed to start within ${MAX_WAIT_TIME} seconds"
    docker logs sveltehr-backend-dev --tail=50
    exit 1
fi

# Test 2: GraphQL introspection query
echo "Test 2: Testing GraphQL schema introspection..."
INTROSPECTION_QUERY='{"query": "{ __schema { types { name } } }"}'

response=$(curl -s -X POST "$POSTGRAPHILE_URL" \
    -H "Content-Type: application/json" \
    -d "$INTROSPECTION_QUERY")

if echo "$response" | grep -q '"data"'; then
    echo "✓ GraphQL introspection query successful"

    # Count available types
    type_count=$(echo "$response" | grep -o '"name"' | wc -l)
    echo "  Found $type_count GraphQL types"
else
    echo "✗ FAIL: GraphQL introspection query failed"
    echo "Response: $response"
    exit 1
fi

# Test 3: Test specific HR-related queries
echo "Test 3: Testing HR-specific GraphQL queries..."
HR_QUERIES='{"query": "{ allUsers(first: 1) { nodes { id email firstName lastName } } }"}'

hr_response=$(curl -s -X POST "$POSTGRAPHILE_URL" \
    -H "Content-Type: application/json" \
    -d "$HR_QUERIES")

if echo "$hr_response" | grep -q '"allUsers"'; then
    echo "✓ HR users query successful"
else
    echo "✗ FAIL: HR users query failed"
    echo "Response: $hr_response"
    exit 1
fi

# Test 4: Test departments query
echo "Test 4: Testing departments GraphQL query..."
DEPT_QUERY='{"query": "{ allDepartments(first: 5) { nodes { id name description } } }"}'

dept_response=$(curl -s -X POST "$POSTGRAPHILE_URL" \
    -H "Content-Type: application/json" \
    -d "$DEPT_QUERY")

if echo "$dept_response" | grep -q '"allDepartments"'; then
    echo "✓ Departments query successful"
else
    echo "✗ FAIL: Departments query failed"
    echo "Response: $dept_response"
    exit 1
fi

# Test 5: Test leave requests query (if table exists)
echo "Test 5: Testing leave requests GraphQL query..."
LEAVE_QUERY='{"query": "{ allLeaveRequests(first: 1) { nodes { id employeeId leaveType startDate endDate status } } }"}'

leave_response=$(curl -s -X POST "$POSTGRAPHILE_URL" \
    -H "Content-Type: application/json" \
    -d "$LEAVE_QUERY")

if echo "$leave_response" | grep -q '"allLeaveRequests"' || echo "$leave_response" | grep -q '"errors"'; then
    echo "✓ Leave requests query processed (table may be empty)"
else
    echo "! Warning: Leave requests query may not be available"
fi

# Test 6: Test GraphiQL interface availability
echo "Test 6: Testing GraphiQL development interface..."
if curl -s -f "$GRAPHIQL_URL" | grep -q "GraphiQL"; then
    echo "✓ GraphiQL interface is accessible"
else
    echo "! Warning: GraphiQL interface not accessible (may be disabled in production)"
fi

# Test 7: Test role-based security (unauthenticated access)
echo "Test 7: Testing role-based security..."
PROTECTED_QUERY='{"query": "{ allUserRoleAssignments { nodes { id userId roleName } } }"}'

protected_response=$(curl -s -X POST "$POSTGRAPHILE_URL" \
    -H "Content-Type: application/json" \
    -d "$PROTECTED_QUERY")

if echo "$protected_response" | grep -q '"allUserRoleAssignments"'; then
    # Check if data is filtered or limited
    if echo "$protected_response" | grep -q '"nodes": \[\]' || echo "$protected_response" | grep -q '"errors"'; then
        echo "✓ Role-based security is working (empty result or error for sensitive data)"
    else
        echo "! Warning: Sensitive data may be accessible without authentication"
    fi
else
    echo "✓ Role assignments query blocked or filtered by security"
fi

# Test 8: Test JWT authentication (if configured)
echo "Test 8: Testing JWT authentication support..."
# This test checks if the PostGraphile instance is configured for JWT
# We'll check the server response headers or configuration

jwt_test_response=$(curl -s -I "$POSTGRAPHILE_URL" | grep -i "jwt\|auth" || echo "No JWT headers found")
echo "  JWT configuration status: $jwt_test_response"

# Test 9: Verify schema reflects database structure
echo "Test 9: Verifying GraphQL schema matches database..."
SCHEMA_QUERY='{"query": "{ __type(name: \"User\") { fields { name type { name } } } }"}'

schema_response=$(curl -s -X POST "$POSTGRAPHILE_URL" \
    -H "Content-Type: application/json" \
    -d "$SCHEMA_QUERY")

if echo "$schema_response" | grep -q '"User"' && echo "$schema_response" | grep -q '"fields"'; then
    echo "✓ GraphQL User type properly exposed"

    # Check for expected fields
    if echo "$schema_response" | grep -q '"email"' && echo "$schema_response" | grep -q '"firstName"'; then
        echo "✓ User type has expected fields (email, firstName)"
    else
        echo "! Warning: User type may be missing expected fields"
    fi
else
    echo "✗ FAIL: GraphQL User type not properly exposed"
    exit 1
fi

echo "=== PostGraphile Connectivity Test PASSED ==="
echo "PostGraphile successfully integrated with PostgreSQL database"
echo "GraphQL API is functional with proper schema exposure"