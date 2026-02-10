# Hexagonal Architecture Migration Design

**Date**: 2026-02-10
**Author**: Claude Code
**Status**: Approved
**Related Modules**: Department, Goals, Performance Reviews, Tasks

## Executive Summary

This design outlines the migration of 4 HR system modules to hexagonal architecture (ports & adapters pattern), following the established pattern from Employee and LeaveRequest modules. The migration will improve type safety, testability, and maintainability while reducing route complexity by ~50%.

**Modules to Migrate:**

- **Department** (Partial - routes only, 1-2 days)
- **Goals** (Full migration, 3-4 days)
- **Performance Reviews** (Full migration, 5-7 days)
- **Tasks** (Full migration, 7-10 days)

**Total Effort**: 16-23 days (~3-5 weeks)

---

## 1. Architecture Overview & Goals

### Objective

Migrate 4 modules (Department, Performance Reviews, Tasks, Goals) to hexagonal architecture, following the established pattern from Employee and LeaveRequest modules.

### Hexagonal Architecture Pattern

Each module will follow this structure:

**Domain Layer** (`src/domain/<Module>/`)

- Pure TypeScript entities with business logic
- Value objects for type safety (Email, Date, Status, etc.)
- Domain-specific errors with clear error codes
- `Result<T, E>` pattern for type-safe error handling
- Zero external dependencies (no frameworks, no I/O)

**Service Layer** (`src/services/`)

- Orchestrates business workflows
- Depends on repository port (interface, not implementation)
- Enforces cross-entity business rules
- Returns `Result<T, DomainError>` for all operations
- Comprehensive unit tests with mocked repositories

**Adapter Layer** (`src/adapters/`)

- Implements repository port
- Translates GraphQL ↔ Domain entities
- Data sanitization at boundary
- Resilient error handling

**Route Layer** (`src/routes/`)

- Uses service factories: `createXService(event)`
- Minimal logic (auth, params, DTO transformation)
- No direct GraphQL calls

### Benefits

- **Type Safety**: Eliminate `any` types, enforce domain rules at compile time
- **Testability**: Domain/service tests run without I/O (milliseconds)
- **Maintainability**: GraphQL schema changes isolated to adapter
- **Consistency**: Same pattern across all modules

---

## 2. Module Prioritization & Phased Approach

### Priority Order (Recommended)

**Phase 1: Department Module** (Partial Migration - 1-2 days)

- ✅ Domain, Service, Adapter already exist
- ❌ Only routes need refactoring (5 route files)
- **Why first**: Lowest risk, validates route refactoring pattern
- **Impact**: 254 lines → ~150 lines (main route)
- **Benefit**: Quick win, establishes route migration template

**Phase 2: Goals Module** (Full Migration - 3-4 days)

- Simplest candidate (1 route, 242 lines, 2 GraphQL operations)
- Clean domain model (Goal entity, progress tracking)
- **Why second**: Establishes full migration pattern for simple modules
- **Key features**: Goal creation, progress updates, status transitions, analytics

**Phase 3: Performance Reviews Module** (Full Migration - 5-7 days)

- Medium complexity (6 routes, 383 lines, 16 GraphQL operations)
- Rich domain (Review cycles, ratings, feedback, templates)
- **Why third**: More complex domain logic, multiple stakeholders
- **Key features**: Review creation/submission, manager approval, self-assessment, 360° feedback

**Phase 4: Tasks Module** (Full Migration - 7-10 days)

- Highest complexity (10 routes, extensive workflows)
- Complex domain (Task dependencies, assignments, subtasks, hierarchies)
- **Why last**: Most routes, most complex business rules
- **Key features**: Task assignment, dependencies, status workflows, team/department views

### Rollout Strategy

- One module at a time (no parallel work to avoid merge conflicts)
- Each module follows: Domain → Service → Adapter → Routes → Tests
- Deploy after each phase completes (incremental delivery)

---

## 3. Domain Layer Patterns

### Domain Entities

Each module needs these core components:

