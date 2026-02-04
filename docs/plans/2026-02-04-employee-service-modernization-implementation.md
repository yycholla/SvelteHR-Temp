# Employee Service Modernization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Achieve 100% EmployeeService utilization by completing updateEmployee(), adding backend queries, migrating routes, and exposing delete/bulk operations.

**Architecture:** Layered implementation - domain methods first, then backend queries, then route migrations, then UI exposure. Each phase builds on the previous.

**Tech Stack:** SvelteKit 2.43+, Svelte 5, TypeScript 5, Rust (Async-GraphQL, SeaORM), Vitest

---

## Phase 1: Complete updateEmployee()

### Task 1: Add updateFirstName Domain Method

**Files:**

- Modify: `src/domain/Employee/Employee.ts`
- Test: `src/domain/Employee/Employee.test.ts`

**Step 1: Write the failing test**

```typescript
describe('updateFirstName', () => {
	it('should update first name with valid value', () => {
		const employee = createValidEmployee({ firstName: 'John', lastName: 'Doe' });
		const result = employee.updateFirstName('Jane');

		expect(result.isOk).toBe(true);
		expect(employee.name.first).toBe('Jane');
		expect(employee.name.last).toBe('Doe'); // unchanged
	});

	it('should reject invalid first name (too short)', () => {
		const employee = createValidEmployee();
		const result = employee.updateFirstName('J');

		expect(result.isError).toBe(true);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/domain/Employee/Employee.test.ts`
Expected: FAIL with "updateFirstName is not a function"

**Step 3: Write minimal implementation**

```typescript
updateFirstName(firstName: string): Result<void, DomainError> {
  const nameResult = PersonName.create(firstName, this.name.last);
  if (nameResult.isError) {
    return Result.error(nameResult.error);
  }
  this._name = nameResult.value;
  return Result.ok(undefined);
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/domain/Employee/Employee.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/domain/Employee/Employee.ts src/domain/Employee/Employee.test.ts
git commit -m "feat(domain): add updateFirstName method to Employee entity"
```

---

### Task 2: Add updateLastName Domain Method

**Files:**

- Modify: `src/domain/Employee/Employee.ts`
- Test: `src/domain/Employee/Employee.test.ts`

**Step 1: Write the failing test**

```typescript
describe('updateLastName', () => {
	it('should update last name with valid value', () => {
		const employee = createValidEmployee({ firstName: 'John', lastName: 'Doe' });
		const result = employee.updateLastName('Smith');

		expect(result.isOk).toBe(true);
		expect(employee.name.last).toBe('Smith');
		expect(employee.name.first).toBe('John'); // unchanged
	});

	it('should reject invalid last name (empty)', () => {
		const employee = createValidEmployee();
		const result = employee.updateLastName('');

		expect(result.isError).toBe(true);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/domain/Employee/Employee.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
updateLastName(lastName: string): Result<void, DomainError> {
  const nameResult = PersonName.create(this.name.first, lastName);
  if (nameResult.isError) {
    return Result.error(nameResult.error);
  }
  this._name = nameResult.value;
  return Result.ok(undefined);
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/domain/Employee/Employee.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/domain/Employee/Employee.ts src/domain/Employee/Employee.test.ts
git commit -m "feat(domain): add updateLastName method to Employee entity"
```

---

### Task 3: Add updateEmail Domain Method

**Files:**

- Modify: `src/domain/Employee/Employee.ts`
- Test: `src/domain/Employee/Employee.test.ts`

**Step 1: Write the failing test**

```typescript
describe('updateEmail', () => {
	it('should update email with valid value', () => {
		const employee = createValidEmployee({ email: 'old@example.com' });
		const result = employee.updateEmail('new@example.com');

		expect(result.isOk).toBe(true);
		expect(employee.email.value).toBe('new@example.com');
	});

	it('should reject invalid email format', () => {
		const employee = createValidEmployee();
		const result = employee.updateEmail('not-an-email');

		expect(result.isError).toBe(true);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/domain/Employee/Employee.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
updateEmail(email: string): Result<void, DomainError> {
  const emailResult = Email.create(email);
  if (emailResult.isError) {
    return Result.error(emailResult.error);
  }
  this._email = emailResult.value;
  return Result.ok(undefined);
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/domain/Employee/Employee.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/domain/Employee/Employee.ts src/domain/Employee/Employee.test.ts
git commit -m "feat(domain): add updateEmail method to Employee entity"
```

