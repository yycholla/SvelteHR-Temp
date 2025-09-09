# Quickstart Guide: GraphQL Integration

**Feature**: 003-graphql-we-need  
**Date**: 2025-09-09  
**Prerequisites**: GelDB running, existing SvelteKit app

## Quick Setup (5 minutes)

### 1. Environment Setup
```bash
# Ensure GelDB is running
make db-health

# Install additional dependencies (if needed)
npm install @graphql-codegen/cli @graphql-codegen/typescript
npm install @graphql-codegen/typescript-operations
npm install @graphql-codegen/typed-document-node
```

### 2. Generate GraphQL Types
```bash
# Generate TypeScript types from schema
npm run codegen

# Verify generated files
ls -la src/lib/generated/
```

### 3. Create Your First GraphQL Query
```typescript
// src/routes/employees/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
  const token = cookies.get('hr_token');
  
  const query = `
    query GetEmployees($limit: Int) {
      employees(limit: $limit) {
        nodes {
          id
          firstName
          lastName
          email
          department {
            name
          }
        }
        totalCount
      }
    }
  `;

  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query,
      variables: { limit: 10 }
    })
  });

  const { data } = await response.json();
  return {
    employees: data.employees
  };
};
```

### 4. Display Data in Svelte Component
```svelte
<!-- src/routes/employees/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  $: employees = data.employees.nodes;
</script>

<h1>Employees ({data.employees.totalCount})</h1>

<div class="employee-grid">
  {#each employees as employee (employee.id)}
    <div class="employee-card">
      <h3>{employee.firstName} {employee.lastName}</h3>
      <p>{employee.email}</p>
      {#if employee.department}
        <span class="department">{employee.department.name}</span>
      {/if}
    </div>
  {/each}
</div>
```

## Validation Steps

### Test 1: Basic Query Execution
```bash
# Should return employee data
curl -X POST http://localhost:5173/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "query { employees(limit: 1) { nodes { id firstName } } }"
  }'
```

**Expected Result**: JSON response with employee data
**Success Criteria**: Response time < 200ms, valid data structure

### Test 2: Type Safety Validation
```typescript
// src/lib/test-types.ts
import type { Employee, Department } from '$lib/generated/graphql';

// This should compile without errors
const employee: Employee = {
  id: '123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  // ... other required fields
};
```

**Expected Result**: No TypeScript compilation errors
**Success Criteria**: Full type safety across all operations

### Test 3: Authentication Integration
```bash
# Should fail without token
curl -X POST http://localhost:5173/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { me { id firstName } }"}'
```

**Expected Result**: 401 Unauthorized error
**Success Criteria**: Proper authentication enforcement

### Test 4: Real-time Subscription (Future)
```typescript
// Will be implemented in Phase 2
const subscription = `
  subscription {
    employeeUpdated {
      id
      firstName
      lastName
    }
  }
`;
```

**Expected Result**: Real-time updates when employee data changes
**Success Criteria**: Sub-second update delivery

## Development Workflow

### 1. Schema Changes
1. Update GelDB schema files
2. Apply migrations: `make schema-apply`
3. Regenerate types: `npm run codegen`
4. Update queries to use new fields

### 2. Adding New Queries
1. Define query in `.graphql` file
2. Add to appropriate component or page
3. Run type generation
4. Implement with full type safety

### 3. Testing Queries
1. Use GraphQL playground (development)
2. Write contract tests for new queries
3. Validate with integration tests
4. Performance test with realistic data

## Performance Benchmarks

### Response Time Targets
- Simple queries (single entity): < 50ms
- Complex queries (with joins): < 200ms
- Paginated queries: < 100ms
- Real-time subscriptions: < 10ms latency

### Caching Expectations
- Repeated queries: < 10ms (cache hit)
- Cache invalidation: < 5ms
- Memory usage: < 100MB for cache

### Concurrent User Support
- 50 concurrent users: < 200ms p95
- 100 concurrent users: < 500ms p95
- Query batching: 5-10 queries per batch

## Troubleshooting

### Common Issues

**Issue**: GraphQL types not generated
```bash
# Solution: Check codegen configuration
cat codegen.yml
npm run codegen -- --debug
```

**Issue**: Authentication errors
```bash
# Solution: Verify token in request
# Check server logs for auth details
make db-logs
```

**Issue**: Query too complex
```bash
# Solution: Simplify query or increase limits
# Check query complexity in response
```

**Issue**: Slow query performance
```bash
# Solution: Add indexes, optimize query
# Check GelDB query plans
```

### Debug Tools

**GraphQL Dev Tools**: Browser extension for query inspection
**Network Tab**: Monitor request/response times
**Server Logs**: Check GelDB query execution
**Performance Profiler**: Identify bottlenecks

## Next Steps

1. **Phase 1**: Basic CRUD operations
2. **Phase 2**: Real-time subscriptions
3. **Phase 3**: Advanced caching
4. **Phase 4**: Performance optimization

## Success Criteria Checklist

- [ ] GraphQL endpoint responding
- [ ] Type generation working
- [ ] Authentication enforced
- [ ] Basic queries functional
- [ ] Error handling implemented
- [ ] Performance targets met
- [ ] Integration tests passing
- [ ] Documentation complete

## Getting Help

- Check `/specs/003-graphql-we-need/` documentation
- Review contract tests for examples
- Monitor performance metrics
- Test with realistic data volumes

This quickstart should have you querying GraphQL data in under 10 minutes!