# Department Domain Layer Design

**Date:** 2026-02-05
**Status:** Design Complete - Ready for Implementation
**Pattern:** Hexagonal Architecture (Ports & Adapters)
**Reference:** Employee module (src/domain/Employee/, src/services/EmployeeService.ts)

---

## Executive Summary

Transform the Department module from an anemic domain model to a rich domain layer following the successful Employee module pattern. This design establishes:

- **Type-safe value objects** for DepartmentName and DepartmentHierarchy
- **Rich Department entity** with business logic and invariants
- **Repository port** defining data access interface
- **DepartmentService** orchestrating business workflows
- **GraphQL adapter** isolating external dependencies
- **Result<T, E>** pattern for type-safe error handling

**Benefits:**

- Business rules enforced at domain level (name validation, hierarchy depth, circular detection)
- Zero `any` types throughout module
- Testable domain logic (no I/O dependencies)
- Maintainable (changes in one place)
- Consistent behavior across all routes

---

## Current State Analysis

### Existing Implementation

**Database Structure (Rust):**

```rust
pub struct Model {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub parent_department_id: Option<Uuid>, // Self-referential tree
    pub manager_id: Option<Uuid>,           // References User
    pub intuit_department_id: Option<String>,
    pub sync_status: String,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}
```

**GraphQL API:**

- Basic CRUD mutations (create, update, soft delete)
- No validation beyond NOT NULL constraints
- No business rule enforcement

**Frontend Pattern:**

- Uses RBACDataLoader + QueryParamExtractor (✅ modern utilities)
- Client-side enrichment (employee counts, subdepartments)
- Manual validation in route actions

**Missing Business Rules:**

- ❌ Name format/length constraints
- ❌ Duplicate name prevention
- ❌ Circular hierarchy detection
- ❌ Hierarchy depth limits
- ❌ Manager validation
- ❌ Deletion constraints (has employees? has children?)

### System Dependencies

**Entities that depend on Department:**

1. **User (Employee)** - `department_id` field
   - Employees belong to departments
   - Circular dependency: Department.manager_id → User

2. **Task** - `department_id` field
   - Department-level task assignments
   - Department used for access control

3. **Document Assignment** - `department_id` field
   - Documents assigned to entire departments
   - Alternative to user-level assignment

4. **Analytics** - Department metrics
   - Headcount tracking
   - Performance metrics
   - Goal statistics

5. **QuickBooks Integration** - `intuit_department_id`
   - External system sync
   - Sync status tracking

**Implications:**

- Cannot delete department with employees
- Moving department affects task/document visibility
- Hierarchy changes cascade to descendants
- Manager must be valid employee (ideally in same dept)

---

## Domain Layer Architecture

### Layer Separation

```
┌─────────────────────────────────────────────────┐
│ Routes (src/routes/dashboard/departments/)      │
│ - Thin orchestrators                            │
│ - Handle HTTP concerns                          │
│ - Map domain entities to serializable data      │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ Service Layer (src/services/DepartmentService)  │
│ - Orchestrates business workflows               │
│ - Coordinates repository calls                  │
│ - Returns Result<T, E>                          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ Domain Layer (src/domain/Department/)           │
│ - Department entity (aggregate root)            │
│ - Value objects (DepartmentName, Hierarchy)     │
│ - Business rules and invariants                 │
│ - Domain errors                                 │
│ - Repository port (interface)                   │
│ - ZERO external dependencies                    │
└─────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ Adapter Layer (src/adapters/)                   │
│ - GraphQLDepartmentAdapter implements port      │
│ - Translates GraphQL ↔ Domain entities          │
│ - Data sanitization at boundary                 │
│ - Client-side filtering (backend limitation)    │
└─────────────────────────────────────────────────┘
```

---

## Domain Layer Design

### 1. Value Objects

#### DepartmentName

**Purpose:** Encapsulate department name with validation

**Business Rules:**

- Required (cannot be empty)
- Min 2, max 100 characters
- Must contain at least one letter
- No leading/trailing whitespace
- Case-insensitive comparison for duplicates

**Implementation:**