---

### Task 4: Update Type Definitions

**Files:**

- Modify: `src/domain/Employee/types.ts`

**Step 1: Update UpdateEmployeeData interface**

Add firstName, lastName, email to the interface:

```typescript
export interface UpdateEmployeeData {
	firstName?: string;
	lastName?: string;
	email?: string;
	jobTitle?: string;
	phone?: string | null;
	departmentId?: string | null;
}
```

**Step 2: Run type check**

Run: `npm run check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/domain/Employee/types.ts
git commit -m "feat(domain): expand UpdateEmployeeData with name and email fields"
```

---

### Task 5: Update EmployeeService.updateEmployee()

**Files:**

- Modify: `src/services/EmployeeService.ts`
- Test: `src/services/EmployeeService.test.ts`

**Step 1: Write failing tests for new fields**

```typescript
describe('updateEmployee - expanded fields', () => {
	it('should update firstName', async () => {
		const employee = await seedEmployee(mockRepository, { firstName: 'John' });
		const result = await service.updateEmployee(employee.id, { firstName: 'Jane' });

		expect(result.isOk).toBe(true);
		expect(result.value?.name.first).toBe('Jane');
	});

	it('should update email with duplicate check', async () => {
		await seedEmployee(mockRepository, { email: 'taken@example.com' });
		const employee = await seedEmployee(mockRepository, { email: 'mine@example.com' });

		const result = await service.updateEmployee(employee.id, { email: 'taken@example.com' });

		expect(result.isError).toBe(true);
		expect(result.error?.code).toBe('EMPLOYEE_ALREADY_EXISTS');
	});

	it('should allow keeping same email', async () => {
		const employee = await seedEmployee(mockRepository, { email: 'same@example.com' });

		const result = await service.updateEmployee(employee.id, {
			email: 'same@example.com',
			firstName: 'Updated'
		});

		expect(result.isOk).toBe(true);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/services/EmployeeService.test.ts`
Expected: FAIL

**Step 3: Update implementation**

Remove the TODO comment and add handling for firstName, lastName, email:

```typescript
async updateEmployee(id: string, data: UpdateEmployeeData): Promise<Result<Employee, DomainError>> {
  try {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      return Result.error(new EmployeeNotFoundError(id));
    }

    // New: Update name fields
    if (data.firstName !== undefined) {
      const result = employee.updateFirstName(data.firstName);
      if (result.isError) return Result.error(result.error);
    }

    if (data.lastName !== undefined) {
      const result = employee.updateLastName(data.lastName);
      if (result.isError) return Result.error(result.error);
    }

    // New: Update email with duplicate check
    if (data.email !== undefined && data.email !== employee.email.value) {
      const existing = await this.employeeRepository.findByEmail(data.email);
      if (existing && existing.id !== id) {
        return Result.error(new EmployeeAlreadyExistsError(data.email));
      }
      const result = employee.updateEmail(data.email);
      if (result.isError) return Result.error(result.error);
    }

    // Existing: Update other fields
    if (data.jobTitle !== undefined) {
      const result = employee.updateJobTitle(data.jobTitle);
      if (result.isError) return Result.error(result.error);
    }

    if (data.phone !== undefined) {
      const result = employee.updatePhone(data.phone);
      if (result.isError) return Result.error(result.error);
    }

    if (data.departmentId !== undefined) {
      const result = employee.changeDepartment(data.departmentId);
      if (result.isError) return Result.error(result.error);
    }

    const updatedEmployee = await this.employeeRepository.update(id, employee);
    return Result.ok(updatedEmployee);
  } catch (error) {
    return Result.error(
      new DomainError('Failed to update employee', 'EMPLOYEE_UPDATE_FAILED', {
        employeeId: id,
        originalError: error
      })
    );
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/services/EmployeeService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/EmployeeService.ts src/services/EmployeeService.test.ts
git commit -m "feat(service): complete updateEmployee with name and email support"
```