#### 3.1 Goals Module Domain

```
src/domain/Goal/
├── Goal.ts              // Main entity with business logic
├── GoalStatus.ts        // Value object: draft, active, completed, cancelled
├── GoalPriority.ts      // Value object: low, medium, high, critical
├── GoalProgress.ts      // Value object: 0-100%, validation
├── GoalErrors.ts        // GoalNotFoundError, InvalidProgressError, etc.
└── index.ts             // Exports
```

**Key Behaviors:**

- `Goal.create()` - Factory with validation (title, dates, owner)
- `updateProgress()` - Progress validation, auto-status transitions
- `complete()` - Mark complete, validate 100% progress
- `cancel()` - Allow cancellation with reason
- Immutable updates returning new instances

#### 3.2 Performance Reviews Domain

```
src/domain/PerformanceReview/
├── PerformanceReview.ts     // Main entity
├── ReviewStatus.ts          // draft, pending, submitted, approved, rejected
├── ReviewType.ts            // annual, quarterly, probation, 360
├── Rating.ts                // 1-5 scale with validation
├── ReviewCycle.ts           // Value object for review periods
├── ReviewErrors.ts          // Domain-specific errors
└── index.ts
```

**Key Behaviors:**

- `PerformanceReview.create()` - Initialize review with type/cycle
- `submitForApproval()` - Validate completeness, transition status
- `approve()` / `reject()` - Manager actions with authorization
- `addFeedback()` - Self-assessment, manager comments, peer feedback
- Business rules: Rating validation, required fields, date constraints

#### 3.3 Tasks Domain

```
src/domain/Task/
├── Task.ts              // Main entity
├── TaskStatus.ts        // todo, in_progress, review, blocked, done
├── TaskPriority.ts      // low, medium, high, urgent
├── TaskType.ts          // feature, bug, improvement, documentation
├── TaskAssignment.ts    // Value object for assignee info
├── TaskDependency.ts    // Value object for parent/child relationships
├── TaskErrors.ts        // Domain errors
└── index.ts
```

**Key Behaviors:**

- `Task.create()` - Factory with validation
- `assign()` / `unassign()` - Assignment management
- `updateStatus()` - State machine with valid transitions
- `addSubtask()` - Hierarchy management
- `blockOn()` - Dependency tracking
- Business rules: Circular dependency prevention, status workflows

### Shared Patterns

- All entities use `Result<T, E>` return types
- Immutable entities (return new instances on updates)
- Factory methods for creation with validation
- No I/O operations in domain layer
- Rich domain models with business logic

---

## 4. Service Layer Patterns

### Service Responsibilities

Each service orchestrates business workflows and repository operations:

#### 4.1 GoalService

```typescript
class GoalService {
	constructor(private readonly goalRepository: GoalRepository) {}

	// CRUD Operations
	async getGoalById(id: string): Promise<Result<Goal, DomainError>>;
	async getGoals(filters?: GoalFilters): Promise<Result<GoalListResult, DomainError>>;
	async getGoalsByEmployee(employeeId: string): Promise<Result<Goal[], DomainError>>;
	async getGoalsByTeam(teamId: string): Promise<Result<Goal[], DomainError>>;

	// Business Operations
	async createGoal(data: CreateGoalData): Promise<Result<Goal, DomainError>>;
	async updateGoal(id: string, data: UpdateGoalData): Promise<Result<Goal, DomainError>>;
	async updateProgress(
		id: string,
		progress: number,
		notes?: string
	): Promise<Result<Goal, DomainError>>;
	async completeGoal(id: string, userId: string): Promise<Result<Goal, DomainError>>;
	async cancelGoal(id: string, reason: string): Promise<Result<Goal, DomainError>>;
	async deleteGoal(id: string): Promise<Result<void, DomainError>>;

	// Analytics
	async getGoalStatistics(
		filters?: GoalStatisticsFilters
	): Promise<Result<GoalStatistics, DomainError>>;
	async getProgressTrends(employeeId: string): Promise<Result<ProgressTrend[], DomainError>>;
}
```