```typescript
// src/domain/Department/DepartmentName.ts
export class DepartmentName {
	private constructor(private readonly value: string) {}

	static create(name: string): Result<DepartmentName, DomainError> {
		const trimmed = name.trim();

		if (!trimmed) {
			return err(new ValidationError('Department name is required'));
		}

		if (trimmed.length < 2) {
			return err(new ValidationError('Department name must be at least 2 characters'));
		}

		if (trimmed.length > 100) {
			return err(new ValidationError('Department name cannot exceed 100 characters'));
		}

		if (trimmed !== name) {
			return err(new ValidationError('Department name cannot have leading/trailing whitespace'));
		}

		if (!/[a-zA-Z]/.test(trimmed)) {
			return err(new ValidationError('Department name must contain at least one letter'));
		}

		return ok(new DepartmentName(trimmed));
	}

	getValue(): string {
		return this.value;
	}

	equals(other: DepartmentName): boolean {
		return this.value === other.value;
	}

	equalsIgnoreCase(other: DepartmentName): boolean {
		return this.value.toLowerCase() === other.value.toLowerCase();
	}
}
```

#### DepartmentHierarchy

**Purpose:** Encapsulate hierarchical relationships with validation

**Business Rules:**

- Root departments have no parent
- Max hierarchy depth of 5 levels
- Maintain full ancestor chain (for circular detection)
- Prevent circular references

**Implementation:**

```typescript
// src/domain/Department/DepartmentHierarchy.ts
export class DepartmentHierarchy {
	private constructor(
		private readonly parentId: string | null,
		private readonly ancestorIds: string[]
	) {}

	static createRoot(): DepartmentHierarchy {
		return new DepartmentHierarchy(null, []);
	}

	static createChild(
		parentId: string,
		parentAncestors: string[]
	): Result<DepartmentHierarchy, DomainError> {
		// Business Rule: Max hierarchy depth of 5 levels
		if (parentAncestors.length >= 5) {
			return err(new HierarchyDepthExceededError(5));
		}

		const ancestors = [...parentAncestors, parentId];
		return ok(new DepartmentHierarchy(parentId, ancestors));
	}

	getParentId(): string | null {
		return this.parentId;
	}

	getAncestorIds(): string[] {
		return [...this.ancestorIds];
	}

	getDepth(): number {
		return this.ancestorIds.length;
	}

	isRoot(): boolean {
		return this.parentId === null;
	}

	isAncestorOf(departmentId: string): boolean {
		return this.ancestorIds.includes(departmentId);
	}

	wouldCreateCircle(proposedChildId: string): boolean {
		return this.ancestorIds.includes(proposedChildId);
	}
}
```

### 2. Department Entity (Aggregate Root)

**Purpose:** Rich domain entity with business logic and invariants

**Properties:**

```typescript
interface DepartmentProps {
	id: string;
	name: DepartmentName;
	description: string | null;
	hierarchy: DepartmentHierarchy;
	managerId: string | null;
	employeeCount: number;
	createdAt: Date;
	updatedAt: Date;

	// QuickBooks sync
	intuitDepartmentId: string | null;
	syncStatus: SyncStatus;
	lastSyncedAt: Date | null;
}

enum SyncStatus {
	NotSynced = 'not_synced',
	Synced = 'synced',
	PendingSync = 'pending_sync',
	SyncFailed = 'sync_failed'
}
```

**Key Business Operations:**

```typescript
export class Department {
  // Factory methods
  static create(...): Result<Department, DomainError>
  static fromPersistence(...): Result<Department, DomainError>

  // Business operations (all return new instance - immutable)
  rename(newName: DepartmentName): Result<Department, DomainError>
  updateDescription(description: string | null): Department
  assignManager(managerId: string | null): Result<Department, DomainError>
  moveToParent(newHierarchy, childIds): Result<Department, DomainError>
  updateEmployeeCount(count: number): Result<Department, DomainError>

  // Deletion validation
  canBeDeleted(): Result<boolean, DomainError>
  canBeDeletedWithChildren(childCount: number): Result<boolean, DomainError>

  // QuickBooks sync
  linkToQuickBooks(intuitId: string): Department
  markSyncSuccessful(): Department
  markSyncFailed(): Department

  // Query methods
  isRoot(): boolean
  hasManager(): boolean
  hasEmployees(): boolean
  isSyncedWithQuickBooks(): boolean
  needsSync(): boolean
}
```

