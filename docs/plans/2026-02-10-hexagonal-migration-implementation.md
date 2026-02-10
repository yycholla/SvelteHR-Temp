# Hexagonal Architecture Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Department, Goals, Performance Reviews, and Tasks modules to hexagonal architecture following the established Employee/LeaveRequest pattern.

**Architecture:** Four-phase incremental migration with Domain → Service → Adapter → Routes → Tests workflow. Each phase deploys independently to production. Follows ports & adapters pattern with Result<T,E> error handling and comprehensive testing (380 new tests total).

**Tech Stack:** TypeScript 5, Vitest 3.2.3, SvelteKit 2.43+, GraphQL (urql), Hexagonal Architecture (DDD)

**Reference Implementations:**

- Employee Module: `src/domain/Employee/`, `src/services/EmployeeService.ts`, `src/adapters/GraphQLEmployeeAdapter.ts`
- LeaveRequest Module: `src/domain/LeaveRequest/`, `src/services/LeaveRequestService.ts`, `src/adapters/GraphQLLeaveRequestAdapter.ts`

---

## Phase 1: Department Module (Route Refactoring Only)

**Duration:** 1-2 days
**Goal:** Refactor 5 department routes to use existing DepartmentService, validating the route migration pattern.

### Task 1.1: Refactor Main Departments Route

**Files:**

- Modify: `src/routes/dashboard/departments/+page.server.ts` (254 lines → ~130 lines)
- Reference: `src/services/DepartmentService.ts` (already exists)
- Reference: `src/routes/dashboard/management/leave-approvals/+page.server.ts` (refactored route example)

**Step 1: Create backup of original route**

```bash
cp src/routes/dashboard/departments/+page.server.ts src/routes/dashboard/departments/+page.server.ts.backup
```

**Step 2: Read existing route to understand current structure**

Read: `src/routes/dashboard/departments/+page.server.ts` (lines 1-100)
Note: GraphQL queries, filters, pagination logic

**Step 3: Read DepartmentService to understand available methods**

Read: `src/services/DepartmentService.ts`
Note: getDepartments(), getDepartmentById(), createDepartment(), updateDepartment(), deleteDepartment()

**Step 4: Refactor load function to use service**

Replace direct GraphQL with:

```typescript
export const load: PageServerLoad = async (event) => {
	const { url } = event;
	const loader = new RBACDataLoader(event, ['departments:read', 'departments:read:all']);

	return loader.loadWithClient(async () => {
		const { locals } = event;
		const params = new QueryParamExtractor(url);
		const { page, limit } = params.getPagination(20);

		// Use service layer
		const service = createDepartmentService(event);
		const result = await service.getDepartments({
			page,
			limit
		});

		if (result.isError) {
			logger.error('Failed to load departments', result.error);
			return {
				departments: [],
				total: 0,
				error: result.error.message
			};
		}

		// Transform domain entities to DTOs
		const departments = result.value.items.map((dept) => ({
			id: dept.id,
			name: dept.name,
			description: dept.description || '',
			managerId: dept.managerId,
			parentDepartmentId: dept.parentDepartmentId,
			createdAt: dept.createdAt,
			updatedAt: dept.updatedAt
		}));

		return {
			user: {
				id: locals.user?.id || '',
				email: locals.user?.email || '',
				role: locals.user?.role || 'employee'
			},
			departments,
			total: result.value.total,
			pagination: {
				page,
				limit,
				total: result.value.total,
				totalPages: Math.ceil(result.value.total / limit)
			}
		};
	});
};
```

**Step 5: Update imports**

Add:

```typescript
import { createDepartmentService } from '$lib/server/services';
import { logger } from '$lib/utils/logger';
```

Remove:

```typescript
// Remove any direct GraphQL client imports if present
// Remove gql template tag imports
```

**Step 6: Verify TypeScript compilation**

Run: `npm run check`
Expected: No TypeScript errors

**Step 7: Test route manually**

Run: `mise run dev`
Navigate to: `http://localhost:5173/dashboard/departments`
Expected: Page loads with departments list

**Step 8: Commit refactored route**

```bash
git add src/routes/dashboard/departments/+page.server.ts
git commit -m "refactor(routes): migrate departments main route to service layer

Replace direct GraphQL queries with DepartmentService.
Reduced from 254 to ~130 lines (49% reduction).
Follows established LeaveRequest route pattern."
```

### Task 1.2: Refactor Department Detail Route

**Files:**

- Modify: `src/routes/dashboard/departments/[id]/+page.server.ts`

**Step 1: Read current implementation**

Read: `src/routes/dashboard/departments/[id]/+page.server.ts`
Note: Single department fetch logic

**Step 2: Refactor load function**

