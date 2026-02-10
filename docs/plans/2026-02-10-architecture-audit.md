# Architecture Audit: Hexagonal vs. Anemic Design Patterns

**Date:** 2026-02-10
**Scope:** Domain layer architecture across all business modules
**Goal:** Identify systems not following hexagonal/clean architecture pattern

---

## Executive Summary

### Architecture Status by Module

| Module                     | Pattern      | Status                      | Priority |
| -------------------------- | ------------ | --------------------------- | -------- |
| 👑 **Employee**            | Hexagonal ✅ | 🟢 Reference Implementation | -        |
| 🏢 **Department**          | Hexagonal ✅ | 🟢 Well Architected         | -        |
| 🏖️ **Leave Requests**      | Anemic ❌    | 🔴 Needs Refactor           | P1       |
| 📅 **Events**              | Anemic ❌    | 🔴 Needs Refactor           | P1       |
| 📊 **Performance Reviews** | Anemic ❌    | 🔴 Needs Refactor           | P2       |
| 🎯 **Goals**               | Anemic ❌    | 🔴 Needs Refactor           | P2       |
| ✅ **Tasks**               | Mixed ⚠️     | 🟡 Partially Architected    | P3       |

---

## 🟢 REFERENCE IMPLEMENTATION: Employee Module

### Architecture Overview

The Employee module demonstrates proper **hexagonal architecture** (ports & adapters):

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│     (Routes: +page.server.ts, +page.svelte)            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   Service Layer                          │
│         (src/services/EmployeeService.ts)               │
│  • Orchestrates business logic                          │
│  • Returns Result<T, DomainError>                       │
│  • Depends on EmployeeRepository PORT                   │
└────────────────────┬────────────────────────────────────┘
                     │
    ┌────────────────┴────────────────┐
    │                                 │