**Invariants (enforced at construction):**

- Must have valid ID
- Must have valid name
- Must have hierarchy information
- Employee count cannot be negative

**Business Rules Enforced:**

- Name changes require uniqueness check (service layer)
- Moving department prevents circular references
- Deletion requires zero employees
- Sync status updates when data changes
- Manager assignment validated by service

### 3. Domain Errors

**Purpose:** Type-safe error handling with meaningful messages

```typescript
// src/domain/Department/errors.ts
export abstract class DomainError extends Error

export class ValidationError extends DomainError
export class DepartmentNotFoundError extends DomainError
export class DepartmentAlreadyExistsError extends DomainError
export class CircularHierarchyError extends DomainError
export class HierarchyDepthExceededError extends DomainError
export class DepartmentHasEmployeesError extends DomainError
export class DepartmentHasChildrenError extends DomainError
export class DepartmentInvariantViolationError extends DomainError
export class ManagerNotInDepartmentWarning extends DomainError
```

**Usage:**

```typescript
const result = await service.createDepartment(input);
if (result.isError) {
	// TypeScript knows result.error is DomainError
	console.error(result.error.message);
	return fail(400, { error: result.error.message });
}
// TypeScript knows result.value is Department
const dept = result.value;
```

---

## Repository Port

**Purpose:** Define data access interface without implementation details

```typescript
// src/domain/Department/DepartmentRepository.ts
export interface DepartmentRepository {
	// Queries
	findById(id: string): Promise<Department | null>;
	findByName(name: DepartmentName): Promise<Department | null>;
	findAll(filters?: DepartmentFilters): Promise<DepartmentQueryResult>;
	findChildren(parentId: string): Promise<Department[]>;
	findAncestors(departmentId: string): Promise<Department[]>;
	findDescendants(departmentId: string): Promise<Department[]>;
	getEmployeeCount(departmentId: string): Promise<number>;
	isNameUnique(name: DepartmentName, excludeId?: string): Promise<boolean>;

	// Commands
	save(department: Department): Promise<Result<Department, DomainError>>;
	update(department: Department): Promise<Result<Department, DomainError>>;
	delete(id: string): Promise<Result<boolean, DomainError>>;
	bulkUpdate(departments: Department[]): Promise<Result<Department[], DomainError>>;
}
```

**Design Decisions:**

- Returns null for not found (not an error)
- Returns Result<T, E> for operations that can fail
- Includes hierarchy navigation methods
- Employee count separate (may integrate with EmployeeRepository later)

---

## Service Layer

**Purpose:** Orchestrate business workflows and coordinate repository calls

### DepartmentService

**Key Operations:**

```typescript
export class DepartmentService {
  constructor(
    private readonly repository: DepartmentRepository,
    private readonly employeeRepository?: EmployeeRepository // Optional for manager validation
  )

  // CRUD
  async createDepartment(input: CreateDepartmentInput): Promise<Result<Department, DomainError>>
  async getDepartmentById(id: string): Promise<Result<Department, DomainError>>
  async getDepartments(filters?): Promise<DepartmentQueryResult>
  async updateDepartment(id: string, input: UpdateDepartmentInput): Promise<Result<Department, DomainError>>
  async deleteDepartment(id: string, strategy: DeleteStrategy): Promise<Result<boolean, DomainError>>

  // Hierarchy operations
  async moveDepartment(id: string, input: MoveDepartmentInput): Promise<Result<Department, DomainError>>
  async getDepartmentTree(): Promise<DepartmentTreeNode[]>
  async getOrganizationChart(): Promise<OrgChartData>

  // Private helpers
  private async updateDescendantHierarchies(departmentId: string, newHierarchy: DepartmentHierarchy): Promise<void>
}
```

**Business Workflows:**

**Create Department:**