#### 4.2 PerformanceReviewService

```typescript
class PerformanceReviewService {
	constructor(private readonly reviewRepository: PerformanceReviewRepository) {}

	// CRUD Operations
	async getReviewById(id: string): Promise<Result<PerformanceReview, DomainError>>;
	async getReviews(filters?: ReviewFilters): Promise<Result<ReviewListResult, DomainError>>;
	async getReviewsByEmployee(employeeId: string): Promise<Result<PerformanceReview[], DomainError>>;
	async getReviewsByManager(managerId: string): Promise<Result<PerformanceReview[], DomainError>>;

	// Business Operations
	async createReview(data: CreateReviewData): Promise<Result<PerformanceReview, DomainError>>;
	async updateReview(
		id: string,
		data: UpdateReviewData
	): Promise<Result<PerformanceReview, DomainError>>;
	async submitForApproval(
		id: string,
		employeeId: string
	): Promise<Result<PerformanceReview, DomainError>>;
	async approveReview(
		id: string,
		managerId: string,
		comments?: string
	): Promise<Result<PerformanceReview, DomainError>>;
	async rejectReview(
		id: string,
		managerId: string,
		reason: string
	): Promise<Result<PerformanceReview, DomainError>>;
	async addFeedback(
		id: string,
		feedback: FeedbackData
	): Promise<Result<PerformanceReview, DomainError>>;

	// Business Rules
	// - Validate review cycle dates
	// - Ensure employee can only submit own reviews
	// - Verify manager authorization
	// - Check review completeness before submission

	// Analytics
	async getReviewStatistics(
		filters?: ReviewStatisticsFilters
	): Promise<Result<ReviewStatistics, DomainError>>;
	async getAverageRatings(employeeId: string): Promise<Result<RatingsSummary, DomainError>>;
}
```

#### 4.3 TaskService

```typescript
class TaskService {
	constructor(private readonly taskRepository: TaskRepository) {}

	// CRUD Operations (similar to above)

	// Task-Specific Operations
	async assignTask(
		id: string,
		assigneeId: string,
		assignedBy: string
	): Promise<Result<Task, DomainError>>;
	async updateStatus(
		id: string,
		status: TaskStatus,
		userId: string
	): Promise<Result<Task, DomainError>>;
	async addSubtask(
		parentId: string,
		subtaskData: CreateTaskData
	): Promise<Result<Task, DomainError>>;
	async linkDependency(taskId: string, dependsOnId: string): Promise<Result<void, DomainError>>;

	// Business Rules
	// - Prevent circular dependencies
	// - Validate status transitions (todo → in_progress → done)
	// - Check assignee exists and has permissions
	// - Enforce parent task must be active for subtasks

	// Views
	async getMyTasks(userId: string): Promise<Result<Task[], DomainError>>;
	async getTeamTasks(teamId: string): Promise<Result<Task[], DomainError>>;
	async getDepartmentTasks(deptId: string): Promise<Result<Task[], DomainError>>;
}
```

#### 4.4 DepartmentService (Already exists)

- No service changes needed
- Routes will use existing `createDepartmentService(event)`

### Service Testing Strategy

- Mock repository for all tests
- Test business rule enforcement
- Test error handling paths
- Target: 100% coverage of service methods
- Each module: 30-50 tests

---

## 5. Adapter Layer Patterns

### Repository Implementation Pattern

Each adapter implements its repository port and handles GraphQL ↔ Domain translation:

#### 5.1 GraphQLGoalAdapter