---

### Task 6: Phase 1 Verification

**Step 1: Run all domain tests**

Run: `npm run test:unit -- --run src/domain/`
Expected: All tests PASS

**Step 2: Run all service tests**

Run: `npm run test:unit -- --run src/services/`
Expected: All tests PASS

**Step 3: Run type check**

Run: `npm run check`
Expected: PASS

---

## Phase 2a: Backend userByEmail Query

### Task 7: Add userByEmail Query to Rust Backend

**Files:**

- Modify: `graphql-rust-server/src/schema/queries/user.rs`

**Step 1: Add the query method**

```rust
/// Get a single user by email address
async fn user_by_email(
    &self,
    ctx: &Context<'_>,
    email: String,
) -> Result<Option<User>> {
    let db = get_db_from_context(ctx)?;

    let user_context = ctx.data::<UserContext>()
        .map_err(|_| async_graphql::Error::new("Authentication required"))?;

    let normalized_email = email.to_lowercase();

    let mut query = UserEntity::find()
        .filter(UserColumn::Email.eq(&normalized_email))
        .filter(UserColumn::DeletedAt.is_null());

    query = UserEntity::apply_rls(query, user_context);

    let user = query.one(&db).await?;
    Ok(user)
}
```

**Step 2: Build and verify**

Run: `cd graphql-rust-server && cargo build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add graphql-rust-server/src/schema/queries/user.rs
git commit -m "feat(backend): add userByEmail query for efficient email lookup"
```

---

### Task 8: Update Adapter to Use userByEmail

**Files:**

- Modify: `src/adapters/GraphQLEmployeeAdapter.ts`

**Step 1: Update findByEmail method**

Replace client-side filtering with direct query:

```typescript
async findByEmail(email: string): Promise<Employee | null> {
  const query = gql`
    query GetUserByEmail($email: String!) {
      userByEmail(email: $email) {
        id
        email
        firstName
        lastName
        displayName
        jobTitle
        phoneNumber
        departmentId
        isActive
        status
        hireDate
        createdAt
        updatedAt
      }
    }
  `;

  try {
    const result = await this.client.query(query, { email: email.toLowerCase() }).toPromise();

    if (result.error) {
      console.error('GraphQL error in findByEmail:', result.error);
      return null;
    }

    const userData = result.data?.userByEmail;
    if (!userData) {
      return null;
    }

    return this.mapToEmployee(userData);
  } catch (error) {
    console.error('Error in findByEmail:', error);
    return null;
  }
}
```

**Step 2: Remove CLIENT_SIDE_FILTER_LIMIT usage from this method**

Delete the old implementation that fetched all users.

**Step 3: Run type check**

Run: `npm run check`
Expected: PASS

**Step 4: Commit**

```bash
git add src/adapters/GraphQLEmployeeAdapter.ts
git commit -m "feat(adapter): use userByEmail query for efficient duplicate detection"
```

---

## Phase 2b: Migrate Edit Route

### Task 9: Update Edit Route Load Function

**Files:**

- Modify: `src/routes/dashboard/employees/[id]/edit/+page.server.ts`

**Step 1: Import createEmployeeService**

```typescript
import { createEmployeeService } from '$lib/server/services';
```

**Step 2: Replace direct GraphQL with service call**

In the load function, replace the employee query:

```typescript
// Use EmployeeService for core employee data
const employeeService = createEmployeeService(event);
const employeeResult = await employeeService.getEmployeeById(employeeId);

if (employeeResult.isError) {
	if (employeeResult.error.code === 'EMPLOYEE_NOT_FOUND') {
		throw error(404, 'Employee not found');
	}
	throw error(500, employeeResult.error.message);
}

const employeeEntity = employeeResult.value;
```