1. Validate name format (value object)
2. Check name uniqueness (repository)
3. Validate parent exists (if specified)
4. Build hierarchy with depth check (adapter fetches ancestor chain recursively)
5. Validate manager exists (requires EmployeeRepository injection)
6. Create entity
7. Persist via repository

**Move Department:**

1. Find department to move
2. Validate new parent exists
3. Check circular reference (cannot move to descendant)
4. Check depth limit with new parent
5. Update department hierarchy
6. Recursively update all descendant hierarchies
7. Bulk persist changes

**Delete Department:**

1. Find department
2. Check employee count (must be zero)
3. Handle children based on strategy:
   - FailIfChildren: Return error if has children
   - MoveChildrenToParent: Move to parent before delete
   - MoveChildrenToRoot: Move to root before delete
4. Soft delete

### Delete Strategies

```typescript
export enum DeleteStrategy {
	FailIfChildren = 'fail_if_children', // Default - safe
	MoveChildrenToParent = 'move_to_parent', // Preserve hierarchy
	MoveChildrenToRoot = 'move_to_root' // Flatten hierarchy
}
```

---

## Adapter Layer

### GraphQLDepartmentAdapter

**Purpose:** Implement repository port using GraphQL backend

**Responsibilities:**

- Translate GraphQL responses to domain entities
- Data sanitization at boundary
- Client-side filtering (backend limitation)
- Caching for performance (30-second TTL)
- Resilient error handling

**Key Implementation Details:**

```typescript
export class GraphQLDepartmentAdapter implements DepartmentRepository {
  private departmentCache = new Map<string, Department>();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 30000;

  constructor(private readonly client: Client) {}

  // Data translation at boundary
  private toDomainEntity(gqlDept: GraphQLDepartment): Department | null {
    // Validate and create value objects
    const nameResult = DepartmentName.create(gqlDept.name);
    if (nameResult.isError) {
      console.warn(`Invalid department name: ${gqlDept.name}`);
      return null; // Resilient - skip invalid data
    }

    // Build hierarchy (ancestors computed by service)
    const hierarchy = gqlDept.parentDepartmentId
      ? DepartmentHierarchy.createChild(gqlDept.parentDepartmentId, [])
      : DepartmentHierarchy.createRoot();

    // Create entity from persistence
    return Department.fromPersistence({...});
  }

  // Client-side filtering (backend doesn't support yet)
  private applyFilters(departments: Department[], filters?: DepartmentFilters) {
    let filtered = departments;

    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(dept =>
        dept.name.getValue().toLowerCase().includes(term) ||
        dept.description?.toLowerCase().includes(term)
      );
    }

    // Apply other filters...

    // Pagination
    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return { departments: paginated, total, limit, offset };
  }
}
```

**GraphQL Queries:**

```graphql
query GetDepartments($limit: Int, $offset: Int) {
  departments(limit: $limit, offset: $offset) {
    id
    name
    description
    parentDepartmentId
    managerId
    intuitDepartmentId
    syncStatus
    lastSyncedAt
    createdAt
    updatedAt
  }
}

mutation CreateDepartment($input: CreateDepartmentInput!) {
  createDepartment(input: $input) { ... }
}

mutation UpdateDepartment($id: UUID!, $input: UpdateDepartmentInput!) {
  updateDepartment(id: $id, input: $input) { ... }
}

mutation DeleteDepartment($id: UUID!) {
  deleteDepartment(id: $id)
}
```

**Error Handling:**

- Invalid data → return null (log warning)
- GraphQL errors → map to domain errors
- Constraint violations → specific error types
- Network failures → graceful degradation

---

## Route Integration

### Factory Function

```typescript
// src/lib/server/services/department.ts
export function createDepartmentService(event: RequestEvent): DepartmentService {
	const client = createUrqlClient(
		event.fetch,
		undefined,
		undefined,
		serializeCookies(event.cookies)
	);

	const adapter = new GraphQLDepartmentAdapter(client);
	return new DepartmentService(adapter);
}
```

### Updated +page.server.ts Pattern

**Before (50+ lines):**

