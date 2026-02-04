# Employee Service Modernization Design

**Date:** 2026-02-04
**Status:** Ready for Implementation
**Estimated Impact:** ~1,060 LOC added/refactored, 100% service utilization

## Overview

This design documents the complete modernization of the EmployeeService, addressing incomplete methods, backend limitations, route migrations, and exposing unused functionality through UI.

### Goals

- Complete `updateEmployee()` with all field support
- Add backend queries for efficient filtering and statistics
- Migrate all employee-related routes to use EmployeeService
- Expose delete and bulk operations via UI
- Achieve 100% service method utilization

### Non-Goals

- Migrating emergency contacts/vehicles to their own services (future work)
- Role CRUD operations (stays in RBAC domain)
- Address management (future work)

---

## Current State Analysis

### Service Method Utilization: 43% (3/7 methods)

| Method              | Status            | Usage                            |
| ------------------- | ----------------- | -------------------------------- |
| `getEmployees()`    | ✅ Active         | List page + stats                |
| `getEmployeeById()` | ✅ Active         | Detail page                      |
| `createEmployee()`  | ✅ Active         | New employee form                |
| `updateEmployee()`  | ❌ **Incomplete** | Missing firstName/lastName/email |
| `deleteEmployee()`  | ❌ Unused         | No UI                            |
| `bulkActivate()`    | ❌ Unused         | No UI                            |
| `bulkDeactivate()`  | ❌ Unused         | No UI                            |

### Key Blockers

1. `updateEmployee()` cannot update core identity fields
2. Backend lacks filtering support (1000 employee ceiling)
3. Backend lacks statistics endpoint (3 wasteful API calls)
4. Edit route uses direct GraphQL (bypasses service)

---

## Phase 1: Complete updateEmployee()

### 1.1 Domain Method Additions

**File:** `src/domain/Employee/Employee.ts`

Add three new methods to the Employee entity:

```typescript
updateFirstName(firstName: string): Result<void, DomainError> {
  const nameResult = PersonName.create(firstName, this.name.last);
  if (nameResult.isError) {
    return Result.error(nameResult.error);
  }
  this._name = nameResult.value;
  return Result.ok(undefined);
}

updateLastName(lastName: string): Result<void, DomainError> {
  const nameResult = PersonName.create(this.name.first, lastName);
  if (nameResult.isError) {
    return Result.error(nameResult.error);
  }
  this._name = nameResult.value;
  return Result.ok(undefined);
}

updateEmail(email: string): Result<void, DomainError> {
  const emailResult = Email.create(email);
  if (emailResult.isError) {
    return Result.error(emailResult.error);
  }
  this._email = emailResult.value;
  return Result.ok(undefined);
}
```

### 1.2 Update Type Definitions

**File:** `src/domain/Employee/types.ts`

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

### 1.3 Update Service Method

**File:** `src/services/EmployeeService.ts`

Expand `updateEmployee()` to handle all fields with duplicate email check:

```typescript
async updateEmployee(id: string, data: UpdateEmployeeData): Promise<Result<Employee, DomainError>> {
  try {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      return Result.error(new EmployeeNotFoundError(id));
    }

    if (data.firstName !== undefined) {
      const result = employee.updateFirstName(data.firstName);
      if (result.isError) return Result.error(result.error);
    }

    if (data.lastName !== undefined) {
      const result = employee.updateLastName(data.lastName);
      if (result.isError) return Result.error(result.error);
    }

    if (data.email !== undefined && data.email !== employee.email.value) {
      const existing = await this.employeeRepository.findByEmail(data.email);
      if (existing && existing.id !== id) {
        return Result.error(new EmployeeAlreadyExistsError(data.email));
      }
      const result = employee.updateEmail(data.email);
      if (result.isError) return Result.error(result.error);
    }

    // Existing field updates...
    if (data.jobTitle !== undefined) { /* ... */ }
    if (data.phone !== undefined) { /* ... */ }
    if (data.departmentId !== undefined) { /* ... */ }

    const updatedEmployee = await this.employeeRepository.update(id, employee);
    return Result.ok(updatedEmployee);
  } catch (error) {
    return Result.error(new DomainError('Failed to update employee', 'EMPLOYEE_UPDATE_FAILED', { employeeId: id }));
  }
}
```

### 1.4 Tests

**Domain Tests:** `src/domain/Employee/Employee.test.ts`

- Test `updateFirstName()` success and validation failure
- Test `updateLastName()` success and validation failure
- Test `updateEmail()` success and validation failure

**Service Tests:** `src/services/EmployeeService.test.ts`

- Test partial updates (only firstName)
- Test email duplicate detection
- Test keeping same email on update
- Test non-existent employee error

---

## Phase 2a: Backend userByEmail Query

### 2.1 Add Query

**File:** `graphql-rust-server/src/schema/queries/user.rs`