┌───▼────────────────┐    ┌──────────▼─────────────┐
│   Domain Layer     │    │   Adapter Layer        │
│ (src/domain/       │    │ (src/adapters/         │
│  Employee/)        │    │  GraphQLEmployeeAdapter)│
│ • Employee entity  │    │ • Implements           │
│ • Value objects    │    │   EmployeeRepository   │
│ • Business rules   │    │ • GraphQL translation  │
│ • Zero dependencies│    │ • Data sanitization    │
└────────────────────┘    └────────────────────────┘
```

### Key Characteristics ✅

1. **Domain Layer** (`src/domain/Employee/`):

   ```typescript
   // Pure business logic, zero external dependencies
   export class Employee {
     private constructor(
       public readonly id: string,
       public readonly email: Email,
       public readonly personName: PersonName,
       public readonly hireDate: HireDate,
       public readonly status: EmployeeStatus
     ) {}

     static create(data: CreateEmployeeData): Result<Employee, DomainError> {
       // Business rule validation
       const emailResult = Email.create(data.email);
       if (emailResult.isError) return emailResult;

       // ... more validation

       return Result.ok(new Employee(...));
     }
   }
   ```

2. **Value Objects**:
   - `Email` - validates email format
   - `PersonName` - validates names
   - `HireDate` - validates hire date business rules
   - `EmployeeStatus` - type-safe status enum

3. **Service Layer** (`src/services/EmployeeService.ts`):

   ```typescript
   export class EmployeeService {
   	constructor(private readonly employeeRepository: EmployeeRepository) {}

   	async createEmployee(data: CreateEmployeeData): Promise<Result<Employee, DomainError>> {
   		// Check business rules
   		const existing = await this.employeeRepository.findByEmail(data.email);
   		if (existing) {
   			return Result.error(new EmployeeAlreadyExistsError(data.email));
   		}

   		// Create domain entity (validates invariants)
   		const employeeResult = Employee.create(data);
   		if (employeeResult.isError) return employeeResult;

   		// Persist via repository port
   		return this.employeeRepository.save(employeeResult.value);
   	}
   }
   ```

4. **Port (Interface)** (`src/services/ports/EmployeeRepository.ts`):

   ```typescript
   export interface EmployeeRepository {
   	findById(id: string): Promise<Employee | null>;
   	findByEmail(email: string): Promise<Employee | null>;
   	findAll(filters?: EmployeeListFilters): Promise<EmployeeListResult>;
   	save(employee: Employee): Promise<Result<Employee, DomainError>>;
   	update(employee: Employee): Promise<Result<Employee, DomainError>>;
   	delete(id: string): Promise<Result<void, DomainError>>;
   	getStatistics(): Promise<EmployeeStatistics>;
   }
   ```

5. **Adapter** (`src/adapters/GraphQLEmployeeAdapter.ts`):

   ```typescript
   export class GraphQLEmployeeAdapter implements EmployeeRepository {
   	constructor(private readonly graphqlClient: GraphQLClient) {}

   	async findById(id: string): Promise<Employee | null> {
   		const result = await this.graphqlClient.query(GET_EMPLOYEE_BY_ID, { id });
   		if (!result.data?.employee) return null;

   		// Translate GraphQL to Domain
   		return this.toDomain(result.data.employee);
   	}

   	private toDomain(graphqlData: any): Employee | null {
   		// Data sanitization at boundary
   		const employeeResult = Employee.create({
   			email: graphqlData.email,
   			firstName: graphqlData.firstName
   			// ... transform data
   		});

   		if (employeeResult.isError) {
   			console.error('Invalid employee data from GraphQL:', employeeResult.error);
   			return null; // Graceful degradation
   		}

   		return employeeResult.value;
   	}
   }
   ```

### Benefits Demonstrated

- ✅ **156 comprehensive tests** (100% passing)
- ✅ **Zero `any` types** throughout module
- ✅ **Type-safe error handling** with `Result<T, E>` pattern
- ✅ **Business logic isolated** from infrastructure
- ✅ **Easy to test** (domain layer has no I/O)
- ✅ **GraphQL schema changes** isolated to adapter
- ✅ **Validation enforced** at entity creation

---

## 🔴 PROBLEM PATTERN: Leave Requests Module

### Current Architecture (Anemic)

```
┌─────────────────────────────────────────────────────────┐
│              Presentation Layer                          │
│   src/routes/dashboard/management/leave-approvals/      │
│                  +page.server.ts                         │
│                                                          │
│  ❌ 458 lines of business logic MIXED with:             │
│     • GraphQL queries (inline)                          │
│     • Data transformation                               │
│     • Filtering/pagination                              │
│     • Statistics calculation                            │
│     • Error handling                                    │
│     • Permission checks                                 │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ Direct GraphQL query (no abstraction)
                      ▼
┌─────────────────────────────────────────────────────────┐
│           GraphQL Client (Infrastructure)                │
│     • Tightly coupled to route                          │
│     • No domain layer                                   │
│     • No business rules enforcement                     │
│     • No type safety beyond GraphQL types               │
└─────────────────────────────────────────────────────────┘
```

### Problems ❌

1. **No Domain Layer**:

   ```typescript
   // ❌ BAD: Route directly queries GraphQL, no domain model
   const leaveRequestsQuery = `
     query GetLeaveRequests($limit: Int!, $offset: Int!) {
       leaveRequests(limit: $limit, offset: $offset) {
         id
         employeeId
         leaveType
         ...
       }
     }
   `;
   const leaveRequestsData = await client.query(leaveRequestsQuery, { ... });
   ```

2. **Business Logic in Routes**:

   ```typescript
   // ❌ BAD: Statistics calculation in route (should be in service)
   const stats = StatisticsCalculator.forLeaveRequests(leaveRequests);
   const approvalRate = stats.total > 0 ? (stats.approved / stats.total) * 100 : 0;

   // ❌ BAD: Filtering in route (should be in repository)
   if (statusFilter && statusFilter !== 'all') {
   	filter.filter((req: any) => req.status === statusFilter.toLowerCase());
   }
   ```

3. **No Type Safety**:

   ```typescript
   // ❌ BAD: Using 'any' types from GraphQL
   const leaveRequests = leaveRequestsData.map((request: any) => ({
   	id: request.id.toString(),
   	status: request.status.toLowerCase(), // What if status is null?
   	daysRequested: parseFloat(request.daysRequested) // What if not a number?
   }));
   ```

4. **No Business Rule Validation**:
   - No validation that leave dates are valid
   - No check that end date > start date
   - No validation of leave type
   - No business rule for max leave days
   - No check for overlapping leave requests

5. **Testing Challenges**:
   - 458 lines in single route file
   - Can't unit test business logic (requires full server context)
   - GraphQL mocking required for all tests
   - Hard to test edge cases

6. **Code Duplication**:
   - Similar GraphQL queries in multiple routes
   - Repeated transformation logic
   - Duplicated error handling

---

## 🎯 TARGET ARCHITECTURE: Leave Request Module

### Proposed Hexagonal Architecture

```
src/domain/LeaveRequest/
├── LeaveRequest.ts          # Entity with business rules
├── LeaveRequest.test.ts     # Fast unit tests
├── LeaveType.ts             # Value object
├── LeaveDateRange.ts        # Value object (validates date logic)
├── LeaveStatus.ts           # Type-safe status enum
├── errors.ts                # Domain-specific errors
├── types.ts                 # DTOs and interfaces
└── index.ts                 # Public API