```typescript
const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));
const result = await client.query(GET_DEPARTMENTS_QUERY, { limit, offset }).toPromise();

// Manual validation
if (!name || name.trim().length < 2) {
	return fail(400, { error: 'Invalid name' });
}

// Manual duplicate check
const existing = departments.find((d) => d.name.toLowerCase() === name.toLowerCase());

// Client-side enrichment
const enriched = departments.map((dept) => {
	const employeeCount = users.filter((u) => u.departmentId === dept.id).length;
	// ... more enrichment
});
```

**After (5 lines):**

```typescript
const departmentService = createDepartmentService(event);
const result = await departmentService.createDepartment(input);
if (result.isError) {
	return fail(400, { error: result.error.message });
}
```

### Example Routes

**List Page:**

```typescript
// src/routes/dashboard/departments/+page.server.ts
export const load: PageServerLoad = async (event) => {
	const departmentService = createDepartmentService(event);

	const result = await departmentService.getDepartments({
		searchTerm: url.searchParams.get('search') ?? undefined,
		limit: 20,
		offset: 0
	});

	return {
		departments: result.departments.map((dept) => ({
			id: dept.id,
			name: dept.name.getValue(),
			employeeCount: dept.employeeCount,
			isRoot: dept.isRoot(),
			depth: dept.hierarchy.getDepth()
		}))
	};
};

export const actions: Actions = {
	create: async (event) => {
		const departmentService = createDepartmentService(event);
		const result = await departmentService.createDepartment({
			name: formData.get('name'),
			description: formData.get('description'),
			parentDepartmentId: formData.get('parentId')
		});

		if (result.isError) {
			return fail(400, { error: result.error.message });
		}

		return { success: true };
	}
};
```

**Detail Page:**

```typescript
// src/routes/dashboard/departments/[id]/+page.server.ts
export const load: PageServerLoad = async (event) => {
	const departmentService = createDepartmentService(event);

	const deptResult = await departmentService.getDepartmentById(params.id);
	if (deptResult.isError) {
		throw error(404, deptResult.error.message);
	}

	const dept = deptResult.value;
	const children = await departmentService.getDepartments({
		parentDepartmentId: dept.id
	});

	return {
		department: {
			id: dept.id,
			name: dept.name.getValue(),
			canBeDeleted: (await dept.canBeDeleted()).isOk
		},
		children: children.departments
	};
};
```

**API Endpoint (Name Validation):**

```typescript
// src/routes/api/departments/validate-name/+server.ts
export const GET: RequestHandler = async (event) => {
	const name = url.searchParams.get('name');

	const nameResult = DepartmentName.create(name);
	if (nameResult.isError) {
		return json({ valid: false, error: nameResult.error.message });
	}

	const departmentService = createDepartmentService(event);
	const isUnique = await departmentService['repository'].isNameUnique(nameResult.value);

	return json({ valid: isUnique });
};
```

---

## Testing Strategy

### 1. Domain Layer Tests (Fast, No I/O)

**Value Objects:**

```typescript
// tests/unit/domain/Department/DepartmentName.test.ts
describe('DepartmentName', () => {
	it('creates valid name', () => {
		const result = DepartmentName.create('Engineering');
		expect(result.isOk).toBe(true);
	});

	it('rejects empty name', () => {
		const result = DepartmentName.create('');
		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(ValidationError);
	});

	it('rejects name too short', () => {
		const result = DepartmentName.create('X');
		expect(result.isError).toBe(true);
	});

	it('compares case-insensitively', () => {
		const name1 = DepartmentName.create('Engineering').value;
		const name2 = DepartmentName.create('engineering').value;
		expect(name1.equalsIgnoreCase(name2)).toBe(true);
	});
});

// tests/unit/domain/Department/DepartmentHierarchy.test.ts
describe('DepartmentHierarchy', () => {
	it('creates root hierarchy', () => {
		const hierarchy = DepartmentHierarchy.createRoot();
		expect(hierarchy.isRoot()).toBe(true);
		expect(hierarchy.getDepth()).toBe(0);
	});

	it('enforces max depth of 5 levels', () => {
		const ancestors = ['a', 'b', 'c', 'd', 'e'];
		const result = DepartmentHierarchy.createChild('f', ancestors);
		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(HierarchyDepthExceededError);
	});

	it('detects circular references', () => {
		const hierarchy = DepartmentHierarchy.createChild('parent', ['grandparent']).value;
		expect(hierarchy.wouldCreateCircle('grandparent')).toBe(true);
	});
});
```