```typescript
export const load: PageServerLoad = async (event) => {
	const { params } = event;
	const loader = new RBACDataLoader(event, ['departments:read']);

	return loader.loadWithClient(async () => {
		const service = createDepartmentService(event);
		const result = await service.getDepartmentById(params.id);

		if (result.isError) {
			logger.error('Department not found', result.error);
			throw error(404, 'Department not found');
		}

		const dept = result.value;

		return {
			department: {
				id: dept.id,
				name: dept.name,
				description: dept.description || '',
				managerId: dept.managerId,
				parentDepartmentId: dept.parentDepartmentId,
				createdAt: dept.createdAt,
				updatedAt: dept.updatedAt
			}
		};
	});
};
```

**Step 3: Verify and commit**

Run: `npm run check`
Test: Navigate to department detail page
Commit:

```bash
git add src/routes/dashboard/departments/[id]/+page.server.ts
git commit -m "refactor(routes): migrate department detail route to service layer"
```

### Task 1.3: Refactor Department Edit Route

**Files:**

- Modify: `src/routes/dashboard/departments/[id]/edit/+page.server.ts`

**Step 1: Refactor load and actions**

```typescript
export const load: PageServerLoad = async (event) => {
	// Same as Task 1.2
};

export const actions: Actions = {
	default: async (event) => {
		const { params, request, locals } = event;
		if (!locals.user?.id) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;

		const service = createDepartmentService(event);
		const result = await service.updateDepartment(params.id, {
			name,
			description
		});

		if (result.isError) {
			return fail(400, { message: result.error.message });
		}

		return { success: true, department: result.value };
	}
};
```

**Step 2: Verify and commit**

Run: `npm run check`
Test: Edit department form
Commit:

```bash
git add src/routes/dashboard/departments/[id]/edit/+page.server.ts
git commit -m "refactor(routes): migrate department edit route to service layer"
```

### Task 1.4: Refactor Department Create Route

**Files:**

- Modify: `src/routes/dashboard/departments/new/+page.server.ts`

**Step 1: Refactor actions**

```typescript
export const actions: Actions = {
	default: async (event) => {
		const { request, locals } = event;
		if (!locals.user?.id) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const managerId = formData.get('managerId') as string | null;
		const parentDepartmentId = formData.get('parentDepartmentId') as string | null;

		const service = createDepartmentService(event);
		const result = await service.createDepartment({
			name,
			description: description || undefined,
			managerId: managerId || undefined,
			parentDepartmentId: parentDepartmentId || undefined
		});

		if (result.isError) {
			return fail(400, { message: result.error.message });
		}

		return { success: true, department: result.value };
	}
};
```

**Step 2: Verify and commit**

Run: `npm run check`
Test: Create department form
Commit:

```bash
git add src/routes/dashboard/departments/new/+page.server.ts
git commit -m "refactor(routes): migrate department create route to service layer"
```

### Task 1.5: Refactor Public Departments Route

**Files:**

- Modify: `src/routes/departments/+page.server.ts`

**Step 1: Refactor (similar to Task 1.1 but simpler)**

```typescript
export const load: PageServerLoad = async (event) => {
	const service = createDepartmentService(event);
	const result = await service.getDepartments({ limit: 100 });

	if (result.isError) {
		return { departments: [] };
	}

	return {
		departments: result.value.items.map((dept) => ({
			id: dept.id,
			name: dept.name,
			description: dept.description || ''
		}))
	};
};
```

**Step 2: Verify and commit**

Run: `npm run check`
Commit:

```bash
git add src/routes/departments/+page.server.ts
git commit -m "refactor(routes): migrate public departments route to service layer"
```

### Task 1.6: Clean Up and Final Testing

**Step 1: Remove backup files**

```bash
rm src/routes/dashboard/departments/+page.server.ts.backup
```

**Step 2: Run full test suite**

Run: `npm run test:unit`
Expected: All existing tests pass

**Step 3: Run TypeScript check**

Run: `mise run check`
Expected: No errors

**Step 4: Manual smoke test**

Test all department routes:

- List departments
- View department detail
- Edit department
- Create new department
- Public departments page

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore(phase1): complete department route refactoring

All 5 department routes now use DepartmentService.
Route line reduction: ~400 lines → ~200 lines (50%).
All TypeScript checks passing.
Manual testing verified."
```

---

## Phase 2: Goals Module (Full Migration)

**Duration:** 3-4 days
**Goal:** Implement complete hexagonal architecture for Goals module with domain, service, adapter, and route layers.

### Task 2.1: Create Goal Domain Entity

**Files:**

- Create: `src/domain/Goal/Goal.ts`
- Create: `src/domain/Goal/Goal.test.ts`

**Step 1: Write failing domain test**

Create `src/domain/Goal/Goal.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Goal } from './Goal';

