# GraphQL API Migration - Quickstart Guide

**Project**: GraphQL API Migration  
**Date**: 2025-09-09  
**Purpose**: Step-by-step guide to validate complete GraphQL migration

## Pre-Migration Validation

### 1. Environment Setup Verification

**Check GraphQL Server Status**:
```bash
# Ensure development server is running
npm run dev

# Test GraphQL endpoint availability
curl -X POST http://localhost:5173/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-bearer-token" \
  -d '{"query": "query { __schema { queryType { name } } }"}'
```

**Expected Result**: GraphQL introspection response with schema information

**Check GelDB Connection**:
```bash
# Verify environment variables
echo $GELDB_URL
echo $GELDB_HOST
echo $GELDB_PORT

# Test database connectivity (if applicable)
# Implementation-specific database health check
```

### 2. Authentication Validation

**Test Bearer Token Authentication**:
```bash
# Test with valid token
curl -X POST http://localhost:5173/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-admin-token-12345" \
  -d '{"query": "query { me { user { id email name } } }"}'

# Test without token (should fail)
curl -X POST http://localhost:5173/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { me { user { id email name } } }"}'
```

**Expected Results**:
- Valid token: User information returned
- No token: Authentication error with 401 status

### 3. RBAC Permission Validation

**Test Role-based Data Access**:
```bash
# Admin token - should see all data
curl -X POST http://localhost:5173/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-admin-token-12345" \
  -d '{"query": "query { employees(first: 5) { nodes { id full_name email salary } } }"}'

# Employee token - should see limited data
curl -X POST http://localhost:5173/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-employee-token-22222" \
  -d '{"query": "query { employees(first: 5) { nodes { id full_name email salary } } }"}'
```

**Expected Results**:
- Admin: Full employee data including salary
- Employee: Employee data without sensitive fields

## Core Migration Tests

### 4. Employee Data Migration

**REST vs GraphQL Data Comparison**:

**REST API Call** (Current):
```bash
curl -X GET "http://localhost:8080/api/v2/employees?limit=5" \
  -H "Authorization: Bearer your-token"
```

**GraphQL API Call** (New):
```bash
curl -X POST http://localhost:5173/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-admin-token-12345" \
  -d '{
    "query": "query GetEmployees($first: Int) { employees(first: $first) { nodes { id employee_id first_name last_name full_name email phone position department { id name } status hire_date created_at updated_at } totalCount pageInfo { hasNextPage hasPreviousPage } } }",
    "variables": { "first": 5 }
  }'
```

**Validation Checklist**:
- [ ] Same number of records returned
- [ ] All employee fields present and correctly formatted
- [ ] Department relationship resolved correctly
- [ ] Pagination information accurate
- [ ] Response time within acceptable limits (<200ms)

### 5. Department Data Migration

**GraphQL Department Query**:
```bash
curl -X POST http://localhost:5173/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-admin-token-12345" \
  -d '{
    "query": "query GetDepartments { departments { id name description budget_code manager { id full_name } employee_count total_budget is_active created_at updated_at } }"
  }'
```

**Validation Checklist**:
- [ ] All departments returned
- [ ] Manager relationships resolved
- [ ] Employee counts calculated correctly
- [ ] Budget information present
- [ ] Hierarchical data structure maintained

### 6. Dashboard Widget Migration

**GraphQL Dashboard Query**:
```bash
curl -X POST http://localhost:5173/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-hr-token-67890" \
  -d '{
    "query": "query GetDashboard($role: String) { dashboardData(role: $role) { widgets { id type title data accessible priority requires_action sensitive_data last_updated } user_role access_scope permissions metadata { last_updated refresh_interval realtime_enabled } } }",
    "variables": { "role": "HR_Manager" }
  }'
```

**Validation Checklist**:
- [ ] Role-appropriate widgets returned
- [ ] Widget data populated correctly
- [ ] Permission-based filtering working
- [ ] Metadata includes refresh settings
- [ ] Sensitive data handling appropriate

## User Workflow Validation

### 7. Employee Management Workflow

**Create Employee via GraphQL**:
```bash
curl -X POST http://localhost:5173/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-hr-token-67890" \
  -d '{
    "query": "mutation CreateEmployee($input: CreateEmployeeInput!) { createEmployee(input: $input) { id employee_id full_name email position department { name } status hire_date } }",
    "variables": {
      "input": {
        "first_name": "Test",
        "last_name": "Employee",
        "email": "test.employee@example.com",
        "position": "Software Engineer",
        "department_id": "dept-1",
        "hire_date": "2024-01-15",
        "employment_type": "FULL_TIME"
      }
    }
  }'
```

**Update Employee via GraphQL**:
```bash
curl -X POST http://localhost:5173/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-hr-token-67890" \
  -d '{
    "query": "mutation UpdateEmployee($id: ID!, $input: UpdateEmployeeInput!) { updateEmployee(id: $id, input: $input) { id full_name position updated_at } }",
    "variables": {
      "id": "emp-test-123",
      "input": {
        "position": "Senior Software Engineer"
      }
    }
  }'
```

**Validation Checklist**:
- [ ] Employee creation successful
- [ ] All required fields populated
- [ ] Employee update successful
- [ ] Partial updates working correctly
- [ ] Audit logging functional (if implemented)

### 8. Search and Filtering