**Entity:**

```typescript
// tests/unit/domain/Department/Department.test.ts
describe('Department', () => {
	it('creates new department', () => {
		const name = DepartmentName.create('Engineering').value;
		const hierarchy = DepartmentHierarchy.createRoot();

		const result = Department.create(name, 'Desc', hierarchy, null);
		expect(result.isOk).toBe(true);
		expect(result.value.name.getValue()).toBe('Engineering');
	});

	it('renames department', () => {
		const dept = createTestDepartment();
		const newName = DepartmentName.create('New Name').value;

		const result = dept.rename(newName);
		expect(result.isOk).toBe(true);
		expect(result.value.name.getValue()).toBe('New Name');
	});

	it('prevents deletion with employees', () => {
		const dept = createTestDepartment();
		const withEmployees = dept.updateEmployeeCount(5).value;

		const result = withEmployees.canBeDeleted();
		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(DepartmentHasEmployeesError);
	});

	it('marks for sync after changes', () => {
		const dept = createSyncedDepartment();
		const updated = dept.updateDescription('New description');

		expect(dept.syncStatus).toBe(SyncStatus.Synced);
		expect(updated.syncStatus).toBe(SyncStatus.PendingSync);
	});
});
```

**Target:** 150+ domain tests (match Employee module coverage)

### 2. Service Layer Tests (Mock Repository)

```typescript
// tests/unit/services/DepartmentService.test.ts
describe('DepartmentService', () => {
	let service: DepartmentService;
	let mockRepo: jest.Mocked<DepartmentRepository>;

	beforeEach(() => {
		mockRepo = createMockRepository();
		service = new DepartmentService(mockRepo);
	});

	it('creates department with unique name', async () => {
		mockRepo.isNameUnique.mockResolvedValue(true);
		mockRepo.save.mockResolvedValue(ok(createTestDepartment()));

		const result = await service.createDepartment({
			name: 'Engineering',
			description: null,
			parentDepartmentId: null,
			managerId: null
		});

		expect(result.isOk).toBe(true);
		expect(mockRepo.isNameUnique).toHaveBeenCalled();
		expect(mockRepo.save).toHaveBeenCalled();
	});

	it('rejects duplicate department name', async () => {
		mockRepo.isNameUnique.mockResolvedValue(false);

		const result = await service.createDepartment({
			name: 'Engineering'
		});

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(DepartmentAlreadyExistsError);
		expect(mockRepo.save).not.toHaveBeenCalled();
	});

	it('moves department and updates descendants', async () => {
		const dept = createTestDepartment();
		const newParent = createTestDepartment();
		const child = createTestDepartment();

		mockRepo.findById.mockResolvedValueOnce(dept);
		mockRepo.findById.mockResolvedValueOnce(newParent);
		mockRepo.findDescendants.mockResolvedValue([]);
		mockRepo.findChildren.mockResolvedValue([child]);
		mockRepo.update.mockResolvedValue(ok(dept));
		mockRepo.bulkUpdate.mockResolvedValue(ok([child]));

		const result = await service.moveDepartment(dept.id, {
			newParentId: newParent.id
		});

		expect(result.isOk).toBe(true);
		expect(mockRepo.bulkUpdate).toHaveBeenCalled();
	});
});
```

### 3. Adapter Tests (Mock GraphQL Client)