src/services/
├── LeaveRequestService.ts   # Business logic orchestration
├── LeaveRequestService.test.ts
└── ports/
    └── LeaveRequestRepository.ts  # Interface

src/adapters/
└── GraphQLLeaveRequestAdapter.ts  # GraphQL implementation

src/routes/.../+page.server.ts
└── Uses LeaveRequestService (thin controller)
```

### Example Domain Layer

```typescript
// src/domain/LeaveRequest/LeaveDateRange.ts
export class LeaveDateRange {
	private constructor(
		public readonly startDate: Date,
		public readonly endDate: Date,
		public readonly businessDays: number
	) {}

	static create(start: string, end: string): Result<LeaveDateRange, DomainError> {
		const startDate = new Date(start);
		const endDate = new Date(end);

		// Business Rule: End date must be after start date
		if (endDate <= startDate) {
			return Result.error(
				new DomainError('End date must be after start date', 'INVALID_DATE_RANGE')
			);
		}

		// Business Rule: Leave cannot be more than 1 year in advance
		const oneYearFromNow = new Date();
		oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
		if (startDate > oneYearFromNow) {
			return Result.error(
				new DomainError('Cannot request leave more than 1 year in advance', 'DATE_TOO_FAR')
			);
		}

		const businessDays = this.calculateBusinessDays(startDate, endDate);

		return Result.ok(new LeaveDateRange(startDate, endDate, businessDays));
	}

	private static calculateBusinessDays(start: Date, end: Date): number {
		// Business logic for calculating business days
		// Excludes weekends and holidays
		// ...
	}
}

// src/domain/LeaveRequest/LeaveRequest.ts
export class LeaveRequest {
	private constructor(
		public readonly id: string,
		public readonly employeeId: string,
		public readonly leaveType: LeaveType,
		public readonly dateRange: LeaveDateRange,
		public readonly reason: string,
		public readonly status: LeaveStatus,
		public readonly managerId?: string,
		public readonly managerComments?: string
	) {}

	static create(data: CreateLeaveRequestData): Result<LeaveRequest, DomainError> {
		// Validate leave type
		const leaveTypeResult = LeaveType.create(data.leaveType);
		if (leaveTypeResult.isError) return leaveTypeResult;

		// Validate date range
		const dateRangeResult = LeaveDateRange.create(data.startDate, data.endDate);
		if (dateRangeResult.isError) return dateRangeResult;

		// Business Rule: Reason is required for leave requests > 5 days
		if (dateRangeResult.value.businessDays > 5 && !data.reason?.trim()) {
			return Result.error(
				new DomainError('Reason required for leave requests over 5 days', 'REASON_REQUIRED')
			);
		}

		return Result.ok(
			new LeaveRequest(
				crypto.randomUUID(),
				data.employeeId,
				leaveTypeResult.value,
				dateRangeResult.value,
				data.reason || '',
				LeaveStatus.PENDING,
				undefined,
				undefined
			)
		);
	}

