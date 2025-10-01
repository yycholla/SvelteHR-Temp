# Quickstart: Replace Placeholder Data with Database Integration

## Overview
This guide validates that all placeholder data has been replaced with real database content and that backend initialization issues are resolved.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20.x and npm installed
- PostgreSQL container running
- PostGraphile backend running on port 4000
- SvelteKit frontend running on port 5173

## Setup Instructions

### 1. Start Backend Services

```bash
# Start PostgreSQL and PostGraphile
docker-compose up -d postgres postgraphile

# Wait for services to initialize (check health)
curl http://localhost:4000/api/health

# Expected response:
# {
#   "status": "healthy",
#   "services": {
#     "database": true,
#     "graphql": true,
#     "auth": true
#   }
# }
```

### 2. Initialize Seed Data

```bash
# Run seed data initialization
npm run seed:init

# Or use GraphQL mutation directly
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { initializeSeedData(config: { users: { min: 40, max: 50 }, departments: { min: 10, max: 15 }, leaveRequests: { min: 30, max: 50 }, performanceReviews: { min: 30, max: 40 }, goals: { min: 40, max: 50 }, generateRelationships: true }) { success message entitiesCreated { users departments total } } }"
  }'
```

### 3. Start Frontend Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Application should be available at http://localhost:5173
```

## Validation Checklist

### ✅ Backend Health Check
1. Navigate to http://localhost:4000/api/health
2. Verify status is "healthy"
3. Confirm all services show `true`

### ✅ Data Loading Verification

#### Dashboard Page
1. Navigate to http://localhost:5173/dashboard
2. Verify:
   - [ ] Employee count shows real number (40-50)
   - [ ] Department count shows real number (10-15)
   - [ ] No "placeholder" or "mock" text visible
   - [ ] Recent activities show actual database records

#### Employee List
1. Navigate to http://localhost:5173/dashboard/employees
2. Verify:
   - [ ] Employee list shows 40-50 records
   - [ ] Each employee has complete profile data
   - [ ] Pagination works correctly
   - [ ] Search/filter functionality works

#### Analytics Dashboard
1. Navigate to http://localhost:5173/dashboard/admin/analytics
2. Verify:
   - [ ] Department distribution shows real data
   - [ ] No hardcoded percentages
   - [ ] Charts display actual metrics
   - [ ] Growth trends calculated from database

#### Management Dashboard
1. Navigate to http://localhost:5173/dashboard/management
2. Verify:
   - [ ] Team statistics from database
   - [ ] No fallback values displayed
   - [ ] Performance metrics calculated correctly

### ✅ Error Handling

#### Backend Unavailable Test
1. Stop PostGraphile: `docker-compose stop postgraphile`
2. Refresh any page
3. Verify:
   - [ ] Error message displays with retry button
   - [ ] Message is user-friendly
   - [ ] Clicking retry attempts to reload

#### Empty Data Test
1. Clear specific entity data: `npm run seed:clear --entity=goals`
2. Navigate to goals page
3. Verify:
   - [ ] "No data available" message shows
   - [ ] Page doesn't break
   - [ ] Other sections still work

### ✅ Backend Initialization

#### Cold Start Test
1. Stop all services: `docker-compose down`
2. Start services: `docker-compose up -d`
3. Immediately navigate to application
4. Verify:
   - [ ] Loading states display appropriately
   - [ ] No HTTP 500 errors
   - [ ] Pages load once backend is ready
   - [ ] No manual intervention required

## Performance Validation

### Query Performance
```bash
# Test GraphQL query performance
npm run test:performance

# Expected results:
# - GraphQL queries < 200ms
# - Page loads < 1 second
# - No N+1 query problems
```

### Data Volume Test
```bash
# Verify minimum data requirements
npm run verify:seed-data

# Should show:
# ✓ Users: 40-50 records
# ✓ Departments: 10-15 records
# ✓ Leave Requests: 30-50 records
# ✓ Performance Reviews: 30-40 records
# ✓ Goals: 40-50 records
```

## E2E Test Suite

```bash
# Run comprehensive E2E tests
npm run test:e2e

# Specific test suites:
npm run test:e2e:dashboard
npm run test:e2e:employees
npm run test:e2e:analytics
```

## Troubleshooting

### Issue: Backend returns 500 errors
**Solution**: Check PostgreSQL is running and migrations are applied
```bash
docker logs postgraphile
npm run migrate:latest
```

### Issue: No data displayed
**Solution**: Verify seed data initialization
```bash
npm run seed:status
npm run seed:init --force
```

### Issue: Slow page loads
**Solution**: Check for missing database indexes
```bash
npm run db:analyze
npm run db:create-indexes
```

## Success Criteria

All the following must be true:
1. ✅ No placeholder or mock data visible on any page
2. ✅ Backend initializes without manual intervention
3. ✅ All pages load data on first attempt after backend starts
4. ✅ Error states show retry button
5. ✅ Empty states show "No data available" for <5 records
6. ✅ 10-50 records per entity type in database
7. ✅ All E2E tests pass
8. ✅ GraphQL queries complete in <200ms
9. ✅ Pages load in <1 second

## Next Steps

After validation:
1. Run production build: `npm run build`
2. Test production build: `npm run preview`
3. Deploy to staging environment
4. Run smoke tests in staging
5. Monitor for any issues

---

*Quickstart validated on 2025-01-23*