**Step 3: Update data mapping**

Map from domain entity instead of raw GraphQL:

```typescript
employee: {
  id: employeeEntity.id,
  firstName: employeeEntity.name.first,
  lastName: employeeEntity.name.last,
  email: employeeEntity.email.value,
  // ... etc
}
```

**Step 4: Run type check**

Run: `npm run check`
Expected: PASS

**Step 5: Commit**

```bash
git add src/routes/dashboard/employees/[id]/edit/+page.server.ts
git commit -m "refactor(routes): use EmployeeService in edit route load function"
```

---

### Task 10: Update Edit Route Action

**Files:**

- Modify: `src/routes/dashboard/employees/[id]/edit/+page.server.ts`

**Step 1: Replace direct GraphQL mutation with service call**

```typescript
const employeeService = createEmployeeService(event);

const updateResult = await employeeService.updateEmployee(employeeId, {
	firstName,
	lastName,
	email,
	phone: phoneNumber || null,
	departmentId: departmentId || null,
	jobTitle: jobTitle || null
});

if (updateResult.isError) {
	const err = updateResult.error;

	if (err.code === 'EMPLOYEE_NOT_FOUND') {
		return fail(404, { error: 'Employee not found' });
	}
	if (err.code === 'EMPLOYEE_ALREADY_EXISTS') {
		return fail(400, { error: 'Email already in use', field: 'email' });
	}
	if (err.code === 'INVALID_EMAIL') {
		return fail(400, { error: 'Invalid email format', field: 'email' });
	}
	if (err.code === 'INVALID_NAME') {
		return fail(400, { error: 'Invalid name', field: 'firstName' });
	}

	return fail(500, { error: err.message });
}
```

**Step 2: Keep GraphQL for related entities**

Emergency contacts, vehicles, and role assignment stay as GraphQL.

**Step 3: Run type check**

Run: `npm run check`
Expected: PASS

**Step 4: Test manually**

Run: `npm run dev`
Navigate to edit page, make changes, verify save works.

**Step 5: Commit**

```bash
git add src/routes/dashboard/employees/[id]/edit/+page.server.ts
git commit -m "refactor(routes): use EmployeeService in edit route action"
```

---

## Phase 2c: Backend Filtering + Statistics

### Task 11: Add UserFilter and UserSort to Backend

**Files:**

- Modify: `graphql-rust-server/src/schema/queries/user.rs`

**Step 1: Add input objects**

```rust
#[derive(Debug, Clone, InputObject, Default)]
pub struct UserFilter {
    pub search_term: Option<String>,
    pub department_id: Option<Uuid>,
    pub is_active: Option<bool>,
    pub status: Option<String>,
    pub manager_id: Option<Uuid>,
}

#[derive(Debug, Clone, InputObject, Default)]
pub struct UserSort {
    pub field: Option<String>,
    pub direction: Option<String>,
}
```

**Step 2: Build and verify**

Run: `cd graphql-rust-server && cargo build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add graphql-rust-server/src/schema/queries/user.rs
git commit -m "feat(backend): add UserFilter and UserSort input objects"
```

---

### Task 12: Update Users Query with Filtering

**Files:**

- Modify: `graphql-rust-server/src/schema/queries/user.rs`

**Step 1: Update users query signature**

```rust
async fn users(
    &self,
    ctx: &Context<'_>,
    filter: Option<UserFilter>,
    sort: Option<UserSort>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<User>>
```

**Step 2: Apply filters**

```rust
if let Some(f) = &filter {
    if let Some(search) = &f.search_term {
        let pattern = format!("%{}%", search.to_lowercase());
        query = query.filter(
            sea_orm::Condition::any()
                .add(UserColumn::Email.contains(&pattern))
                .add(UserColumn::FirstName.contains(&pattern))
                .add(UserColumn::LastName.contains(&pattern))
        );
    }
    if let Some(dept_id) = f.department_id {
        query = query.filter(UserColumn::DepartmentId.eq(dept_id));
    }
    if let Some(is_active) = f.is_active {
        query = query.filter(UserColumn::IsActive.eq(is_active));
    }
}
```