```typescript
export class GraphQLGoalAdapter implements GoalRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findById(id: string): Promise<Goal | null> {
		const query = `
      query GetGoal($id: UUID!) {
        goal(id: $id) {
          id title description ownerId priority status
          targetDate completionDate progress notes
          createdAt updatedAt
        }
      }
    `;
		const result = await this.graphql.query<{ goal: GraphQLGoal }>(query, { id });
		return result?.goal ? this.mapToDomain(result.goal) : null;
	}

	private mapToDomain(data: GraphQLGoal): Goal | null {
		try {
			const result = Goal.create({
				id: data.id,
				title: data.title,
				description: data.description,
				ownerId: data.ownerId,
				priority: data.priority as GoalPriority,
				status: data.status as GoalStatus,
				targetDate: data.targetDate,
				progress: data.progress ?? 0
			});
			return result.isOk ? result.value : null;
		} catch (error) {
			return null; // Resilient to bad data
		}
	}

	private mapToGraphQL(goal: Goal): GraphQLGoalInput {
		return {
			title: goal.title,
			description: goal.description,
			ownerId: goal.ownerId,
			priority: goal.priority.toString()
		};
	}
}
```

#### 5.2 GraphQLPerformanceReviewAdapter

- Similar structure with 14+ repository methods
- Complex mapping for ratings, feedback, review cycles
- Handles nested data structures (multiple ratings, feedback collections)

#### 5.3 GraphQLTaskAdapter

- Complex mapping for task hierarchies (parent/child relationships)
- Dependency graph handling
- Recursive subtask mapping
- Circular dependency validation

#### 5.4 GraphQLDepartmentAdapter (Already exists)

- No changes needed
- Already implements DepartmentRepository port

### Adapter Key Principles

- **Resilient Mapping**: Return `null` for invalid data instead of throwing
- **Plain Strings**: Use template strings, not `gql` tags (GraphQLPort expects strings)
- **Page-Based Pagination**: Calculate `offset = (page - 1) * limit`
- **Data Sanitization**: Validate/clean data at the boundary
- **Error Logging**: Log mapping errors for debugging

---

## 6. Route Refactoring Patterns

### Route Migration Template

**Before (Direct GraphQL):**

```typescript
// 200-400 lines with inline GraphQL
export const load: PageServerLoad = async (event) => {
	const loader = new RBACDataLoader(event, ['goals:read']);

	return loader.loadWithClient(async (client) => {
		const query = `query GetGoals { goals { id title } }`;
		const result = await client.query(query, { limit: 1000 });
		// 50+ lines of data transformation, filtering, pagination
		return { goals: result.data.goals };
	});
};
```

**After (Service Layer):**

```typescript
// 80-150 lines, clean separation
export const load: PageServerLoad = async (event) => {
	const loader = new RBACDataLoader(event, ['goals:read']);

	return loader.loadWithClient(async () => {
		const { locals, url } = event;
		const params = new QueryParamExtractor(url);
		const { page, limit } = params.getPagination(20);
		const statusFilter = params.getString('status');

		const service = createGoalService(event);
		const result = await service.getGoals({
			status: statusFilter || undefined,
			page,
			limit
		});

		if (result.isError) {
			return { goals: [], error: result.error.message };
		}

		const goals = result.value.items.map((goal) => ({
			id: goal.id,
			title: goal.title,
			status: goal.status.toString(),
			progress: goal.progress
		}));

		return { goals, total: result.value.total };
	});
};
```

### Route Refactoring Checklist

**For Each Route File:**

1. **Replace GraphQL with Service**
   - Import: `import { createXService } from '$lib/server/services'`
   - Remove: All `gql` queries/mutations
   - Replace: `client.query()` → `service.methodName()`

2. **Simplify Data Flow**
   - Remove: Complex GraphQL query building
   - Remove: Manual client-side filtering (move to service/adapter)
   - Keep: Pagination logic (transform page/limit)
   - Keep: RBAC checks using RBACDataLoader

3. **Handle Results**
   - Check: `result.isError` / `result.isOk`
   - Log: Errors with context
   - Return: Empty states or error messages on failure