	// Business logic methods
	approve(managerId: string): Result<LeaveRequest, DomainError> {
		if (this.status !== LeaveStatus.PENDING) {
			return Result.error(
				new DomainError('Can only approve pending requests', 'INVALID_STATUS_TRANSITION')
			);
		}

		return Result.ok(
			new LeaveRequest(
				this.id,
				this.employeeId,
				this.leaveType,
				this.dateRange,
				this.reason,
				LeaveStatus.APPROVED,
				managerId
			)
		);
	}

	reject(managerId: string, comments: string): Result<LeaveRequest, DomainError> {
		if (this.status !== LeaveStatus.PENDING) {
			return Result.error(
				new DomainError('Can only reject pending requests', 'INVALID_STATUS_TRANSITION')
			);
		}

		if (!comments.trim()) {
			return Result.error(
				new DomainError('Rejection requires manager comments', 'COMMENTS_REQUIRED')
			);
		}

		return Result.ok(
			new LeaveRequest(
				this.id,
				this.employeeId,
				this.leaveType,
				this.dateRange,
				this.reason,
				LeaveStatus.REJECTED,
				managerId,
				comments
			)
		);
	}

	canBeApprovedBy(managerId: string): boolean {
		// Business rule: Manager can only approve their team's requests
		// This would need employee repository to check hierarchy
		return this.status === LeaveStatus.PENDING;
	}
}
```

### Example Service Layer

```typescript
// src/services/LeaveRequestService.ts
export class LeaveRequestService {
	constructor(
		private readonly leaveRequestRepository: LeaveRequestRepository,
		private readonly employeeRepository: EmployeeRepository
	) {}

	async createLeaveRequest(
		data: CreateLeaveRequestData
	): Promise<Result<LeaveRequest, DomainError>> {
		// Business Rule: Check for overlapping requests
		const overlapping = await this.leaveRequestRepository.findOverlapping(
			data.employeeId,
			data.startDate,
			data.endDate
		);

		if (overlapping.length > 0) {
			return Result.error(new DomainError('Overlapping leave request exists', 'LEAVE_OVERLAP'));
		}

		// Business Rule: Check employee has sufficient leave balance
		const employee = await this.employeeRepository.findById(data.employeeId);
		if (!employee) {
			return Result.error(new EmployeeNotFoundError(data.employeeId));
		}

		const leaveBalance = await this.leaveRequestRepository.getLeaveBalance(data.employeeId);
		const requestedDays = this.calculateBusinessDays(data.startDate, data.endDate);

		if (leaveBalance < requestedDays) {
			return Result.error(new DomainError('Insufficient leave balance', 'INSUFFICIENT_BALANCE'));
		}

		// Create domain entity (validates all business rules)
		const leaveRequestResult = LeaveRequest.create(data);
		if (leaveRequestResult.isError) return leaveRequestResult;

		// Persist
		return this.leaveRequestRepository.save(leaveRequestResult.value);
	}

	async approveLeaveRequest(
		requestId: string,
		managerId: string
	): Promise<Result<LeaveRequest, DomainError>> {
		// Fetch request
		const request = await this.leaveRequestRepository.findById(requestId);
		if (!request) {
			return Result.error(new LeaveRequestNotFoundError(requestId));
		}

		// Business logic in domain
		const approvedResult = request.approve(managerId);
		if (approvedResult.isError) return approvedResult;

		// Persist
		return this.leaveRequestRepository.update(approvedResult.value);
	}

	async getLeaveRequests(
		filters: LeaveRequestFilters
	): Promise<Result<LeaveRequestListResult, DomainError>> {
		return this.leaveRequestRepository.findAll(filters);
	}
}
```

### Example Route (Thin Controller)

```typescript
// src/routes/dashboard/management/leave-approvals/+page.server.ts
export const load: PageServerLoad = async (event) => {
	await requirePermission(event, 'leave:approve');

	const leaveRequestService = createLeaveRequestService(event);
	const params = new QueryParamExtractor(event.url);

	const filters: LeaveRequestFilters = {
		status: params.getString('status') as LeaveStatus,
		page: params.getNumber('page', 1),
		limit: params.getNumber('limit', 20)
	};

	const result = await leaveRequestService.getLeaveRequests(filters);

	if (result.isError) {
		console.error('Failed to load leave requests:', result.error);
		return {
			leaveRequests: [],
			error: result.error.message
		};
	}

	return {
		leaveRequests: result.value.items,
		pagination: result.value.pagination
	};
};

