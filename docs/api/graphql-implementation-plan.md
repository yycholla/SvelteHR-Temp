# GraphQL Implementation Plan: Replace Mock Data with Real Queries

## Current State Analysis

### Pages Using Mock Data

1. **Goals & OKRs Management** (`/dashboard/management/goals`)
   - Status: Empty arrays, TODO comment present
   - GraphQL File: ✅ `goals-okrs-operations.ts` exists
   - Database Table: ✅ `hr_public.employee_goals` exists

2. **Reports Management** (`/dashboard/management/reports`)
   - Status: Empty arrays, placeholder data
   - GraphQL File: ✅ `reports-operations.ts` exists
   - Database Table: ❓ Need to verify

3. **Management Dashboard** (`/dashboard/management`)
   - Status: Mock analytics data
   - GraphQL File: ✅ Multiple operation files exist
   - Database Tables: ✅ Multiple tables exist

4. **Attendance** (`/dashboard/users/[id]/attendance`)
   - Status: Mock data
   - GraphQL File: ❓ Need to check
   - Database Table: ❓ Need to verify

5. **Admin Pages** (settings, audit, analytics, compliance)
   - Status: Mock/placeholder data
   - GraphQL Files: ✅ Exist
   - Database Tables: ❓ Need to verify

### Existing GraphQL Infrastructure

- ✅ GraphQL client configured (`src/lib/graphql/client.ts`)
- ✅ PostGraphile setup with RLS policies
- ✅ Operation files with queries/mutations defined
- ✅ Database schema with proper tables and relationships

## Implementation Plan

### Phase 1: Database Seeding (Priority: High)

**Goal**: Populate database with realistic mock data for testing

#### Tasks:

1. Create seed script: `migrations/seed-development-data.sql`
2. Seed data for:
   - `hr_public.employee_goals` (goals and OKRs)
   - `hr_public.reports` (report templates and executions)
   - `hr_public.attendance_records` (attendance data)
   - `hr_public.performance_reviews` (performance data)
   - `hr_public.leave_requests` (leave management)
   - `hr_public.tasks` (task assignments)

#### Seed Data Structure:

```sql
-- Example: Goals data
INSERT INTO hr_public.employee_goals (
  id, employee_id, title, description, target_date,
  progress_percentage, status, priority, quarter, year, created_by
) VALUES
  (gen_random_uuid(), '<employee_uuid>', 'Q4 Sales Target', 'Achieve $1M in sales', '2025-12-31', 75, 'active', 'high', 4, 2025, '<manager_uuid>'),
  ...
```

### Phase 2: Update Server Load Functions (Priority: High)

**Goal**: Replace mock data with actual GraphQL queries

#### Files to Update:

1. `/dashboard/management/goals/+page.server.ts`
2. `/dashboard/management/reports/+page.server.ts`
3. `/dashboard/management/+page.server.ts`
4. `/dashboard/users/[id]/attendance/+page.server.ts`
5. Admin pages (`/dashboard/admin/*/+page.server.ts`)

#### Implementation Pattern:

```typescript
// Before (Mock Data):
return {
	teamGoals: [], // TODO: Replace with GraphQL
	goalsAnalytics: {
		/* empty */
	}
};

// After (Real GraphQL):
import { createGraphQLClient } from '$lib/graphql/client';
import { GET_EMPLOYEE_GOALS } from '$lib/graphql/goals-okrs-operations';

export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	const client = createGraphQLClient(fetch);

	// Execute GraphQL query
	const result = await client.query(GET_EMPLOYEE_GOALS, {
		first: 20,
		offset: 0,
		filter: {
			/* ... */
		}
	});

	if (result.error) {
		console.error('GraphQL Error:', result.error);
		return { teamGoals: [], error: result.error };
	}

	return {
		teamGoals: result.data?.employeeGoals?.nodes || [],
		totalGoals: result.data?.employeeGoals?.totalCount || 0
		// ... map other fields
	};
};
```

### Phase 3: Type Safety & Error Handling (Priority: Medium)

**Goal**: Ensure proper TypeScript types and error handling

#### Tasks:

1. Generate TypeScript types from GraphQL schema
2. Add proper error boundaries in components
3. Implement loading states for async data
4. Add retry logic for failed queries

### Phase 4: Testing & Validation (Priority: High)

**Goal**: Verify all pages work with real data

#### Test Cases:

1. ✅ Goals page displays seeded goals
2. ✅ Filtering and sorting works
3. ✅ Create/Update/Delete operations work
4. ✅ RLS policies enforce proper access control
5. ✅ Error states display correctly
6. ✅ Loading states work properly

## Priority Order

### Immediate (Week 1):

1. Create database seed script
2. Implement Goals & OKRs GraphQL integration
3. Implement Reports GraphQL integration

### Short-term (Week 2):

4. Implement Management Dashboard GraphQL integration
5. Implement Attendance GraphQL integration

### Medium-term (Week 3):

6. Implement Admin pages GraphQL integration
7. Add comprehensive error handling
8. Performance optimization

## Database Seed Script Structure

```sql
-- migrations/seed-development-data.sql

-- 1. Goals & OKRs (20-30 records)
-- 2. Reports (10-15 templates, 50+ executions)
-- 3. Attendance (100+ records across employees)
-- 4. Performance Reviews (20-30 reviews)
-- 5. Leave Requests (30-40 requests)
-- 6. Tasks (40-50 tasks)
```

## Success Criteria

- ✅ Zero pages using mock/empty data
- ✅ All GraphQL queries return real database data
- ✅ Proper error handling on all pages
- ✅ Type-safe GraphQL operations
- ✅ RLS policies properly enforced
- ✅ Performance acceptable (<2s page loads)

## Next Steps

1. Get user confirmation on this plan
2. Create the database seed script
3. Begin Phase 1 implementation with Goals page
4. Iterate through remaining pages

## Notes

- All GraphQL operation files already exist - no new queries need to be written
- Database schema is complete - just need to populate with data
- Server load functions need updates - straightforward refactoring
- PostGraphile is properly configured with RLS - security is handled