```typescript
// tests/unit/adapters/GraphQLDepartmentAdapter.test.ts
describe('GraphQLDepartmentAdapter', () => {
  let adapter: GraphQLDepartmentAdapter;
  let mockClient: MockUrqlClient;

  beforeEach(() => {
    mockClient = createMockUrqlClient();
    adapter = new GraphQLDepartmentAdapter(mockClient as any);
  });

  it('finds department by id', async () => {
    mockClient.mockQuery(GET_DEPARTMENT_BY_ID_QUERY, {
      department: {
        id: '123',
        name: 'Engineering',
        // ... other fields
      }
    });

    const result = await adapter.findById('123');
    expect(result).not.toBeNull();
    expect(result!.name.getValue()).toBe('Engineering');
  });

  it('returns null for invalid data', async () => {
    mockClient.mockQuery(GET_DEPARTMENT_BY_ID_QUERY, {
      department: {
        id: '123',
        name: '', // Invalid - too short
      }
    });

    const result = await adapter.findById('123');
    expect(result).toBeNull(); // Resilient - skip invalid data
  });

  it('applies client-side filters', async () => {
    mockClient.mockQuery(GET_DEPARTMENTS_QUERY, {
      departments: [
        { name: 'Engineering', ... },
        { name: 'Marketing', ... },
        { name: 'Sales', ... }
      ]
    });

    const result = await adapter.findAll({
      searchTerm: 'eng'
    });

    expect(result.departments).toHaveLength(1);
    expect(result.departments[0].name.getValue()).toBe('Engineering');
  });
});
```

### 4. Integration Tests (Route Layer)

```typescript
// tests/integration/routes/departments.test.ts
describe('Department Routes', () => {
	it('creates department via form action', async () => {
		const formData = new FormData();
		formData.set('name', 'Engineering');
		formData.set('description', 'Software development');

		const response = await POST('/dashboard/departments?/create', formData);
		expect(response.status).toBe(200);
		expect(response.data.success).toBe(true);
	});

	it('rejects duplicate name', async () => {
		// Create first department
		await createDepartment('Engineering');

		// Try to create duplicate
		const formData = new FormData();
		formData.set('name', 'Engineering');

		const response = await POST('/dashboard/departments?/create', formData);
		expect(response.status).toBe(400);
		expect(response.data.error).toContain('already exists');
	});
});
```

**Coverage Target:**

- Domain layer: 100% (pure logic, easy to test)
- Service layer: 90%+ (mock repository)
- Adapter layer: 85%+ (mock GraphQL client)
- Integration: Critical paths only

---

## Migration Plan

### Phase 1: Domain Layer (Week 1)

**Days 1-2: Value Objects & Entity**

- [ ] Create `src/domain/Department/` directory
- [ ] Implement `DepartmentName.ts` with tests
- [ ] Implement `DepartmentHierarchy.ts` with tests
- [ ] Implement `Department.ts` entity with tests
- [ ] Implement domain errors in `errors.ts`
- [ ] Target: 80+ tests passing

**Days 3-4: Repository Port & Service**

- [ ] Define `DepartmentRepository.ts` interface
- [ ] Implement `DepartmentService.ts` with core operations
- [ ] Create mock repository for testing
- [ ] Write service layer tests
- [ ] Target: 120+ total tests passing

**Day 5: Adapter Implementation**

- [ ] Implement `GraphQLDepartmentAdapter.ts`
- [ ] Write adapter tests with mock GraphQL client
- [ ] Create factory function `createDepartmentService()`
- [ ] Target: 150+ total tests passing

### Phase 2: Route Migration (Week 2)

**Days 1-2: Core CRUD Routes**

- [ ] Update `src/routes/dashboard/departments/+page.server.ts`
  - Replace direct GraphQL with service calls
  - Update load function
  - Update create/update/delete actions
- [ ] Update `src/routes/dashboard/departments/[id]/+page.server.ts`
  - Use service for department details
  - Update employee count display
  - Add hierarchy breadcrumb
- [ ] Mark old GraphQL operations as `@deprecated`

**Days 3-4: Hierarchy & Org Chart**

- [ ] Create move department action
- [ ] Update org chart route to use `getDepartmentTree()`
- [ ] Update hierarchy visualization components
- [ ] Add delete strategy UI

**Day 5: API Endpoints & Polish**

- [ ] Create `/api/departments/validate-name` endpoint
- [ ] Update autocomplete endpoints
- [ ] Remove legacy GraphQL queries
- [ ] Documentation updates