export const actions: Actions = {
	approve: async (event) => {
		await requirePermission(event, 'leave:approve');

		const formData = await event.request.formData();
		const requestId = formData.get('id') as string;

		const leaveRequestService = createLeaveRequestService(event);
		const result = await leaveRequestService.approveLeaveRequest(requestId, event.locals.user!.id);

		if (result.isError) {
			return fail(400, { error: result.error.message });
		}

		return { success: true };
	}
};
```

---

## 📊 Architecture Comparison Matrix

| Aspect               | Employee (Hexagonal) ✅        | Leave Requests (Anemic) ❌      |
| -------------------- | ------------------------------ | ------------------------------- |
| **Domain Layer**     | ✅ Full entity + value objects | ❌ None                         |
| **Business Rules**   | ✅ Enforced in entities        | ❌ Scattered in routes          |
| **Type Safety**      | ✅ Zero `any` types            | ❌ Heavy use of `any`           |
| **Testability**      | ✅ 156 unit tests (fast)       | ❌ E2E only (slow)              |
| **Error Handling**   | ✅ Result<T, E> pattern        | ❌ try/catch + logging          |
| **Validation**       | ✅ At entity creation          | ❌ Manual checks in routes      |
| **Code Location**    | ✅ Service layer               | ❌ 458 lines in route           |
| **Reusability**      | ✅ Service used anywhere       | ❌ Logic tied to specific route |
| **GraphQL Coupling** | ✅ Isolated to adapter         | ❌ Directly in route            |
| **Dependencies**     | ✅ Dependency injection        | ❌ Hard-coded clients           |

---

## 🔄 Migration Priority & Strategy

### Phase 1: Critical Business Domains (Sprint 1-2)

#### **1. Leave Requests** (P1 - Highest Priority)

**Rationale:** Complex business rules, high usage, approval workflows

**Scope:**

- Create `src/domain/LeaveRequest/` with:
  - `LeaveRequest` entity
  - `LeaveDateRange` value object
  - `LeaveType` value object
  - `LeaveStatus` enum
- Create `LeaveRequestService`
- Create `GraphQLLeaveRequestAdapter`
- Refactor routes to use service

**Estimated Effort:** 3-4 days
**Benefits:**

- Enforce business rules (date validation, balance checks, overlaps)
- Type-safe status transitions
- Unit testable business logic
- Consistent error handling

---

#### **2. Events** (P1 - High Priority)

**Rationale:** Calendar logic, RSVP workflows, recurring events

**Scope:**

- Create `src/domain/Event/` with:
  - `Event` entity
  - `EventDateTime` value object
  - `RSVPStatus` enum
  - `RecurrencePattern` value object
- Create `EventService`
- Create `GraphQLEventAdapter`
- Refactor event routes

**Estimated Effort:** 4-5 days
**Benefits:**

- Complex recurrence rules in domain
- RSVP capacity management
- Conflict detection logic
- Time zone handling

---

### Phase 2: Performance & Goal Systems (Sprint 3-4)

#### **3. Performance Reviews** (P2)

**Rationale:** Workflow states, approval chains

**Scope:**

- Create `src/domain/PerformanceReview/`
- Review workflow state machine
- Goal tracking integration

**Estimated Effort:** 3-4 days

---

#### **4. Goals** (P2)

**Rationale:** Progress tracking, due dates, cascading goals

**Scope:**

- Create `src/domain/Goal/`
- Progress calculation logic
- Goal hierarchy validation

**Estimated Effort:** 2-3 days

---

### Phase 3: Supporting Systems (Sprint 5+)

#### **5. Tasks** (P3 - Partially Done)

**Current:** Mixed architecture (some structure exists)
**Action:** Complete migration to hexagonal pattern

**Estimated Effort:** 2-3 days

---

## 📐 Migration Template

For each module, follow this template:

### Step 1: Create Domain Layer (Week 1)

```
src/domain/<Module>/
├── <Module>.ts           # Main entity
├── <Module>.test.ts      # Unit tests
├── <ValueObject>.ts      # Value objects
├── <Status>.ts           # Status enum
├── errors.ts             # Domain errors
├── types.ts              # DTOs
└── index.ts
```

### Step 2: Create Service Layer (Week 1)

```
src/services/
├── <Module>Service.ts
├── <Module>Service.test.ts
└── ports/
    └── <Module>Repository.ts