**Employee Search**:
```bash
curl -X POST http://localhost:5173/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-manager-token-11111" \
  -d '{
    "query": "query SearchEmployees($search: String, $filters: EmployeeFilters) { employees(first: 10, search: $search, filters: $filters) { nodes { id full_name email position department { name } } totalCount } }",
    "variables": {
      "search": "john",
      "filters": {
        "status": "ACTIVE",
        "department_id": "dept-1"
      }
    }
  }'
```

**Validation Checklist**:
- [ ] Search functionality working
- [ ] Filters applied correctly
- [ ] Case-insensitive search
- [ ] Results properly formatted
- [ ] Performance acceptable

## Real-time Features Validation

### 9. Subscription Testing

**Employee Updates Subscription**:
```javascript
// WebSocket connection test (requires WebSocket client)
const ws = new WebSocket('ws://localhost:5173/api/graphql', 'graphql-ws');

ws.onopen = function() {
  // Send connection init
  ws.send(JSON.stringify({
    type: 'connection_init',
    payload: {
      Authorization: 'Bearer mock-admin-token-12345'
    }
  }));
  
  // Subscribe to employee updates
  ws.send(JSON.stringify({
    id: '1',
    type: 'start',
    payload: {
      query: 'subscription { employeeUpdates { type employee { id full_name } timestamp } }'
    }
  }));
};
```

**Validation Checklist**:
- [ ] WebSocket connection established
- [ ] Subscription messages received
- [ ] Real-time updates working
- [ ] Authentication on subscriptions
- [ ] Connection cleanup on disconnect

## Performance Validation

### 10. Query Performance Testing

**Complex Query Performance**:
```bash
time curl -X POST http://localhost:5173/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-admin-token-12345" \
  -d '{
    "query": "query ComplexQuery { departments { id name employees(first: 20) { nodes { id full_name position manager { full_name } performance_reviews { score review_date reviewer { full_name } } } } metrics { total_employees avg_performance_score total_payroll } } }"
  }'
```

**Performance Benchmarks**:
- [ ] Response time < 200ms for simple queries
- [ ] Response time < 500ms for complex queries  
- [ ] Query complexity analysis working
- [ ] Rate limiting functional
- [ ] Memory usage reasonable

### 11. Load Testing

**Concurrent Request Testing**:
```bash
# Simple load test with curl
for i in {1..10}; do
  curl -X POST http://localhost:5173/api/graphql \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer mock-admin-token-12345" \
    -d '{"query": "query { employees(first: 10) { nodes { id full_name } } }"}' &
done
wait
```

**Load Test Checklist**:
- [ ] Server handles concurrent requests
- [ ] No memory leaks observed
- [ ] Response times remain stable
- [ ] Error rates acceptable
- [ ] Rate limiting triggers correctly

## UI Integration Validation

### 12. SvelteKit Page Integration

**Test Server-side GraphQL in +page.server.ts**:

Create test file `/tmp/test-graphql-integration.js`:
```javascript
import { createServerGraphQLClient } from '$lib/graphql/client';

const client = createServerGraphQLClient('mock-admin-token-12345');

// Test employee query
const result = await client.query(`
  query GetEmployees($first: Int) {
    employees(first: $first) {
      nodes {
        id
        full_name
        email
        department {
          name
        }
      }
      totalCount
    }
  }
`, { first: 5 });

console.log('GraphQL Result:', JSON.stringify(result, null, 2));
```

**Validation Checklist**:
- [ ] Server-side GraphQL client working
- [ ] Token authentication functional
- [ ] Data properly formatted for UI
- [ ] Error handling working
- [ ] Loading states handled

## Migration Completion Validation

### 13. Full Application Test

**Complete User Journey**:
1. **Login**: Authenticate user with existing credentials
2. **Dashboard**: Load dashboard with role-appropriate widgets  
3. **Employee List**: Browse employees with search and filtering
4. **Employee Detail**: View detailed employee information
5. **Employee Create**: Add new employee record
6. **Employee Update**: Modify employee information
7. **Department View**: Navigate department hierarchy
8. **Permissions**: Verify RBAC enforcement throughout
9. **Real-time**: Observe live updates in dashboard
10. **Logout**: Clean session termination

**Final Validation Checklist**:
- [ ] All user workflows functional
- [ ] No visible changes to user experience
- [ ] All data accessible and accurate
- [ ] Performance meets or exceeds REST API
- [ ] Error messages user-friendly
- [ ] Authentication seamless
- [ ] RBAC permissions preserved
- [ ] Real-time features working
- [ ] Mobile responsiveness maintained
- [ ] Browser compatibility preserved

## Rollback Procedures

### 14. Emergency Rollback

**If GraphQL migration fails**:

1. **Immediate Rollback**:
   - Revert feature flag to enable REST API
   - Restart application with previous configuration
   - Verify REST API functionality restored

2. **Data Integrity Check**:
   - Compare data state before/after migration
   - Validate no data corruption occurred
   - Restore from backup if necessary

3. **User Communication**:
   - Notify users of temporary service restoration
   - Document issues encountered
   - Plan remediation strategy

## Success Criteria

**Migration is complete when**:
- [ ] All 14 validation sections pass
- [ ] User acceptance testing successful  
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Team training completed
- [ ] Monitoring and alerting configured
- [ ] Rollback procedures tested

---

**Quickstart Status**: ✅ **READY FOR IMPLEMENTATION**  
**All validation procedures defined for ensuring successful GraphQL migration**