**Step 3: Apply sorting**

```rust
if let Some(s) = &sort {
    let direction = s.direction.as_deref().unwrap_or("asc");
    let field = s.field.as_deref().unwrap_or("lastName");

    query = match (field, direction) {
        ("firstName", "desc") => query.order_by_desc(UserColumn::FirstName),
        ("firstName", _) => query.order_by_asc(UserColumn::FirstName),
        ("lastName", "desc") => query.order_by_desc(UserColumn::LastName),
        ("lastName", _) => query.order_by_asc(UserColumn::LastName),
        // ... other fields
        (_, _) => query.order_by_asc(UserColumn::LastName),
    };
}
```

**Step 4: Build and verify**

Run: `cd graphql-rust-server && cargo build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add graphql-rust-server/src/schema/queries/user.rs
git commit -m "feat(backend): add filtering and sorting to users query"
```

---

### Task 13: Add employeeStatistics Query

**Files:**

- Modify: `graphql-rust-server/src/schema/queries/user.rs`

**Step 1: Add result types**

```rust
#[derive(Debug, Clone, SimpleObject)]
pub struct EmployeeStatistics {
    pub total: i64,
    pub active: i64,
    pub inactive: i64,
    pub by_department: Vec<DepartmentCount>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct DepartmentCount {
    pub department_id: Option<Uuid>,
    pub department_name: Option<String>,
    pub count: i64,
}
```

**Step 2: Add query**

```rust
async fn employee_statistics(&self, ctx: &Context<'_>) -> Result<EmployeeStatistics> {
    let db = get_db_from_context(ctx)?;

    let total = UserEntity::find()
        .filter(UserColumn::DeletedAt.is_null())
        .count(&db).await? as i64;

    let active = UserEntity::find()
        .filter(UserColumn::DeletedAt.is_null())
        .filter(UserColumn::IsActive.eq(true))
        .count(&db).await? as i64;

    let inactive = total - active;

    Ok(EmployeeStatistics {
        total,
        active,
        inactive,
        by_department: vec![], // Simplified for now
    })
}
```

**Step 3: Build and verify**

Run: `cd graphql-rust-server && cargo build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add graphql-rust-server/src/schema/queries/user.rs
git commit -m "feat(backend): add employeeStatistics query"
```

---

### Task 14: Update Adapter for Server-Side Filtering

**Files:**

- Modify: `src/adapters/GraphQLEmployeeAdapter.ts`

**Step 1: Update findAll query**