4. **Transform DTOs**
   - Map domain entities to serializable DTOs
   - Extract primitive values (don't serialize value objects directly)
   - Handle nested objects (employee info, manager info)

5. **Update Actions**
   - Form submissions use service methods
   - Validate input before calling service
   - Return appropriate fail() responses

### Route Refactoring by Module

**Phase 1: Department Routes** (5 files)

- `src/routes/dashboard/departments/+page.server.ts` (254 lines)
- `src/routes/dashboard/departments/[id]/+page.server.ts`
- `src/routes/dashboard/departments/[id]/edit/+page.server.ts`
- `src/routes/dashboard/departments/new/+page.server.ts`
- `src/routes/departments/+page.server.ts` (public view)

**Phase 2: Goals Routes** (1 file)

- `src/routes/dashboard/management/goals/+page.server.ts` (242 lines)

**Phase 3: Performance Reviews Routes** (6 files)

- `src/routes/dashboard/reviews/+page.server.ts` (383 lines)
- `src/routes/dashboard/reviews/[id]/+page.server.ts`
- `src/routes/dashboard/reviews/create/+page.server.ts`
- `src/routes/dashboard/management/reviews/+page.server.ts`
- `src/routes/dashboard/profile/performance/reviews/+page.server.ts`
- `src/routes/dashboard/users/[id]/performance/reviews/+page.server.ts`

**Phase 4: Tasks Routes** (10 files)

- `src/routes/dashboard/tasks/+page.server.ts` (355 lines)
- `src/routes/dashboard/tasks/[id]/+page.server.ts`
- `src/routes/dashboard/tasks/[id]/edit/+page.server.ts`
- `src/routes/dashboard/tasks/create/+page.server.ts`
- `src/routes/dashboard/tasks/new/+page.server.ts`
- `src/routes/dashboard/tasks/my-tasks/+page.server.ts`
- `src/routes/dashboard/tasks/team-tasks/+page.server.ts`
- `src/routes/dashboard/tasks/department/+page.server.ts`
- `src/routes/dashboard/tasks/my-tasks/design-preview/+page.server.ts`
- `src/routes/dashboard/profile/tasks/+page.server.ts`

### Expected Line Reduction

- Department: 254 → ~130 lines (49% reduction)
- Goals: 242 → ~120 lines (50% reduction)
- Reviews: 383 → ~180 lines (53% reduction)
- Tasks: 355 → ~170 lines (52% reduction)

**Total**: ~1,234 lines → ~600 lines across main routes

---

## 7. Testing Strategy

### Testing Pyramid for Each Module

#### Layer 1: Domain Tests (Fast, Isolated)

```typescript
// src/domain/Goal/Goal.test.ts
describe('Goal Entity', () => {
	describe('create', () => {
		it('should create valid goal with required fields');
		it('should reject goal with invalid title');
		it('should reject goal with past target date');
	});

	describe('updateProgress', () => {
		it('should update progress and auto-complete at 100%');
		it('should reject invalid progress values');
	});

	// 15-25 tests per entity
	// Target: 100% coverage of domain logic
});
```

#### Layer 2: Service Tests (Mocked Repository)

```typescript
// src/services/GoalService.test.ts
describe('GoalService', () => {
	let service: GoalService;
	let mockRepository: MockGoalRepository;

	beforeEach(() => {
		mockRepository = {
			/* mock all 14 methods */
		};
		service = new GoalService(mockRepository);
	});

	describe('createGoal', () => {
		it('should create goal with valid data');
		it('should reject duplicate goals for same employee');
	});

	// 30-50 tests per service
	// Cover all methods, error paths, business rules
});
```

#### Layer 3: Integration Tests (Real GraphQL)

```typescript
// src/adapters/GraphQLGoalAdapter.test.ts
describe('GraphQLGoalAdapter Integration', () => {
	it('should fetch goal from GraphQL and map to domain');
	it('should return null for invalid GraphQL data');

	// 20-30 tests per adapter
	// Focus on mapping correctness
});
```

#### Layer 4: E2E Tests (Playwright)

```typescript
// tests/e2e/management/goals.spec.ts
test.describe('Goals Management', () => {
	test('should display goals dashboard');
	test('should create new goal');

	// 10-15 E2E tests per module
	// Focus on critical user flows
});
```

### Test Coverage Targets

**Per Module:**

- Domain Layer: **100%** coverage (pure logic, no I/O)
- Service Layer: **95%+** coverage (all methods, error paths)
- Adapter Layer: **85%+** coverage (mapping logic)
- Route Layer: **E2E coverage** (critical flows)

**Test Counts (Estimated):**

- Goals: ~80 tests (20 domain + 40 service + 20 adapter)
- Reviews: ~120 tests (30 domain + 60 service + 30 adapter)
- Tasks: ~150 tests (40 domain + 70 service + 40 adapter)
- Department: ~30 tests (route refactoring only)

**Total New Tests: ~380 tests**

### Testing Workflow

1. Write domain tests first (TDD for entities)
2. Write service tests with mocked repository
3. Write adapter integration tests
4. Update/add E2E tests for critical flows
5. Run all tests before committing each phase

---

## 8. Implementation Timeline & Rollout Plan

### Phase-by-Phase Breakdown

**Phase 1: Department Module (Route Refactoring Only)**

- **Duration**: 1-2 days
- **Work Items**:
  - Day 1: Refactor 5 route files to use existing DepartmentService
  - Day 2: Add route-level tests, verify TypeScript compilation
- **Deliverables**:
  - 5 refactored routes (~400 lines reduced to ~200)
  - TypeScript compilation passing
  - Existing E2E tests passing
- **Risk**: Low (service already exists)

**Phase 2: Goals Module (Full Migration)**

- **Duration**: 3-4 days
- **Work Items**:
  - Day 1: Domain layer (Goal entity, value objects, errors, 20 tests)
  - Day 2: Service layer (GoalService, repository port, 40 tests)
  - Day 3: Adapter layer (GraphQLGoalAdapter, 20 tests)
  - Day 4: Route refactoring (1 route), integration testing
- **Deliverables**:
  - Complete hexagonal architecture for Goals
  - ~80 tests passing
  - 1 route refactored (242 → ~120 lines)
  - Factory function in ServiceContainer
- **Risk**: Low-Medium (simple domain model)

**Phase 3: Performance Reviews Module (Full Migration)**

- **Duration**: 5-7 days
- **Work Items**:
  - Day 1-2: Domain layer (PerformanceReview, ReviewCycle, Rating, Feedback, 30 tests)
  - Day 3-4: Service layer (PerformanceReviewService, complex workflows, 60 tests)
  - Day 5: Adapter layer (GraphQLPerformanceReviewAdapter, nested mapping, 30 tests)
  - Day 6-7: Route refactoring (6 routes), E2E testing
- **Deliverables**:
  - Complete hexagonal architecture for Reviews
  - ~120 tests passing
  - 6 routes refactored (~2,300 lines → ~1,000 lines)
  - Manager approval workflows tested
- **Risk**: Medium (complex domain, multiple stakeholders)

**Phase 4: Tasks Module (Full Migration)**

- **Duration**: 7-10 days
- **Work Items**:
  - Day 1-2: Domain layer (Task, TaskDependency, hierarchy logic, 40 tests)
  - Day 3-5: Service layer (TaskService, dependency validation, 70 tests)
  - Day 6-7: Adapter layer (GraphQLTaskAdapter, recursive mapping, 40 tests)
  - Day 8-10: Route refactoring (10 routes), extensive E2E testing
- **Deliverables**:
  - Complete hexagonal architecture for Tasks
  - ~150 tests passing
  - 10 routes refactored (~3,500 lines → ~1,700 lines)
  - All task workflows tested (my-tasks, team-tasks, dependencies)
- **Risk**: High (most complex, circular dependency prevention, extensive routes)

### Total Timeline: 16-23 days (~3-5 weeks)

### Rollout Strategy

**Deployment Approach:**

- Deploy after each phase completes (4 incremental deployments)
- No feature flags needed (backward compatible refactoring)
- Monitor error logs for domain/service errors after each deployment

**Quality Gates (Before Each Deployment):**

1. ✅ All new tests passing (domain, service, adapter)
2. ✅ All existing tests passing (no regressions)
3. ✅ TypeScript compilation successful (no type errors)
4. ✅ `mise run check` passing (Svelte/TS validation)
5. ✅ Manual smoke test of refactored routes
6. ✅ Git commit with comprehensive message

### Migration Checklist (Per Module)

```
□ Domain Layer
  □ Entity created with business logic
  □ Value objects created
  □ Domain errors defined
  □ Domain tests written and passing (20-40 tests)

□ Service Layer
  □ Service class created with all operations
  □ Repository port interface defined
  □ Service tests written and passing (30-70 tests)
  □ Exported from services/index.ts

□ Adapter Layer
  □ GraphQL adapter implements repository port
  □ Domain ↔ GraphQL mapping functions
  □ Adapter tests written and passing (20-40 tests)
  □ Exported from adapters/index.ts

□ Factory & Container
  □ Factory function created (createXService)
  □ Added to ServiceContainer
  □ Exported from lib/server/services.ts

□ Route Refactoring
  □ All route files updated to use service
  □ Direct GraphQL removed
  □ DTOs properly serialized
  □ Error handling implemented

□ Testing & Validation
  □ E2E tests updated/passing
  □ TypeScript compilation successful
  □ No console errors in dev mode
  □ Code review completed

□ Documentation
  □ Update MEMORY.md with learnings
  □ Commit with descriptive message
```

### Success Metrics

**Code Quality:**

- Route line reduction: ~50% (2,400 lines → ~1,200 lines)
- Test coverage: Domain 100%, Service 95%+, Adapter 85%+
- Zero `any` types in new code
- All TypeScript strict checks passing

**Maintainability:**

- GraphQL changes isolated to adapters
- Business logic centralized in domain/service layers
- Consistent patterns across all modules
- Comprehensive test coverage enables safe refactoring

**Performance:**

- No performance degradation (service layer adds minimal overhead)
- Tests run faster (domain/service tests are milliseconds)

---

## 9. Risk Mitigation

### Identified Risks

**Technical Risks:**

1. **Complex Domain Logic** (Reviews, Tasks)
   - Mitigation: Start with simpler Goals module to validate pattern
   - Use existing Employee/LeaveRequest as reference

2. **GraphQL Schema Changes**
   - Mitigation: Adapters isolate changes, comprehensive adapter tests
   - Monitor error logs after deployment

3. **Test Coverage Gaps**
   - Mitigation: Write tests before implementation (TDD)
   - Require 95%+ coverage before merge

**Process Risks:**

1. **Scope Creep**
   - Mitigation: Strict adherence to hexagonal pattern, no feature additions
   - Focus on refactoring existing functionality only

2. **Merge Conflicts**
   - Mitigation: One module at a time, frequent commits
   - Deploy after each phase

3. **Authentication System Changes**
   - Mitigation: Auth system being rebuilt separately (JWT transition)
   - This refactoring is independent of auth changes

---

## 10. Next Steps

1. **Design Approval** ✅ (Approved 2026-02-10)
2. **Create Implementation Plan** (Next: Use superpowers:writing-plans skill)
3. **Begin Phase 1** (Department route refactoring)
4. **Iterative delivery** (Deploy after each phase)

---

## Appendix A: Reference Implementations

**Completed Modules (Reference):**

- Employee Module: `src/domain/Employee/`, `src/services/EmployeeService.ts`, `src/adapters/GraphQLEmployeeAdapter.ts`
- LeaveRequest Module: `src/domain/LeaveRequest/`, `src/services/LeaveRequestService.ts`, `src/adapters/GraphQLLeaveRequestAdapter.ts`

**Key Files:**

- Result pattern: `src/domain/Result.ts`
- Domain errors: `src/domain/errors.ts`
- Service container: `src/lib/server/services.ts`
- GraphQL client: `src/lib/graphql/client.ts`

---

## Document History

| Date       | Version | Author      | Changes                 |
| ---------- | ------- | ----------- | ----------------------- |
| 2026-02-10 | 1.0     | Claude Code | Initial design document |