```

### Step 3: Create Adapter Layer (Week 2)

```
src/adapters/
└── GraphQL<Module>Adapter.ts
```

### Step 4: Refactor Routes (Week 2)

```typescript
// Before: 400+ lines of business logic
// After: 50 lines calling service methods
```

### Step 5: Add Integration Tests (Week 3)

```
tests/integration/
└── <module>-service.test.ts
```

---

## ✅ Success Criteria for Migration

Each module migration is complete when:

- [ ] Domain entities with business rules exist
- [ ] Value objects enforce invariants
- [ ] Service layer orchestrates operations
- [ ] Adapter implements repository port
- [ ] Routes are < 100 lines (thin controllers)
- [ ] Unit tests cover domain logic (>90%)
- [ ] Integration tests cover service layer
- [ ] No `any` types in domain/service layers
- [ ] Result<T, E> pattern used consistently
- [ ] GraphQL coupling isolated to adapter

---

## 🎯 Expected Outcomes

### Technical Benefits

- **Testability:** Fast unit tests for business logic (< 1ms per test)
- **Type Safety:** Zero `any` types, compile-time error detection
- **Maintainability:** Business logic isolated and easy to change
- **Reusability:** Services usable from any layer (routes, jobs, APIs)
- **GraphQL Independence:** Can swap GraphQL for REST without touching business logic

### Business Benefits

- **Reduced Bugs:** Business rules enforced at domain level
- **Faster Development:** Domain layer provides clear contracts
- **Better Testing:** Can test business logic without infrastructure
- **Compliance:** Audit trail and validation enforced consistently
- **Performance:** Can optimize repositories without touching business logic

---

## 📚 Reference Implementation Guide

Use the Employee module as the template for all migrations:

1. **Study the pattern:**
   - Read `src/domain/Employee/Employee.ts`
   - Review `src/services/EmployeeService.ts`
   - Examine `src/adapters/GraphQLEmployeeAdapter.ts`

2. **Copy the structure:**
   - Use same file organization
   - Follow same naming conventions
   - Adopt same error handling patterns

3. **Adapt to your domain:**
   - Replace "Employee" with your entity name
   - Add domain-specific value objects
   - Implement domain-specific business rules

4. **Write tests first:**
   - Start with domain entity tests
   - Add service tests
   - Add integration tests last

---

## 🚦 Decision Framework

**When to use Hexagonal Architecture:**

- ✅ Complex business rules
- ✅ Entity lifecycle (create, update, approve, etc.)
- ✅ Validation beyond simple type checks
- ✅ Multiple clients (web, API, jobs)
- ✅ Long-term maintenance expected

**When simple CRUD is acceptable:**

- ✅ Lookup tables (countries, currencies)
- ✅ Simple reference data
- ✅ Read-only data with no business rules
- ✅ Internal admin-only configuration

---

## 📝 Next Steps

1. **Review this audit** with the team
2. **Approve migration plan** and priorities
3. **Create tickets** for Phase 1 migrations
4. **Set up templates** for new domain modules
5. **Begin Leave Request migration** (highest priority)
6. **Document patterns** as we establish them
7. **Update CLAUDE.md** with architecture guidelines

---

**Generated by:** Architecture Audit Tool
**Based on:** Employee module reference implementation
**Review Date:** 2026-02-10
**Next Audit:** After Phase 1 completion