```rust
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

### 2.2 Update Adapter

**File:** `src/adapters/GraphQLEmployeeAdapter.ts`

Replace client-side filtering in `findByEmail()` with direct query:

```typescript
async findByEmail(email: string): Promise<Employee | null> {
  const query = gql`
    query GetUserByEmail($email: String!) {
      userByEmail(email: $email) {
        id
        email
        firstName
        lastName
        # ... other fields
      }
    }
  `;

  const result = await this.client.query(query, { email: email.toLowerCase() }).toPromise();
  if (!result.data?.userByEmail) return null;
  return this.mapToEmployee(result.data.userByEmail);
}
```

**Benefits:**

- Removes 1000-employee ceiling for duplicate detection
- ~500ms → ~20ms query time

---

## Phase 2b: Migrate Edit Route

### 2.1 Update Load Function

**File:** `src/routes/dashboard/employees/[id]/edit/+page.server.ts`

Use `employeeService.getEmployeeById()` for core data:

```typescript
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

### 2.2 Update Action

Use `employeeService.updateEmployee()` for core field updates:

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
	if (err.code === 'EMPLOYEE_ALREADY_EXISTS') {
		return fail(400, { error: 'Email already in use', field: 'email' });
	}
	// ... other error mappings
}
```

**What Stays GraphQL:**

- Emergency contacts CRUD
- Vehicles CRUD
- Role assignment (RBAC domain)

---

## Phase 2c: Backend Filtering + Statistics

### 2.1 Filter Input Object

**File:** `graphql-rust-server/src/schema/queries/user.rs`

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

### 2.2 Update Users Query

```rust
async fn users(
    &self,
    ctx: &Context<'_>,
    filter: Option<UserFilter>,
    sort: Option<UserSort>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<User>> {
    // ... build query with filters
    if let Some(f) = &filter {
        if let Some(search) = &f.search_term {
            query = query.filter(
                sea_orm::Condition::any()
                    .add(UserColumn::Email.contains(&search))
                    .add(UserColumn::FirstName.contains(&search))
                    // ...
            );
        }
        if let Some(dept_id) = f.department_id {
            query = query.filter(UserColumn::DepartmentId.eq(dept_id));
        }
        // ... other filters
    }
    // ... apply sorting
}
```

### 2.3 Statistics Query

```rust
#[derive(Debug, Clone, SimpleObject)]
pub struct EmployeeStatistics {
    pub total: i64,
    pub active: i64,
    pub inactive: i64,
    pub by_department: Vec<DepartmentCount>,
}

async fn employee_statistics(&self, ctx: &Context<'_>) -> Result<EmployeeStatistics> {
    let total = UserEntity::find().filter(UserColumn::DeletedAt.is_null()).count(&db).await?;
    let active = UserEntity::find().filter(UserColumn::IsActive.eq(true)).count(&db).await?;
    let inactive = UserEntity::find().filter(UserColumn::IsActive.eq(false)).count(&db).await?;
    // ... by_department aggregation
    Ok(EmployeeStatistics { total, active, inactive, by_department })
}
```

### 2.4 Update Frontend Adapter

**File:** `src/adapters/GraphQLEmployeeAdapter.ts`

- Update `findAll()` to use server-side filtering
- Add `getStatistics()` method

### 2.5 Update Dashboard

**File:** `src/routes/dashboard/employees/+page.server.ts`

Replace 3 wasteful API calls with single `getStatistics()`:

```typescript
const [employeesResult, statsResult] = await Promise.all([
	employeeService.getEmployees(filters),
	employeeService.getStatistics()
]);
```

---

## Phase 3: Migrate Remaining Routes

### 3.1 Add Read-Only Roles to Employee

**File:** `src/domain/Employee/types.ts`

```typescript
export interface EmployeeRole {
	readonly id: string;
	readonly name: string;
}
```

**File:** `src/domain/Employee/Employee.ts`

```typescript
private readonly _roles: ReadonlyArray<EmployeeRole>;

get roles(): ReadonlyArray<EmployeeRole> {
  return this._roles;
}

get primaryRole(): string {
  return this._roles[0]?.name ?? 'Employee';
}
```

### 3.2 Update Adapter

Include roles in all user queries and mapping.

### 3.3 Migrate Admin Users Route

**File:** `src/routes/admin/users/+page.server.ts`

- Use `employeeService.getEmployees()` with server-side filtering
- Use `employeeService.getStatistics()` for counts
- Build roles list from `emp.roles`

### 3.4 Migrate API Route

**File:** `src/routes/api/employees/[id]/assign-documents/+server.ts`

- Use `employeeService.getEmployeeById()` to verify employee exists

---

## Phase 4: Expose Unused Methods

### 4.1 Single Employee Delete

**File:** `src/routes/dashboard/employees/[id]/+page.server.ts`

Add delete action:

```typescript
export const actions: Actions = {
	delete: async (event) => {
		// Permission check (Admin/HR Manager only)
		// Prevent self-deletion
		const result = await employeeService.deleteEmployee(employeeId);
		// Redirect to list
	}
};
```

**File:** `src/routes/dashboard/employees/[id]/+page.svelte`

Add delete button with AlertDialog confirmation.

### 4.2 Bulk Operations

**File:** `src/routes/admin/users/+page.server.ts`

Add actions:

```typescript
export const actions: Actions = {
	bulkActivate: async (event) => {
		const result = await employeeService.bulkActivate(employeeIds);
		return { successCount, failureCount };
	},
	bulkDeactivate: async (event) => {
		const result = await employeeService.bulkDeactivate(employeeIds);
		return { successCount, failureCount };
	}
};
```

**File:** `src/lib/components/admin/BulkActionsToolbar.svelte`

New component with:

- Selection count display
- Activate/Deactivate buttons with confirmation
- Success/failure feedback

**File:** `src/routes/admin/users/+page.svelte`

- Add checkbox column for row selection
- Integrate BulkActionsToolbar
- Self-selection prevention

---

## Files Summary

### New Files

| File                                                 | Description          |
| ---------------------------------------------------- | -------------------- |
| `src/lib/components/admin/BulkActionsToolbar.svelte` | Bulk actions toolbar |

### Backend Files to Modify

| File                                             | Changes                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `graphql-rust-server/src/schema/queries/user.rs` | Add `userByEmail`, `UserFilter`, `UserSort`, `employeeStatistics` |

### Frontend Files to Modify

| File                                                        | Changes                                            |
| ----------------------------------------------------------- | -------------------------------------------------- |
| `src/domain/Employee/Employee.ts`                           | Add update methods, roles property                 |
| `src/domain/Employee/types.ts`                              | Add `EmployeeRole`, expand `UpdateEmployeeData`    |
| `src/services/EmployeeService.ts`                           | Complete `updateEmployee()`, add `getStatistics()` |
| `src/services/ports/EmployeeRepository.ts`                  | Add `getStatistics()`                              |
| `src/adapters/GraphQLEmployeeAdapter.ts`                    | Update all methods for new backend queries         |
| `src/routes/dashboard/employees/+page.server.ts`            | Use `getStatistics()`                              |
| `src/routes/dashboard/employees/[id]/+page.server.ts`       | Add delete action                                  |
| `src/routes/dashboard/employees/[id]/+page.svelte`          | Add delete button                                  |
| `src/routes/dashboard/employees/[id]/edit/+page.server.ts`  | Use service for load + action                      |
| `src/routes/admin/users/+page.server.ts`                    | Use service, add bulk actions                      |
| `src/routes/admin/users/+page.svelte`                       | Add selection + toolbar                            |
| `src/routes/api/employees/[id]/assign-documents/+server.ts` | Use `getEmployeeById()`                            |

### Test Files to Modify/Create

| File                                   | Changes                           |
| -------------------------------------- | --------------------------------- |
| `src/domain/Employee/Employee.test.ts` | Tests for new update methods      |
| `src/services/EmployeeService.test.ts` | Tests for expanded updateEmployee |

---

## Execution Order

### Phase 1: Complete updateEmployee() (Foundation)

1. Add domain methods to Employee.ts
2. Update types.ts
3. Add domain tests
4. Update EmployeeService.ts
5. Add service tests
6. Verify all tests pass

### Phase 2a: Backend userByEmail (Parallel-ready)

1. Add query to Rust backend
2. Update GraphQLEmployeeAdapter.findByEmail()
3. Test duplicate detection

### Phase 2b: Migrate Edit Route (Depends on Phase 1)

1. Update load function to use service
2. Update action to use service
3. Extract helper functions
4. Test edit functionality

### Phase 2c: Backend Filtering + Statistics (Parallel-ready)

1. Add UserFilter, UserSort to Rust backend
2. Update users query
3. Add employeeStatistics query
4. Update adapter findAll()
5. Add getStatistics() to adapter + service
6. Update dashboard to use getStatistics()

### Phase 3: Migrate Remaining Routes (Depends on 2c)

1. Add roles to Employee entity
2. Update adapter to fetch roles
3. Migrate admin/users route
4. Migrate API route

### Phase 4: Expose Unused Methods (Depends on Phase 3)

1. Add delete action + UI
2. Add bulk actions + toolbar
3. Integrate with admin table

---

## Success Criteria

| Metric                       | Before | After     |
| ---------------------------- | ------ | --------- |
| Service method utilization   | 43%    | 100%      |
| Employee ceiling (filtering) | 1,000  | Unlimited |
| Employee ceiling (stats)     | 10,000 | Unlimited |
| API calls for list + stats   | 4      | 2         |
| Routes using service         | 3      | 6         |
| Edit route via service       | No     | Yes       |
| Delete UI                    | No     | Yes       |
| Bulk operations UI           | No     | Yes       |

---

## Risks & Mitigations

| Risk                                 | Likelihood | Mitigation                                      |
| ------------------------------------ | ---------- | ----------------------------------------------- |
| Backend query changes break frontend | Medium     | Test with existing data before deploying        |
| Role filtering performance           | Low        | Roles fetched with employee, not separate query |
| Bulk operation timeout               | Low        | Operations are individual saves, not batch      |
| Self-deletion accidents              | None       | Prevented at action level                       |

---

## Future Considerations

1. **Emergency Contacts Service** - Extract to own domain/service
2. **Vehicles Service** - Extract to own domain/service
3. **Address Management** - Add to Employee or separate service
4. **Role Filtering Backend** - Add role filter to UserFilter input
5. **Pagination with Total Count** - Add totalCount to users query response