describe('Goal Entity', () => {
	describe('create', () => {
		it('should create valid goal with required fields', () => {
			const result = Goal.create({
				title: 'Complete Q1 Objectives',
				ownerId: 'emp-123',
				targetDate: '2026-06-30'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.title).toBe('Complete Q1 Objectives');
			expect(result.value.ownerId).toBe('emp-123');
		});

		it('should reject goal with empty title', () => {
			const result = Goal.create({
				title: '',
				ownerId: 'emp-123',
				targetDate: '2026-06-30'
			});

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_GOAL_TITLE');
		});

		it('should reject goal with past target date', () => {
			const result = Goal.create({
				title: 'Past Goal',
				ownerId: 'emp-123',
				targetDate: '2020-01-01'
			});

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_TARGET_DATE');
		});
	});

	describe('updateProgress', () => {
		it('should update progress to valid value', () => {
			const goal = Goal.create({
				title: 'Test Goal',
				ownerId: 'emp-123',
				targetDate: '2026-06-30'
			}).value;

			const result = goal.updateProgress(75);

			expect(result.isOk).toBe(true);
			expect(result.value.progress).toBe(75);
		});

		it('should auto-complete goal at 100% progress', () => {
			const goal = Goal.create({
				title: 'Test Goal',
				ownerId: 'emp-123',
				targetDate: '2026-06-30'
			}).value;

			const result = goal.updateProgress(100);

			expect(result.isOk).toBe(true);
			expect(result.value.progress).toBe(100);
			expect(result.value.status.toString()).toBe('completed');
		});

		it('should reject invalid progress values', () => {
			const goal = Goal.create({
				title: 'Test Goal',
				ownerId: 'emp-123',
				targetDate: '2026-06-30'
			}).value;

			const result = goal.updateProgress(-10);

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_PROGRESS');
		});
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:unit src/domain/Goal/Goal.test.ts`
Expected: FAIL - Module './Goal' not found

**Step 3: Create Goal entity with minimal implementation**

Create `src/domain/Goal/Goal.ts`:

```typescript
import { Result, type DomainError } from '../Result';
import { GoalStatus } from './GoalStatus';
import { GoalPriority } from './GoalPriority';
import { InvalidGoalTitleError, InvalidTargetDateError, InvalidProgressError } from './GoalErrors';

export interface CreateGoalData {
	id?: string;
	title: string;
	description?: string;
	ownerId: string;
	targetDate: string;
	priority?: string;
	status?: string;
	progress?: number;
	notes?: string;
	createdAt?: string;
	updatedAt?: string;
	completionDate?: string;
}

export class Goal {
	private constructor(
		public readonly id: string,
		public readonly title: string,
		public readonly description: string,
		public readonly ownerId: string,
		public readonly targetDate: string,
		public readonly priority: GoalPriority,
		public readonly status: GoalStatus,
		public readonly progress: number,
		public readonly notes: string,
		public readonly createdAt: string,
		public readonly updatedAt: string,
		public readonly completionDate: string | null
	) {}

	static create(data: CreateGoalData): Result<Goal, DomainError> {
		// Validate title
		if (!data.title || data.title.trim().length === 0) {
			return Result.error(new InvalidGoalTitleError());
		}

		// Validate target date (must be in future)
		const targetDate = new Date(data.targetDate);
		const now = new Date();
		if (targetDate < now) {
			return Result.error(new InvalidTargetDateError('Target date must be in the future'));
		}

		const id = data.id || crypto.randomUUID();
		const priority = GoalPriority.fromString(data.priority || 'medium');
		const status = GoalStatus.fromString(data.status || 'draft');
		const progress = data.progress ?? 0;
		const now_iso = new Date().toISOString();

		return Result.ok(
			new Goal(
				id,
				data.title.trim(),
				data.description || '',
				data.ownerId,
				data.targetDate,
				priority,
				status,
				progress,
				data.notes || '',
				data.createdAt || now_iso,
				data.updatedAt || now_iso,
				data.completionDate || null
			)
		);
	}

	updateProgress(newProgress: number): Result<Goal, DomainError> {
		// Validate progress range
		if (newProgress < 0 || newProgress > 100) {
			return Result.error(new InvalidProgressError(newProgress));
		}

		// Auto-complete at 100%
		const newStatus = newProgress === 100 ? GoalStatus.COMPLETED : this.status;
		const completionDate = newProgress === 100 ? new Date().toISOString() : this.completionDate;

		return Result.ok(
			new Goal(
				this.id,
				this.title,
				this.description,
				this.ownerId,
				this.targetDate,
				this.priority,
				newStatus,
				newProgress,
				this.notes,
				this.createdAt,
				new Date().toISOString(),
				completionDate
			)
		);
	}

	complete(): Result<Goal, DomainError> {
		return this.updateProgress(100);
	}

	cancel(reason: string): Result<Goal, DomainError> {
		const newNotes = `${this.notes}\n\nCancelled: ${reason}`;
		return Result.ok(
			new Goal(
				this.id,
				this.title,
				this.description,
				this.ownerId,
				this.targetDate,
				this.priority,
				GoalStatus.CANCELLED,
				this.progress,
				newNotes,
				this.createdAt,
				new Date().toISOString(),
				null
			)
		);
	}
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:unit src/domain/Goal/Goal.test.ts`
Expected: FAIL - GoalStatus not found (we'll create it next)

**Step 5: Commit initial Goal entity structure**

```bash
git add src/domain/Goal/Goal.ts src/domain/Goal/Goal.test.ts
git commit -m "feat(domain): add Goal entity with basic validation

Add Goal entity with create factory method.
Implement progress tracking with auto-completion.
Add 4 initial tests (currently failing - need value objects)."
```

### Task 2.2: Create Goal Value Objects

**Files:**

- Create: `src/domain/Goal/GoalStatus.ts`
- Create: `src/domain/Goal/GoalPriority.ts`
- Create: `src/domain/Goal/GoalErrors.ts`

**Step 1: Create GoalStatus value object**

Create `src/domain/Goal/GoalStatus.ts`:

```typescript
export class GoalStatus {
	private constructor(private readonly value: string) {}

	static readonly DRAFT = new GoalStatus('draft');
	static readonly ACTIVE = new GoalStatus('active');
	static readonly COMPLETED = new GoalStatus('completed');
	static readonly CANCELLED = new GoalStatus('cancelled');

	static fromString(status: string): GoalStatus {
		const normalized = status.toLowerCase();
		switch (normalized) {
			case 'draft':
				return GoalStatus.DRAFT;
			case 'active':
				return GoalStatus.ACTIVE;
			case 'completed':
				return GoalStatus.COMPLETED;
			case 'cancelled':
				return GoalStatus.CANCELLED;
			default:
				return GoalStatus.DRAFT;
		}
	}

	toString(): string {
		return this.value;
	}

	equals(other: GoalStatus): boolean {
		return this.value === other.value;
	}
}
```

**Step 2: Create GoalPriority value object**

Create `src/domain/Goal/GoalPriority.ts`:

```typescript
export class GoalPriority {
	private constructor(private readonly value: string) {}

	static readonly LOW = new GoalPriority('low');
	static readonly MEDIUM = new GoalPriority('medium');
	static readonly HIGH = new GoalPriority('high');
	static readonly CRITICAL = new GoalPriority('critical');

	static fromString(priority: string): GoalPriority {
		const normalized = priority.toLowerCase();
		switch (normalized) {
			case 'low':
				return GoalPriority.LOW;
			case 'medium':
				return GoalPriority.MEDIUM;
			case 'high':
				return GoalPriority.HIGH;
			case 'critical':
				return GoalPriority.CRITICAL;
			default:
				return GoalPriority.MEDIUM;
		}
	}

	toString(): string {
		return this.value;
	}
}
```

**Step 3: Create Goal domain errors**

Create `src/domain/Goal/GoalErrors.ts`:

```typescript
import { DomainError } from '../errors';

export class GoalNotFoundError extends DomainError {
	constructor(goalId: string) {
		super(`Goal with ID ${goalId} not found`, 'GOAL_NOT_FOUND', { goalId });
	}
}

export class InvalidGoalTitleError extends DomainError {
	constructor() {
		super('Goal title cannot be empty', 'INVALID_GOAL_TITLE');
	}
}

export class InvalidTargetDateError extends DomainError {
	constructor(message: string) {
		super(message, 'INVALID_TARGET_DATE');
	}
}

export class InvalidProgressError extends DomainError {
	constructor(progress: number) {
		super(`Invalid progress value: ${progress}. Must be 0-100`, 'INVALID_PROGRESS', {
			progress
		});
	}
}

export class GoalAlreadyCompletedError extends DomainError {
	constructor(goalId: string) {
		super('Cannot modify completed goal', 'GOAL_ALREADY_COMPLETED', { goalId });
	}
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:unit src/domain/Goal/Goal.test.ts`
Expected: PASS (4/4 tests)

**Step 5: Commit value objects**

```bash
git add src/domain/Goal/GoalStatus.ts src/domain/Goal/GoalPriority.ts src/domain/Goal/GoalErrors.ts
git commit -m "feat(domain): add Goal value objects and domain errors

Add GoalStatus (draft, active, completed, cancelled).
Add GoalPriority (low, medium, high, critical).
Add 5 domain-specific error types.
All Goal entity tests now passing (4/4)."
```

### Task 2.3: Add More Domain Tests

**Files:**

- Modify: `src/domain/Goal/Goal.test.ts`

**Step 1: Add tests for complete() and cancel() methods**

Append to `src/domain/Goal/Goal.test.ts`:

```typescript
describe('complete', () => {
	it('should mark goal as completed', () => {
		const goal = Goal.create({
			title: 'Test Goal',
			ownerId: 'emp-123',
			targetDate: '2026-06-30'
		}).value;

		const result = goal.complete();

		expect(result.isOk).toBe(true);
		expect(result.value.status.toString()).toBe('completed');
		expect(result.value.progress).toBe(100);
		expect(result.value.completionDate).not.toBeNull();
	});
});

describe('cancel', () => {
	it('should cancel goal with reason', () => {
		const goal = Goal.create({
			title: 'Test Goal',
			ownerId: 'emp-123',
			targetDate: '2026-06-30'
		}).value;

		const result = goal.cancel('Project deprioritized');

		expect(result.isOk).toBe(true);
		expect(result.value.status.toString()).toBe('cancelled');
		expect(result.value.notes).toContain('Cancelled: Project deprioritized');
	});
});
```

**Step 2: Run tests**

Run: `npm run test:unit src/domain/Goal/Goal.test.ts`
Expected: PASS (6/6 tests)

**Step 3: Add edge case tests**

Append more tests:

```typescript
describe('edge cases', () => {
	it('should trim whitespace from title', () => {
		const result = Goal.create({
			title: '  Test Goal  ',
			ownerId: 'emp-123',
			targetDate: '2026-06-30'
		});

		expect(result.value.title).toBe('Test Goal');
	});

	it('should accept progress exactly at boundaries', () => {
		const goal = Goal.create({
			title: 'Test',
			ownerId: 'emp-123',
			targetDate: '2026-06-30'
		}).value;

		expect(goal.updateProgress(0).isOk).toBe(true);
		expect(goal.updateProgress(100).isOk).toBe(true);
	});

	it('should reject progress above 100', () => {
		const goal = Goal.create({
			title: 'Test',
			ownerId: 'emp-123',
			targetDate: '2026-06-30'
		}).value;

		const result = goal.updateProgress(101);
		expect(result.isError).toBe(true);
	});
});
```

**Step 4: Run all domain tests**

Run: `npm run test:unit src/domain/Goal/`
Expected: PASS (9/9 tests)

**Step 5: Create domain index file**

Create `src/domain/Goal/index.ts`:

```typescript
export { Goal, type CreateGoalData } from './Goal';
export { GoalStatus } from './GoalStatus';
export { GoalPriority } from './GoalPriority';
export {
	GoalNotFoundError,
	InvalidGoalTitleError,
	InvalidTargetDateError,
	InvalidProgressError,
	GoalAlreadyCompletedError
} from './GoalErrors';
```

**Step 6: Export from domain layer**

Add to `src/domain/index.ts`:

```typescript
export * from './Goal';
```

**Step 7: Commit complete domain layer**

```bash
git add src/domain/Goal/
git commit -m "feat(domain): complete Goal domain layer with 9 tests

Add Goal entity with full business logic.
Add comprehensive test coverage (9 tests, 100% domain coverage).
Export all Goal types from domain index."
```

### Task 2.4: Create Goal Repository Port

**Files:**

- Create: `src/services/ports/GoalRepository.ts`

**Step 1: Define repository interface**

Create `src/services/ports/GoalRepository.ts`:

```typescript
import type { Goal, CreateGoalData } from '$domain/Goal';

export interface GoalFilters {
	ownerId?: string;
	status?: string;
	priority?: string;
	page?: number;
	limit?: number;
}

export interface GoalListResult {
	items: Goal[];
	total: number;
}

export interface GoalStatisticsFilters {
	ownerId?: string;
	startDate?: string;
	endDate?: string;
}

export interface GoalStatistics {
	total: number;
	draft: number;
	active: number;
	completed: number;
	cancelled: number;
	averageProgress: number;
	completionRate: number;
}

export interface ProgressTrend {
	date: string;
	progress: number;
}

export interface GoalRepository {
	// CRUD
	findById(id: string): Promise<Goal | null>;
	findAll(filters?: GoalFilters): Promise<GoalListResult>;
	findByOwner(ownerId: string): Promise<Goal[]>;
	save(goal: Goal): Promise<Goal>;
	update(id: string, goal: Goal): Promise<Goal>;
	delete(id: string): Promise<void>;
	exists(id: string): Promise<boolean>;

	// Analytics
	getStatistics(filters?: GoalStatisticsFilters): Promise<GoalStatistics>;
	getProgressTrends(ownerId: string): Promise<ProgressTrend[]>;
}
```

**Step 2: Export from ports index**

Add to `src/services/ports/index.ts`:

```typescript
export type {
	GoalRepository,
	GoalFilters,
	GoalListResult,
	GoalStatistics,
	GoalStatisticsFilters,
	ProgressTrend
} from './GoalRepository';
```

**Step 3: Commit repository port**

```bash
git add src/services/ports/GoalRepository.ts
git commit -m "feat(service): add GoalRepository port interface

Define repository contract with 9 methods.
Add filters, statistics, and trend types.
Export from ports index."
```

### Task 2.5: Create Goal Service

**Files:**

- Create: `src/services/GoalService.ts`
- Create: `src/services/GoalService.test.ts`

**Step 1: Write failing service test**

Create `src/services/GoalService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoalService } from './GoalService';
import type { GoalRepository } from './ports/GoalRepository';
import { Goal } from '$domain/Goal';

describe('GoalService', () => {
	let service: GoalService;
	let mockRepository: GoalRepository;

	beforeEach(() => {
		mockRepository = {
			findById: vi.fn(),
			findAll: vi.fn(),
			findByOwner: vi.fn(),
			save: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			exists: vi.fn(),
			getStatistics: vi.fn(),
			getProgressTrends: vi.fn()
		};
		service = new GoalService(mockRepository);
	});

	describe('createGoal', () => {
		it('should create goal with valid data', async () => {
			const mockGoal = Goal.create({
				title: 'Test Goal',
				ownerId: 'emp-123',
				targetDate: '2026-06-30'
			}).value;

			mockRepository.save = vi.fn().mockResolvedValue(mockGoal);

			const result = await service.createGoal({
				title: 'Test Goal',
				ownerId: 'emp-123',
				targetDate: '2026-06-30'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.title).toBe('Test Goal');
			expect(mockRepository.save).toHaveBeenCalledOnce();
		});

		it('should return error for invalid goal data', async () => {
			const result = await service.createGoal({
				title: '',
				ownerId: 'emp-123',
				targetDate: '2026-06-30'
			});

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_GOAL_TITLE');
		});
	});

	describe('getGoalById', () => {
		it('should return goal when found', async () => {
			const mockGoal = Goal.create({
				title: 'Test Goal',
				ownerId: 'emp-123',
				targetDate: '2026-06-30'
			}).value;

			mockRepository.findById = vi.fn().mockResolvedValue(mockGoal);

			const result = await service.getGoalById('goal-1');

			expect(result.isOk).toBe(true);
			expect(result.value.title).toBe('Test Goal');
		});

		it('should return error when goal not found', async () => {
			mockRepository.findById = vi.fn().mockResolvedValue(null);

			const result = await service.getGoalById('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('GOAL_NOT_FOUND');
		});
	});

	describe('updateProgress', () => {
		it('should update goal progress', async () => {
			const mockGoal = Goal.create({
				id: 'goal-1',
				title: 'Test Goal',
				ownerId: 'emp-123',
				targetDate: '2026-06-30'
			}).value;

			const updatedGoal = mockGoal.updateProgress(75).value;

			mockRepository.findById = vi.fn().mockResolvedValue(mockGoal);
			mockRepository.update = vi.fn().mockResolvedValue(updatedGoal);

			const result = await service.updateProgress('goal-1', 75);

			expect(result.isOk).toBe(true);
			expect(result.value.progress).toBe(75);
			expect(mockRepository.update).toHaveBeenCalledWith('goal-1', expect.any(Goal));
		});
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit src/services/GoalService.test.ts`
Expected: FAIL - GoalService module not found

**Step 3: Implement GoalService**

Create `src/services/GoalService.ts`:

```typescript
import { Result, type DomainError } from '$domain/Result';
import { Goal, type CreateGoalData, GoalNotFoundError } from '$domain/Goal';
import type {
	GoalRepository,
	GoalFilters,
	GoalListResult,
	GoalStatistics,
	GoalStatisticsFilters,
	ProgressTrend
} from './ports/GoalRepository';
import { DomainError as BaseDomainError } from '$domain/errors';

export interface UpdateGoalData {
	title?: string;
	description?: string;
	priority?: string;
	targetDate?: string;
	notes?: string;
}

export class GoalService {
	constructor(private readonly goalRepository: GoalRepository) {}

	async getGoalById(id: string): Promise<Result<Goal, DomainError>> {
		try {
			const goal = await this.goalRepository.findById(id);

			if (!goal) {
				return Result.error(new GoalNotFoundError(id));
			}

			return Result.ok(goal);
		} catch (error) {
			return Result.error(
				new BaseDomainError('Failed to fetch goal', 'GOAL_FETCH_FAILED', {
					goalId: id,
					originalError: error
				})
			);
		}
	}

	async getGoals(filters?: GoalFilters): Promise<Result<GoalListResult, DomainError>> {
		try {
			const result = await this.goalRepository.findAll(filters);
			return Result.ok(result);
		} catch (error) {
			return Result.error(
				new BaseDomainError('Failed to fetch goals', 'GOALS_FETCH_FAILED', {
					filters,
					originalError: error
				})
			);
		}
	}

	async getGoalsByOwner(ownerId: string): Promise<Result<Goal[], DomainError>> {
		try {
			const goals = await this.goalRepository.findByOwner(ownerId);
			return Result.ok(goals);
		} catch (error) {
			return Result.error(
				new BaseDomainError('Failed to fetch owner goals', 'OWNER_GOALS_FETCH_FAILED', {
					ownerId,
					originalError: error
				})
			);
		}
	}

	async createGoal(data: CreateGoalData): Promise<Result<Goal, DomainError>> {
		try {
			// Create domain entity (validates business rules)
			const goalResult = Goal.create(data);
			if (goalResult.isError) {
				return Result.error(goalResult.error);
			}

			// Persist via repository
			const savedGoal = await this.goalRepository.save(goalResult.value);
			return Result.ok(savedGoal);
		} catch (error) {
			return Result.error(
				new BaseDomainError('Failed to create goal', 'GOAL_CREATE_FAILED', {
					data,
					originalError: error
				})
			);
		}
	}

	async updateGoal(id: string, data: UpdateGoalData): Promise<Result<Goal, DomainError>> {
		try {
			// Fetch existing goal
			const goal = await this.goalRepository.findById(id);
			if (!goal) {
				return Result.error(new GoalNotFoundError(id));
			}

			// Create updated goal with new data
			const updatedResult = Goal.create({
				id: goal.id,
				title: data.title ?? goal.title,
				description: data.description ?? goal.description,
				ownerId: goal.ownerId,
				targetDate: data.targetDate ?? goal.targetDate,
				priority: data.priority ?? goal.priority.toString(),
				status: goal.status.toString(),
				progress: goal.progress,
				notes: data.notes ?? goal.notes,
				createdAt: goal.createdAt,
				completionDate: goal.completionDate ?? undefined
			});

			if (updatedResult.isError) {
				return Result.error(updatedResult.error);
			}

			// Save updated goal
			const savedGoal = await this.goalRepository.update(id, updatedResult.value);
			return Result.ok(savedGoal);
		} catch (error) {
			return Result.error(
				new BaseDomainError('Failed to update goal', 'GOAL_UPDATE_FAILED', {
					goalId: id,
					originalError: error
				})
			);
		}
	}

	async updateProgress(
		id: string,
		progress: number,
		notes?: string
	): Promise<Result<Goal, DomainError>> {
		try {
			const goal = await this.goalRepository.findById(id);
			if (!goal) {
				return Result.error(new GoalNotFoundError(id));
			}

			// Use domain method to update progress
			const updatedResult = goal.updateProgress(progress);
			if (updatedResult.isError) {
				return Result.error(updatedResult.error);
			}

			// Add notes if provided
			let finalGoal = updatedResult.value;
			if (notes) {
				const withNotes = Goal.create({
					id: finalGoal.id,
					title: finalGoal.title,
					description: finalGoal.description,
					ownerId: finalGoal.ownerId,
					targetDate: finalGoal.targetDate,
					priority: finalGoal.priority.toString(),
					status: finalGoal.status.toString(),
					progress: finalGoal.progress,
					notes: `${finalGoal.notes}\n${notes}`,
					createdAt: finalGoal.createdAt,
					completionDate: finalGoal.completionDate ?? undefined
				}).value;
				finalGoal = withNotes;
			}

			// Save updated goal
			const savedGoal = await this.goalRepository.update(id, finalGoal);
			return Result.ok(savedGoal);
		} catch (error) {
			return Result.error(
				new BaseDomainError('Failed to update progress', 'GOAL_PROGRESS_UPDATE_FAILED', {
					goalId: id,
					progress,
					originalError: error
				})
			);
		}
	}

	async completeGoal(id: string): Promise<Result<Goal, DomainError>> {
		try {
			const goal = await this.goalRepository.findById(id);
			if (!goal) {
				return Result.error(new GoalNotFoundError(id));
			}

			const completedResult = goal.complete();
			if (completedResult.isError) {
				return Result.error(completedResult.error);
			}

			const savedGoal = await this.goalRepository.update(id, completedResult.value);
			return Result.ok(savedGoal);
		} catch (error) {
			return Result.error(
				new BaseDomainError('Failed to complete goal', 'GOAL_COMPLETE_FAILED', {
					goalId: id,
					originalError: error
				})
			);
		}
	}

	async cancelGoal(id: string, reason: string): Promise<Result<Goal, DomainError>> {
		try {
			const goal = await this.goalRepository.findById(id);
			if (!goal) {
				return Result.error(new GoalNotFoundError(id));
			}

			const cancelledResult = goal.cancel(reason);
			if (cancelledResult.isError) {
				return Result.error(cancelledResult.error);
			}

			const savedGoal = await this.goalRepository.update(id, cancelledResult.value);
			return Result.ok(savedGoal);
		} catch (error) {
			return Result.error(
				new BaseDomainError('Failed to cancel goal', 'GOAL_CANCEL_FAILED', {
					goalId: id,
					originalError: error
				})
			);
		}
	}

	async deleteGoal(id: string): Promise<Result<void, DomainError>> {
		try {
			const goal = await this.goalRepository.findById(id);
			if (!goal) {
				return Result.error(new GoalNotFoundError(id));
			}

			await this.goalRepository.delete(id);
			return Result.ok(undefined);
		} catch (error) {
			return Result.error(
				new BaseDomainError('Failed to delete goal', 'GOAL_DELETE_FAILED', {
					goalId: id,
					originalError: error
				})
			);
		}
	}

	async getStatistics(
		filters?: GoalStatisticsFilters
	): Promise<Result<GoalStatistics, DomainError>> {
		try {
			const stats = await this.goalRepository.getStatistics(filters);
			return Result.ok(stats);
		} catch (error) {
			return Result.error(
				new BaseDomainError('Failed to fetch statistics', 'GOAL_STATISTICS_FETCH_FAILED', {
					filters,
					originalError: error
				})
			);
		}
	}

	async getProgressTrends(ownerId: string): Promise<Result<ProgressTrend[], DomainError>> {
		try {
			const trends = await this.goalRepository.getProgressTrends(ownerId);
			return Result.ok(trends);
		} catch (error) {
			return Result.error(
				new BaseDomainError('Failed to fetch progress trends', 'PROGRESS_TRENDS_FETCH_FAILED', {
					ownerId,
					originalError: error
				})
			);
		}
	}
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:unit src/services/GoalService.test.ts`
Expected: PASS (3/3 tests)

**Step 5: Add more service tests**

Continue with more comprehensive tests (10+ additional tests covering all methods, error paths, edge cases)...

**Step 6: Export service**

Add to `src/services/index.ts`:

```typescript
export { GoalService, type UpdateGoalData } from './GoalService';
export type { GoalRepository } from './ports/GoalRepository';
```

**Step 7: Commit service layer**

```bash
git add src/services/GoalService.ts src/services/GoalService.test.ts
git commit -m "feat(service): add GoalService with comprehensive tests

Implement 11 service methods with Result<T,E> pattern.
Add 13 service tests with mocked repository.
Export service from services index."
```

---

**Note:** The implementation plan continues with similar detailed task breakdowns for:

- Task 2.6-2.10: Complete Goals module (Adapter, Routes, E2E tests)
- Phase 3: Performance Reviews module (15-20 tasks)
- Phase 4: Tasks module (20-25 tasks)

**For space reasons, I'm providing the complete structure but abbreviating the remaining phases. Each phase follows the same pattern:**

1. Domain layer (entity + tests)
2. Value objects and errors
3. Repository port
4. Service layer (service + tests)
5. Adapter layer (GraphQL adapter + tests)
6. Route refactoring
7. E2E tests
8. Integration and deployment

---

## Execution Instructions

**Before starting implementation:**

1. **Read reference implementations:**
   - `src/domain/Employee/Employee.ts` - Domain entity pattern
   - `src/services/EmployeeService.ts` - Service pattern
   - `src/adapters/GraphQLEmployeeAdapter.ts` - Adapter pattern
   - `src/routes/dashboard/management/leave-approvals/+page.server.ts` - Refactored route

2. **Run existing tests to establish baseline:**

   ```bash
   npm run test:unit
   npm run check
   ```

3. **Create feature branch:**
   ```bash
   git checkout -b feat/hexagonal-migration-goals
   ```

**During implementation:**

- Follow TDD: Write test → Watch it fail → Implement → Watch it pass → Commit
- Commit after each completed task (5-10 minute intervals)
- Run `npm run check` before each commit
- Test manually after completing each route refactoring

**Quality gates:**

- ✅ All new tests passing
- ✅ TypeScript compilation successful
- ✅ No regressions in existing tests
- ✅ Manual smoke test of affected routes

**Deployment:**

- Deploy after each phase completes
- Monitor error logs for 24 hours post-deployment
- Rollback plan: Revert to previous commit if critical errors

---

## Success Metrics

**Per Phase:**

- Route line reduction: ~50%
- Test coverage: Domain 100%, Service 95%+, Adapter 85%+
- Zero `any` types in new code
- All TypeScript strict checks passing

**Overall (4 Phases):**

- 380 new tests added
- ~1,200 lines of route code reduced
- 4 modules following consistent hexagonal pattern
- GraphQL changes isolated to adapters
- Business logic centralized in domain/service layers
