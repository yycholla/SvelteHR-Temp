# Technical Debt: User/Employee Table Redundancy

**Status**: 🔴 Critical - Data Integrity Issue
**Priority**: High
**Estimated Effort**: 2-3 days
**Created**: 2025-10-27

---

## Problem Statement

Currently, the system maintains separate `User` and `Employee` tables with duplicated data fields (firstName, lastName, displayName, email, etc.). This creates:

1. **Data synchronization issues** - Updates to employee name don't reflect in user display
2. **Potential data inconsistencies** - Two sources of truth for the same information
3. **Maintenance overhead** - Every change to name/email requires updating both tables
4. **Confusing data model** - Unclear which table is authoritative for personal info

### Example of Current Issue

When user profile shows "User" instead of "System":

- Employee record has `first_name: "System"`
- User record might have `displayName: "User"` or `firstName: null`
- GraphQL queries use camelCase (`firstName`) vs backend uses snake_case (`first_name`)
- No automatic sync between tables

---

## Current Architecture

### User Table (Authentication)

```sql
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,          -- ❌ Duplicated
  first_name TEXT,            -- ❌ Duplicated
  last_name TEXT,             -- ❌ Duplicated
  password_hash TEXT,
  is_active BOOLEAN,
  onboarding_status TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Employee Table (HR Data)

```sql
employees (
  id UUID PRIMARY KEY,
  first_name TEXT NOT NULL,   -- ❌ Duplicated
  last_name TEXT NOT NULL,    -- ❌ Duplicated
  display_name TEXT,          -- ❌ Duplicated
  email TEXT UNIQUE,          -- ❌ Duplicated
  department_id UUID,
  position TEXT,
  hire_date DATE,
  salary NUMERIC,
  employee_number TEXT,
  -- ... other HR-specific fields
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Problems with Current Approach

1. **No Foreign Key Relationship**: Users and Employees are separate entities
2. **Manual Sync Required**: Name changes in Employee don't update User
3. **Inconsistent Naming**: GraphQL uses camelCase, backend uses snake_case
4. **Unclear Ownership**: Which table "owns" the displayName field?

---

## Proposed Solution

### New Architecture: User References Employee

```sql
-- Minimal User table (authentication only)
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  employee_id UUID REFERENCES employees(id), -- ✅ Optional FK
  user_type TEXT DEFAULT 'employee',         -- ✅ 'employee' | 'contractor' | 'external'
  is_active BOOLEAN DEFAULT true,
  onboarding_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Employee table (single source of truth for personal info)
employees (
  id UUID PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT GENERATED ALWAYS AS (
    COALESCE(preferred_name, first_name || ' ' || last_name)
  ) STORED,
  preferred_name TEXT,           -- ✅ Optional preferred name
  email TEXT UNIQUE NOT NULL,
  department_id UUID,
  position TEXT,
  hire_date DATE,
  salary NUMERIC,
  employee_number TEXT UNIQUE,
  -- ... other HR-specific fields
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Benefits

1. **✅ Single Source of Truth**: All personal info lives in `employees`
2. **✅ Supports Non-Employees**: Users without employee_id (contractors, vendors)
3. **✅ No Data Duplication**: Name changes happen once
4. **✅ Clear Separation**: User = auth, Employee = HR data
5. **✅ Better Joins**: Simple JOIN to get full user context
6. **✅ Automatic Display Name**: Generated column ensures consistency

---

## Migration Plan

### Phase 1: Database Schema Updates

**1.1 Add employee_id to users table**

```sql
ALTER TABLE users
ADD COLUMN employee_id UUID REFERENCES employees(id);

ALTER TABLE users
ADD COLUMN user_type TEXT DEFAULT 'employee';
```

**1.2 Create migration script to link existing records**

```sql
-- Link users to employees by email (assuming 1:1 mapping)
UPDATE users u
SET employee_id = e.id
FROM employees e
WHERE u.email = e.email;

-- Verify all users have employees
SELECT COUNT(*) FROM users WHERE employee_id IS NULL;
```

**1.3 Remove duplicate fields from users (after verification)**

```sql
-- WARNING: Only run after confirming all data is synced
ALTER TABLE users DROP COLUMN first_name;
ALTER TABLE users DROP COLUMN last_name;
ALTER TABLE users DROP COLUMN display_name;
```

### Phase 2: Backend Changes (Rust)

**2.1 Update User Model**

```rust
// src/models/user.rs
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub employee_id: Option<Uuid>,  // ✅ New field
    pub user_type: String,           // ✅ New field
    pub is_active: bool,
    pub onboarding_status: String,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

// Add relation to Employee
#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::employee::Entity",
        from = "Column::EmployeeId",
        to = "super::employee::Column::Id"
    )]
    Employee,
}
```

**2.2 Update GraphQL Queries**

```rust
// User query should always join employee data
pub async fn get_user_with_employee(
    db: &DatabaseConnection,
    user_id: Uuid,
) -> Result<UserWithEmployee, DbErr> {
    User::find_by_id(user_id)
        .find_also_related(Employee)
        .one(db)
        .await
}
```

**2.3 Update GraphQL Schema**

```graphql
type User {
	id: UUID!
	email: String!
	employeeId: UUID
	userType: String!
	isActive: Boolean!

	# ✅ Personal info comes from joined employee
	employee: Employee
	firstName: String # Resolves from employee.firstName
	lastName: String # Resolves from employee.lastName
	displayName: String # Resolves from employee.displayName
}