```typescript
const query = gql`
	query GetEmployees($filter: UserFilter, $sort: UserSort, $limit: Int!, $offset: Int!) {
		users(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {
			id
			email
			# ... fields
		}
	}
`;
```

**Step 2: Map filters to backend format**

```typescript
const filter: Record<string, unknown> = {};
if (filters?.searchTerm) filter.searchTerm = filters.searchTerm;
if (filters?.departmentId) filter.departmentId = filters.departmentId;
if (filters?.isActive !== undefined) filter.isActive = filters.isActive;

const sort = filters?.sortBy
	? {
			field: filters.sortBy,
			direction: filters.sortOrder ?? 'asc'
		}
	: undefined;
```

**Step 3: Remove client-side filtering logic**

Delete the old client-side filtering code.

**Step 4: Commit**

```bash
git add src/adapters/GraphQLEmployeeAdapter.ts
git commit -m "refactor(adapter): use server-side filtering in findAll"
```

---

### Task 15: Add getStatistics to Adapter and Service

**Files:**

- Modify: `src/adapters/GraphQLEmployeeAdapter.ts`
- Modify: `src/services/ports/EmployeeRepository.ts`
- Modify: `src/services/EmployeeService.ts`

**Step 1: Add to repository interface**

```typescript
getStatistics(): Promise<EmployeeStatistics>;
```

**Step 2: Add to adapter**

```typescript
async getStatistics(): Promise<EmployeeStatistics> {
  const query = gql`
    query GetEmployeeStatistics {
      employeeStatistics {
        total
        active
        inactive
        byDepartment { departmentId departmentName count }
      }
    }
  `;
  // ... implementation
}
```

**Step 3: Add to service**

```typescript
async getStatistics(): Promise<Result<EmployeeStatistics, DomainError>> {
  try {
    const stats = await this.employeeRepository.getStatistics();
    return Result.ok(stats);
  } catch (error) {
    return Result.error(new DomainError('Failed to fetch statistics', 'STATISTICS_FETCH_FAILED'));
  }
}
```

**Step 4: Commit**

```bash
git add src/adapters/GraphQLEmployeeAdapter.ts src/services/ports/EmployeeRepository.ts src/services/EmployeeService.ts
git commit -m "feat(service): add getStatistics method"
```

---

### Task 16: Update Dashboard to Use Statistics

**Files:**

- Modify: `src/routes/dashboard/employees/+page.server.ts`

**Step 1: Replace wasteful queries**

```typescript
const [employeesResult, statsResult] = await Promise.all([
	employeeService.getEmployees(filters),
	employeeService.getStatistics()
]);

const stats = statsResult.isOk ? statsResult.value : { total: 0, active: 0, inactive: 0 };
```

**Step 2: Remove STATS_QUERY_LIMIT workaround**

Delete the old parallel queries with limit=10000.

**Step 3: Commit**

```bash
git add src/routes/dashboard/employees/+page.server.ts
git commit -m "refactor(routes): use getStatistics instead of multiple API calls"
```

---

## Phase 3: Migrate Remaining Routes

### Task 17: Add Roles to Employee Entity

**Files:**

- Modify: `src/domain/Employee/types.ts`
- Modify: `src/domain/Employee/Employee.ts`

**Step 1: Add EmployeeRole type**

```typescript
export interface EmployeeRole {
	readonly id: string;
	readonly name: string;
}
```

**Step 2: Add roles to Employee**

```typescript
private readonly _roles: ReadonlyArray<EmployeeRole>;

get roles(): ReadonlyArray<EmployeeRole> {
  return this._roles;
}

get primaryRole(): string {
  return this._roles[0]?.name ?? 'Employee';
}
```

**Step 3: Update constructor and reconstitute**

**Step 4: Commit**

```bash
git add src/domain/Employee/types.ts src/domain/Employee/Employee.ts
git commit -m "feat(domain): add read-only roles to Employee entity"
```

---

### Task 18: Update Adapter to Fetch Roles

**Files:**

- Modify: `src/adapters/GraphQLEmployeeAdapter.ts`

**Step 1: Add roles to all queries**

```graphql
roles {
  id
  name
}
```

**Step 2: Update mapToEmployee**

```typescript
const roles = (data.roles ?? []).map((r) => ({ id: r.id, name: r.name }));
```

**Step 3: Commit**

```bash
git add src/adapters/GraphQLEmployeeAdapter.ts
git commit -m "feat(adapter): include roles in employee queries"
```

---

### Task 19: Migrate Admin Users Route

**Files:**

- Modify: `src/routes/admin/users/+page.server.ts`

**Step 1: Use EmployeeService**

```typescript
const employeeService = createEmployeeService(event);
const [employeesResult, statsResult] = await Promise.all([
	employeeService.getEmployees(serviceFilters),
	employeeService.getStatistics()
]);
```

**Step 2: Map domain entities to response**

**Step 3: Build roles list from emp.roles**

**Step 4: Commit**

```bash
git add src/routes/admin/users/+page.server.ts
git commit -m "refactor(routes): migrate admin users to EmployeeService"
```

---

### Task 20: Migrate API Assign Documents Route

**Files:**

- Modify: `src/routes/api/employees/[id]/assign-documents/+server.ts`

**Step 1: Use getEmployeeById for verification**

```typescript
const employeeService = createEmployeeService(event);
const employeeResult = await employeeService.getEmployeeById(employeeId);

if (employeeResult.isError) {
	throw error(404, 'Employee not found');
}
```

**Step 2: Commit**

```bash
git add src/routes/api/employees/[id]/assign-documents/+server.ts
git commit -m "refactor(api): use EmployeeService for employee verification"
```

---

## Phase 4: Expose Unused Methods

### Task 21: Add Delete Action to Detail Page

**Files:**

- Modify: `src/routes/dashboard/employees/[id]/+page.server.ts`

**Step 1: Add delete action**

```typescript
export const actions: Actions = {
	delete: async (event) => {
		// Permission check
		// Self-deletion prevention
		const result = await employeeService.deleteEmployee(employeeId);
		// Handle result
		throw redirect(303, '/dashboard/employees?deleted=true');
	}
};
```

**Step 2: Commit**

```bash
git add src/routes/dashboard/employees/[id]/+page.server.ts
git commit -m "feat(routes): add delete action to employee detail page"
```

---

### Task 22: Add Delete Button UI

**Files:**

- Modify: `src/routes/dashboard/employees/[id]/+page.svelte`

**Step 1: Add delete button with AlertDialog**

```svelte
<AlertDialog.Root>
	<AlertDialog.Trigger asChild let:builder>
		<Button builders={[builder]} variant="destructive">Delete</Button>
	</AlertDialog.Trigger>
	<AlertDialog.Content>
		<!-- Confirmation dialog -->
		<form method="POST" action="?/delete">
			<Button type="submit" variant="destructive">Delete</Button>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>
```

**Step 2: Commit**

```bash
git add src/routes/dashboard/employees/[id]/+page.svelte
git commit -m "feat(ui): add delete button with confirmation dialog"
```

---

### Task 23: Add Bulk Actions to Admin Users

**Files:**

- Modify: `src/routes/admin/users/+page.server.ts`

**Step 1: Add bulkActivate action**

**Step 2: Add bulkDeactivate action**

**Step 3: Commit**

```bash
git add src/routes/admin/users/+page.server.ts
git commit -m "feat(routes): add bulk activate/deactivate actions"
```

---

### Task 24: Create BulkActionsToolbar Component

**Files:**

- Create: `src/lib/components/admin/BulkActionsToolbar.svelte`

**Step 1: Create component with selection display and action buttons**

**Step 2: Add confirmation dialogs**

**Step 3: Add success/failure feedback**

**Step 4: Commit**

```bash
git add src/lib/components/admin/BulkActionsToolbar.svelte
git commit -m "feat(ui): create BulkActionsToolbar component"
```

---

### Task 25: Integrate Bulk Actions into Admin Table

**Files:**

- Modify: `src/routes/admin/users/+page.svelte`

**Step 1: Add selection state**

**Step 2: Add checkbox column**

**Step 3: Integrate toolbar**

**Step 4: Commit**

```bash
git add src/routes/admin/users/+page.svelte
git commit -m "feat(ui): integrate bulk actions into admin users table"
```

---

## Final Verification

### Task 26: Full Test Suite

**Step 1: Run all unit tests**

Run: `npm run test:unit`
Expected: All tests PASS

**Step 2: Run type check**

Run: `npm run check`
Expected: PASS

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Manual smoke test**

- [ ] Employee list loads with stats
- [ ] Employee detail page loads
- [ ] Edit page saves changes via service
- [ ] Delete button works
- [ ] Admin users page with bulk actions works
- [ ] Bulk activate/deactivate works

---

## Summary

| Task  | Description                       | Phase    |
| ----- | --------------------------------- | -------- |
| 1-6   | Domain methods + service update   | Phase 1  |
| 7-8   | Backend userByEmail + adapter     | Phase 2a |
| 9-10  | Edit route migration              | Phase 2b |
| 11-16 | Backend filtering/stats + adapter | Phase 2c |
| 17-20 | Roles + remaining routes          | Phase 3  |
| 21-25 | Delete + bulk actions UI          | Phase 4  |
| 26    | Final verification                | All      |

**Total: 26 tasks**