### Phase 3: Integration & Testing (Week 3)

**Days 1-2: Employee Integration**

- [ ] Add employee validation to service
  - Manager must exist
  - Manager should be in department (warning)
- [ ] Add employee count refresh logic
- [ ] Integration tests with EmployeeService

**Days 3-4: QuickBooks Integration**

- [ ] Test sync status transitions
- [ ] Verify sync triggers after changes
- [ ] Integration tests with Intuit sync

**Day 5: E2E Tests & Deployment**

- [ ] E2E tests for critical flows
- [ ] Performance testing (check query counts)
- [ ] Deploy to staging
- [ ] Monitor for issues

---

## Success Criteria

### Functional Requirements

- ✅ All department CRUD operations work via service
- ✅ Name uniqueness enforced (case-insensitive)
- ✅ Hierarchy depth limited to 5 levels
- ✅ Circular references prevented
- ✅ Cannot delete department with employees
- ✅ Delete strategies implemented
- ✅ Move department updates all descendants
- ✅ QuickBooks sync status tracked correctly

### Technical Requirements

- ✅ Zero `any` types in domain/service/adapter
- ✅ 150+ tests passing (match Employee module)
- ✅ Result<T, E> pattern throughout
- ✅ All routes migrated to service
- ✅ Legacy GraphQL operations removed or deprecated
- ✅ No regression in existing functionality

### Quality Requirements

- ✅ Domain layer tests run in < 100ms (no I/O)
- ✅ TypeScript strict mode passes
- ✅ All Vitest tests green
- ✅ No console errors in dev/staging
- ✅ Performance acceptable (no N+1 queries)

---

## Future Enhancements

### Short Term (Next Sprint)

- Integrate with EmployeeRepository for manager validation
- Add department transfer wizard (move employees + children)
- Implement department templates
- Add department merge operation

### Medium Term (Next Quarter)

- Task filtering by department hierarchy
- Document visibility inheritance
- Department-level permissions
- Analytics dashboard per department

### Long Term (Next 6 Months)

- Department budget tracking
- Goal cascading (org → dept → team → individual)
- Department-level approval workflows
- Cost center integration

---

## References

### Code Examples

- Employee module: `src/domain/Employee/`
- EmployeeService: `src/services/EmployeeService.ts`
- GraphQLEmployeeAdapter: `src/adapters/GraphQLEmployeeAdapter.ts`
- Employee tests: `tests/unit/domain/Employee/`

### Documentation

- Hexagonal Architecture: Martin Fowler
- Domain-Driven Design: Eric Evans
- Result<T, E> pattern: Rust std::result
- Employee module: 156 tests, 100% passing

### Design Decisions

- Immutable entities (functional style)
- Value objects for validated primitives
- Repository pattern for data access
- Service layer for workflows
- Result<T, E> over exceptions
- Client-side filtering (backend limitation)

#### Implementation Decisions (2026-02-05)

**Manager Validation:**

- DepartmentService accepts optional EmployeeRepository for validation
- Manager existence checked before assignment
- Manager ideally in same department (warning, not error)

**Ancestor Chain Computation:**

- Adapter fetches parent departments recursively to build full chain
- Accept N+1 query cost for correctness
- Future: Consider denormalized ancestor_ids column

**Bulk Operations:**

- Wrap in database transaction when backend supports it
- Document partial update limitation in Phase 1
- Service returns error on first failure (stops bulk operation)

**Employee Count:**

- Backend should add aggregation query `countEmployeesByDepartment(departmentId)`
- Fall back to client-side counting if not available
- Cache with 30-second TTL

**Permissions:**

- Leave in route layer (RBACDataLoader pattern)
- Domain layer stays permission-agnostic
- Follows Employee module pattern

**QuickBooks Sync:**

- App is source of truth, not imperative for QB to match
- Track sync status, handle conflicts in Phase 3/4
- Sync failures don't block app operations

**Error Mapping:**

- Comprehensive GraphQL error to domain error mapping in adapter
- Handle constraint violations, foreign key errors, not found errors
- Log unexpected errors, return generic DomainError