type Employee {
	id: UUID!
	firstName: String!
	lastName: String!
	displayName: String!
	email: String!
	department: Department
	position: String
	# ... other fields
}
```

### Phase 3: Frontend Updates

**3.1 Update Auth Store**

```typescript
// src/lib/stores/auth.ts
export interface User {
	id: string;
	email: string;
	employeeId?: string;
	userType: 'employee' | 'contractor' | 'external';
	isActive: boolean;

	// Personal info from joined employee
	employee?: {
		id: string;
		firstName: string;
		lastName: string;
		displayName: string;
		email: string;
		departmentId?: string;
		position?: string;
	};

	// Convenience getters
	firstName?: string; // Computed from employee
	lastName?: string; // Computed from employee
	displayName?: string; // Computed from employee
}
```

**3.2 Update GraphQL Queries**

```typescript
// Always fetch employee data with user
export const GET_CURRENT_USER = gql`
	query GetCurrentUser {
		me {
			id
			email
			employeeId
			userType
			isActive
			employee {
				id
				firstName
				lastName
				displayName
				email
				department {
					id
					name
				}
				position
			}
		}
	}
`;
```

**3.3 Update Display Logic**

```typescript
// Use employee data for display
const displayName = user.employee?.displayName || user.email;
const firstName = user.employee?.firstName;
```

### Phase 4: Data Validation

**4.1 Create validation script**

```sql
-- Check for orphaned users (no employee)
SELECT id, email, user_type
FROM users
WHERE user_type = 'employee'
  AND employee_id IS NULL;

-- Check for data mismatches
SELECT u.email, u.display_name, e.display_name
FROM users u
JOIN employees e ON u.employee_id = e.id
WHERE u.display_name != e.display_name;

-- Check for duplicate emails
SELECT email, COUNT(*)
FROM employees
GROUP BY email
HAVING COUNT(*) > 1;
```

---

## Rollback Plan

If migration fails, rollback steps:

1. **Restore database backup** (taken before Phase 1)
2. **Revert code changes** (git revert to pre-migration commit)
3. **Verify auth still works** with old User model
4. **Document failure reason** for next attempt

---

## Testing Checklist

- [ ] Backup production database
- [ ] Test migration on development database
- [ ] Verify all users have valid employee_id
- [ ] Test login with new schema
- [ ] Test profile display (firstName, lastName, displayName)
- [ ] Test employee updates reflect in user display
- [ ] Test non-employee users (if applicable)
- [ ] Test GraphQL queries return correct joined data
- [ ] Test frontend displays correct names
- [ ] Performance test JOIN queries
- [ ] Load test authentication endpoints

---

## Files to Modify

### Backend (Rust)

- `src/models/user.rs` - User model + Employee relation
- `src/models/employee.rs` - Verify no changes needed
- `src/schema/queries/user.rs` - Update to always join employee
- `src/schema/mutations/user.rs` - Update user creation/updates
- `src/auth/session.rs` - Update session user data
- `migrations/*.sql` - Add migration scripts

### Frontend (SvelteKit)

- `src/lib/stores/auth.ts` - Update User interface
- `src/lib/graphql/postgraphile-operations.ts` - Update queries
- `src/lib/components/hr-app-sidebar.svelte` - Use employee data
- `src/routes/dashboard/+page.svelte` - Use employee data
- `src/hooks.server.ts` - Update user authentication logic
- All profile pages - Update to use employee fields

### Database

- Migration script: `001_add_employee_id_to_users.sql`
- Migration script: `002_link_users_to_employees.sql`
- Migration script: `003_remove_duplicate_user_fields.sql`
- Rollback script: `rollback_user_employee_merge.sql`

---

## Related Issues

- Dashboard showing "User" instead of employee first name
- Inconsistent naming (camelCase vs snake_case)
- Multiple sources of truth for user personal information
- No automatic sync between User and Employee data

---

## Implementation Timeline

**Day 1: Database + Backend**

- Morning: Create and test migration scripts
- Afternoon: Update Rust models and relations
- Evening: Update GraphQL schema and resolvers

**Day 2: Frontend + Testing**

- Morning: Update auth store and GraphQL queries
- Afternoon: Update all UI components
- Evening: Integration testing

**Day 3: Deployment + Validation**

- Morning: Deploy to staging
- Afternoon: Production deployment
- Evening: Monitor and validate

---

## Notes

- **Breaking Change**: This is a breaking change to the data model
- **Backward Compatibility**: Old code expecting User.firstName will break
- **API Versioning**: Consider versioning GraphQL schema if needed
- **Documentation**: Update all API docs to reflect new structure
- **Team Communication**: Notify team before starting migration

---

## Success Criteria

✅ All users have valid employee_id (for employee user_type)
✅ No duplicate personal data between User and Employee
✅ Profile displays show correct employee names
✅ Login and authentication work correctly
✅ GraphQL queries return proper joined data
✅ All frontend components use employee data
✅ Performance is acceptable (JOIN queries optimized)
✅ Rollback plan tested and documented

---

## References

- Current User Model: `graphql-rust-server/src/models/user.rs`
- Current Employee Model: `graphql-rust-server/src/models/employee.rs`
- Auth Store: `src/lib/stores/auth.ts`
- GraphQL Operations: `src/lib/graphql/postgraphile-operations.ts`
