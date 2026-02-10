# Hexagonal Architecture Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Department, Goals, Performance Reviews, and Tasks modules to hexagonal architecture following the established Employee/LeaveRequest pattern.

**Architecture:** Five-phase incremental migration with **backend-first approach**. Phase 0 adds missing GraphQL query capabilities (filtering, sorting, pagination) to eliminate client-side workarounds. Phases 1-4 migrate frontend modules following Domain → Service → Adapter → Routes → Tests workflow. Each phase deploys independently to production. Follows ports & adapters pattern with Result<T,E> error handling and comprehensive testing (380+ new tests total).

**Tech Stack:**

- Backend: Rust, Axum, Async-GraphQL, SeaORM, PostgreSQL
- Frontend: TypeScript 5, Vitest 3.2.3, SvelteKit 2.43+, GraphQL (urql)
- Architecture: Hexagonal (Ports & Adapters), Domain-Driven Design

**Critical Path:** Phase 0 (backend query capabilities) must complete before Phase 1 (frontend refactoring). Backend changes enable proper separation of concerns and eliminate client-side filtering/sorting workarounds that don't scale.

**Reference Implementations:**

- Employee Module: `src/domain/Employee/`, `src/services/EmployeeService.ts`, `src/adapters/GraphQLEmployeeAdapter.ts`
- LeaveRequest Module: `src/domain/LeaveRequest/`, `src/services/LeaveRequestService.ts`, `src/adapters/GraphQLLeaveRequestAdapter.ts`

---

## Phase 0: Backend Query Capabilities (Department Module)

**Duration:** 2-9.5 hours (prioritized in sub-phases)
**Goal:** Add missing GraphQL query capabilities to support hexagonal architecture. Eliminate client-side filtering workarounds.

**Rationale:** The backend currently returns full datasets with limited query capabilities (only limit/offset). The frontend must download all records and filter/sort client-side, which doesn't scale. We need proper filtering, sorting, and pagination metadata on the backend before refactoring frontend routes.

**Current Backend Status:**

- ✅ CRUD mutations complete (create, update, bulkUpdate, delete)
- ✅ Basic queries with limit/offset
- ✅ Hierarchy support (parent_id, ancestor_ids with GIN index)
- ✅ RLS policies and field-level security
- ❌ Missing filtering (search, parent_id, manager_id, root_only, include_deleted)
- ❌ Missing sorting (DepartmentsOrderBy enum defined but not used)
- ❌ Missing pagination metadata (totalCount, hasNextPage)
- ❌ Inefficient getDepartmentDescendants (N+1 queries, doesn't use GIN index)

### Task 0.1: Add Department Filtering Input Type

**Priority:** HIGHEST (Phase 0a - ~30 minutes)

**Files:**

- Modify: `graphql-rust-server/src/schema/query.rs` (add DepartmentFilter input)
- Reference: `graphql-rust-server/src/models/department.rs` (field definitions)

**Step 1: Define DepartmentFilter input type**

Add to `graphql-rust-server/src/schema/query.rs` near line 260:

```rust
#[derive(Debug, Clone, InputObject)]
pub struct DepartmentFilter {
    /// Search departments by name (case-insensitive partial match)
    pub search_term: Option<String>,
    /// Filter by parent department ID (null for root departments)
    pub parent_id: Option<Uuid>,
    /// Show only root departments (no parent)
    pub root_only: Option<bool>,
    /// Filter by manager ID
    pub manager_id: Option<Uuid>,
    /// Include soft-deleted departments
    pub include_deleted: Option<bool>,
}
```

**Step 2: Update departments query signature**

Replace (line ~261):

```rust
async fn departments(
    &self,
    ctx: &Context<'_>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<Department>>
```

With:

```rust
async fn departments(
    &self,
    ctx: &Context<'_>,
    filter: Option<DepartmentFilter>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<Department>>
```

**Step 3: Apply filters in query implementation**

Update query implementation (line ~268):

```rust
async fn departments(
    &self,
    ctx: &Context<'_>,
    filter: Option<DepartmentFilter>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<Department>> {
    let pool = ctx.data::<Pool<Postgres>>()?;
    let user = ctx.data::<User>()?;

    // Start with base query
    let mut query = DepartmentEntity::find();

    // Apply filters if provided
    if let Some(f) = filter {
        if let Some(search) = f.search_term {
            query = query.filter(
                Condition::any()
                    .add(DepartmentColumn::Name.contains(&search))
                    .add(DepartmentColumn::Description.contains(&search))
            );
        }

        if let Some(parent_id) = f.parent_id {
            query = query.filter(DepartmentColumn::ParentDepartmentId.eq(parent_id));
        } else if f.root_only == Some(true) {
            query = query.filter(DepartmentColumn::ParentDepartmentId.is_null());
        }

        if let Some(manager_id) = f.manager_id {
            query = query.filter(DepartmentColumn::ManagerId.eq(manager_id));
        }

        if f.include_deleted != Some(true) {
            query = query.filter(DepartmentColumn::DeletedAt.is_null());
        }
    } else {
        // Default: exclude deleted
        query = query.filter(DepartmentColumn::DeletedAt.is_null());
    }

    // Apply RLS (existing logic)
    query = apply_department_rls(query, user)?;

    // Apply pagination
    if let Some(limit) = limit {
        query = query.limit(limit as u64);
    }
    if let Some(offset) = offset {
        query = query.offset(offset as u64);
    }

    let departments: Vec<DepartmentModel> = query.all(pool).await?;
    Ok(departments.into_iter().map(Department::from).collect())
}
```

**Step 4: Verify compilation**

Run: `cargo check --manifest-path=graphql-rust-server/Cargo.toml`
Expected: No compilation errors

**Step 5: Write integration test**

Add to `graphql-rust-server/src/schema/query.rs` test module:

```rust
#[tokio::test]
async fn test_departments_filtering() {
    // Test search filter
    let query = r#"
        query {
            departments(filter: { searchTerm: "Engineering" }) {
                id
                name
            }
        }
    "#;
    // Assert results contain "Engineering"

    // Test root_only filter
    let query = r#"
        query {
            departments(filter: { rootOnly: true }) {
                id
                name
                parentDepartmentId
            }
        }
    "#;
    // Assert all results have parentDepartmentId: null
}
```

**Step 6: Run tests**

Run: `cargo test --manifest-path=graphql-rust-server/Cargo.toml test_departments_filtering`
Expected: PASS

**Step 7: Commit**

```bash
git add graphql-rust-server/src/schema/query.rs
git commit -m "feat(backend): add DepartmentFilter input type for department queries

Add comprehensive filtering support:
- search_term: case-insensitive name/description search
- parent_id: filter by parent department
- root_only: show only root departments
- manager_id: filter by department manager
- include_deleted: optionally include soft-deleted records

Eliminates need for client-side filtering of full datasets.
Part of Phase 0 backend query capabilities."
```

### Task 0.2: Add Department Sorting Support

**Priority:** HIGHEST (Phase 0a - ~20 minutes)

**Files:**

- Modify: `graphql-rust-server/src/schema/query.rs` (add order_by parameter)
- Reference: `graphql-rust-server/src/models/department.rs:14-64` (DepartmentsOrderBy enum)

**Step 1: Add order_by parameter to departments query**

Update query signature (line ~261):

```rust
async fn departments(
    &self,
    ctx: &Context<'_>,
    filter: Option<DepartmentFilter>,
    order_by: Option<DepartmentsOrderBy>,  // ADD THIS
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<Department>>
```

**Step 2: Apply sorting in query implementation**

Add before pagination (after RLS, before limit/offset):

```rust
// Apply sorting
if let Some(order) = order_by {
    query = match order {
        DepartmentsOrderBy::NameAsc => query.order_by_asc(DepartmentColumn::Name),
        DepartmentsOrderBy::NameDesc => query.order_by_desc(DepartmentColumn::Name),
        DepartmentsOrderBy::CreatedAtAsc => query.order_by_asc(DepartmentColumn::CreatedAt),
        DepartmentsOrderBy::CreatedAtDesc => query.order_by_desc(DepartmentColumn::CreatedAt),
        DepartmentsOrderBy::UpdatedAtAsc => query.order_by_asc(DepartmentColumn::UpdatedAt),
        DepartmentsOrderBy::UpdatedAtDesc => query.order_by_desc(DepartmentColumn::UpdatedAt),
        DepartmentsOrderBy::ManagerIdAsc => query.order_by_asc(DepartmentColumn::ManagerId),
        DepartmentsOrderBy::ManagerIdDesc => query.order_by_desc(DepartmentColumn::ManagerId),
    };
} else {
    // Default sort: name ascending
    query = query.order_by_asc(DepartmentColumn::Name);
}
```

**Step 3: Verify compilation**

Run: `cargo check --manifest-path=graphql-rust-server/Cargo.toml`
Expected: No compilation errors

**Step 4: Write test**

```rust
#[tokio::test]
async fn test_departments_sorting() {
    let query = r#"
        query {
            departments(orderBy: NAME_DESC) {
                name
            }
        }
    "#;
    // Assert results are sorted by name descending
}
```

**Step 5: Commit**

```bash
git add graphql-rust-server/src/schema/query.rs
git commit -m "feat(backend): add sorting support to departments query

Use existing DepartmentsOrderBy enum (name, created_at, updated_at, manager_id).
Default sort: name ascending.
Eliminates client-side sorting workarounds."
```

### Task 0.3: Add Pagination Metadata

**Priority:** HIGHEST (Phase 0a - ~1 hour)

**Files:**

- Modify: `graphql-rust-server/src/schema/query.rs` (add DepartmentQueryResult type)
- Modify: `graphql-rust-server/src/models/department.rs` (add result wrapper type)

**Step 1: Define pagination result wrapper**

Add to `graphql-rust-server/src/models/department.rs`:

```rust
#[derive(Debug, Clone, SimpleObject)]
pub struct DepartmentQueryResult {
    /// The departments matching the query
    pub items: Vec<Department>,
    /// Total count of departments matching filters (before pagination)
    pub total_count: i64,
    /// Current page number (calculated from offset/limit)
    pub page: i64,
    /// Number of items per page
    pub limit: i64,
    /// Total number of pages
    pub total_pages: i64,
    /// Whether there is a next page
    pub has_next_page: bool,
    /// Whether there is a previous page
    pub has_previous_page: bool,
}
```

**Step 2: Update departments query to return DepartmentQueryResult**

Replace return type (line ~261):

```rust
async fn departments(
    &self,
    ctx: &Context<'_>,
    filter: Option<DepartmentFilter>,
    order_by: Option<DepartmentsOrderBy>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<DepartmentQueryResult>  // CHANGED from Vec<Department>
```

**Step 3: Update query implementation to compute metadata**

```rust
async fn departments(
    &self,
    ctx: &Context<'_>,
    filter: Option<DepartmentFilter>,
    order_by: Option<DepartmentsOrderBy>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<DepartmentQueryResult> {
    let pool = ctx.data::<Pool<Postgres>>()?;
    let user = ctx.data::<User>()?;

    let limit = limit.unwrap_or(20);
    let offset = offset.unwrap_or(0);

    // Build base query with filters (same as Task 0.1)
    let mut query = DepartmentEntity::find();
    // ... apply filters, RLS, sorting ...

    // Get total count BEFORE pagination
    let total_count = query.clone().count(pool).await? as i64;

    // Apply pagination
    query = query.limit(limit as u64).offset(offset as u64);

    let departments: Vec<DepartmentModel> = query.all(pool).await?;
    let items: Vec<Department> = departments.into_iter().map(Department::from).collect();

    // Calculate pagination metadata
    let page = (offset / limit) + 1;
    let total_pages = (total_count + limit - 1) / limit;  // Ceiling division
    let has_next_page = offset + limit < total_count;
    let has_previous_page = offset > 0;

    Ok(DepartmentQueryResult {
        items,
        total_count,
        page,
        limit,
        total_pages,
        has_next_page,
        has_previous_page,
    })
}
```

**Step 4: Update GraphQL schema exports**

Ensure `DepartmentQueryResult` is exported from models module.

**Step 5: Verify compilation and run tests**

Run: `cargo check --manifest-path=graphql-rust-server/Cargo.toml`
Run: `cargo test --manifest-path=graphql-rust-server/Cargo.toml departments`
Expected: All pass

**Step 6: Commit**

```bash
git add graphql-rust-server/src/schema/query.rs graphql-rust-server/src/models/department.rs
git commit -m "feat(backend): add pagination metadata to departments query

Return DepartmentQueryResult with:
- items: department list
- total_count: count before pagination
- page, limit, total_pages
- has_next_page, has_previous_page

Enables proper UI pagination controls.
Part of Phase 0 backend query capabilities."
```

### Task 0.4: Optimize getDepartmentDescendants Using GIN Index

**Priority:** HIGH (Phase 0a - ~30 minutes)

**Files:**

- Modify: `graphql-rust-server/src/models/department.rs` (getDepartmentDescendants resolver)
- Reference: `graphql-rust-server/migration/m20260205_001_add_department_ancestor_ids.rs` (GIN index)

**Step 1: Update getDepartmentDescendants to use GIN index**

Replace implementation (line ~85):

```rust
// BEFORE: Inefficient N+1 queries
async fn get_department_descendants<'a>(&self, ctx: &Context<'a>) -> Result<Vec<Department>> {
    // Recursive CTE or N+1 queries
}

// AFTER: Use GIN index containment operator
async fn get_department_descendants<'a>(&self, ctx: &Context<'a>) -> Result<Vec<Department>> {
    let pool = ctx.data::<Pool<Postgres>>()?;

    // Use GIN index: find all departments where ancestor_ids contains this department's ID
    let descendants: Vec<DepartmentModel> = DepartmentEntity::find()
        .filter(
            Expr::cust_with_values(
                "ancestor_ids @> ARRAY[$1]::uuid[]",
                vec![self.id]
            )
        )
        .filter(DepartmentColumn::DeletedAt.is_null())
        .all(pool)
        .await?;

    Ok(descendants.into_iter().map(Department::from).collect())
}
```

**Step 2: Add test for performance**

```rust
#[tokio::test]
async fn test_get_descendants_uses_gin_index() {
    // Query descendants for root department
    // Verify query plan uses GIN index (not seq scan)
    // Assert correct descendants returned
}
```

**Step 3: Verify with EXPLAIN ANALYZE**

Run in PostgreSQL:

```sql
EXPLAIN ANALYZE
SELECT * FROM departments
WHERE ancestor_ids @> ARRAY['<uuid>']::uuid[]
AND deleted_at IS NULL;
```

Expected output should show: `Bitmap Index Scan using idx_departments_ancestor_ids`

**Step 4: Commit**

```bash
git add graphql-rust-server/src/models/department.rs
git commit -m "perf(backend): optimize getDepartmentDescendants with GIN index

Replace recursive CTE / N+1 queries with GIN index containment operator.
Uses existing idx_departments_ancestor_ids for O(log n) lookups.
Improves performance for large department hierarchies."
```

### Task 0.5: Add parent_department_id to UpdateDepartmentInput (Optional)

**Priority:** MEDIUM (Phase 0b - ~20 minutes)

**Files:**

- Modify: `graphql-rust-server/src/schema/mutations/department.rs` (UpdateDepartmentInput)

**Step 1: Add parent_department_id field**

Update `UpdateDepartmentInput` (line ~30):

```rust
#[derive(Debug, InputObject)]
pub struct UpdateDepartmentInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub manager_id: Option<Uuid>,
    pub parent_department_id: Option<Uuid>,  // ADD THIS
}
```

**Step 2: Update update_department mutation logic**

Add to mutation implementation:

```rust
if let Some(parent_id) = input.parent_department_id {
    // Validate: prevent circular hierarchy
    if parent_id == department_id {
        return Err("Department cannot be its own parent".into());
    }
    // Update parent_department_id
    update_model.parent_department_id = Set(Some(parent_id));
    // Recalculate ancestor_ids (trigger or manual update)
}
```

**Step 3: Add test for hierarchy moves**

```rust
#[tokio::test]
async fn test_update_department_parent() {
    // Move department to new parent
    // Verify ancestor_ids updated correctly
    // Verify circular hierarchy prevented
}
```

**Step 4: Commit**

```bash
git add graphql-rust-server/src/schema/mutations/department.rs
git commit -m "feat(backend): add parent_department_id to UpdateDepartmentInput

Enable moving departments in hierarchy via update mutation.
Includes circular hierarchy validation.
Part of Phase 0 backend capabilities."
```

### Task 0.6: Add Field Resolvers (Optional)

**Priority:** LOW (Phase 0c - ~2 hours)

**Files:**

- Modify: `graphql-rust-server/src/models/department.rs` (add field resolvers)

**Step 1: Add childCount resolver**

```rust
#[Object]
impl Department {
    // ... existing resolvers ...

    async fn child_count<'a>(&self, ctx: &Context<'a>) -> Result<i64> {
        let pool = ctx.data::<Pool<Postgres>>()?;
        let count = DepartmentEntity::find()
            .filter(DepartmentColumn::ParentDepartmentId.eq(self.id))
            .filter(DepartmentColumn::DeletedAt.is_null())
            .count(pool)
            .await?;
        Ok(count as i64)
    }
}
```

**Step 2: Add descendantCount resolver**

```rust
async fn descendant_count<'a>(&self, ctx: &Context<'a>) -> Result<i64> {
    let pool = ctx.data::<Pool<Postgres>>()?;
    let count = DepartmentEntity::find()
        .filter(
            Expr::cust_with_values(
                "ancestor_ids @> ARRAY[$1]::uuid[]",
                vec![self.id]
            )
        )
        .filter(DepartmentColumn::DeletedAt.is_null())
        .count(pool)
        .await?;
    Ok(count as i64)
}
```

**Step 3: Add isLeaf resolver**

```rust
async fn is_leaf<'a>(&self, ctx: &Context<'a>) -> Result<bool> {
    let child_count = self.child_count(ctx).await?;
    Ok(child_count == 0)
}
```

**Step 4: Add path resolver**

```rust
async fn path<'a>(&self, ctx: &Context<'a>) -> Result<Vec<Department>> {
    let pool = ctx.data::<Pool<Postgres>>()?;

    // Fetch all ancestors using ancestor_ids
    if self.ancestor_ids.is_empty() {
        return Ok(vec![self.clone()]);
    }

    let ancestors: Vec<DepartmentModel> = DepartmentEntity::find()
        .filter(DepartmentColumn::Id.is_in(self.ancestor_ids.clone()))
        .order_by_asc(DepartmentColumn::CreatedAt)  // Root to leaf order
        .all(pool)
        .await?;

    let mut path: Vec<Department> = ancestors.into_iter().map(Department::from).collect();
    path.push(self.clone());
    Ok(path)
}
```

**Step 5: Add tests**

```rust
#[tokio::test]
async fn test_department_field_resolvers() {
    // Test childCount
    // Test descendantCount
    // Test isLeaf
    // Test path (returns ancestors + self)
}
```

**Step 6: Commit**

```bash
git add graphql-rust-server/src/models/department.rs
git commit -m "feat(backend): add department field resolvers

Add computed fields:
- childCount: number of direct children
- descendantCount: total descendants (uses GIN index)
- isLeaf: true if no children
- path: full hierarchy path from root to this department

Improves UI hierarchy display capabilities."
```

### Phase 0 Summary

**Tasks Completed:**

- ✅ Task 0.1: Add DepartmentFilter input type (filtering support) - ~30 min
- ✅ Task 0.2: Add sorting support with DepartmentsOrderBy - ~20 min
- ✅ Task 0.3: Add pagination metadata (DepartmentQueryResult) - ~1 hour
- ✅ Task 0.4: Optimize getDepartmentDescendants with GIN index - ~30 min
- 🔵 Task 0.5: Add parent_department_id to UpdateDepartmentInput (optional) - ~20 min
- 🔵 Task 0.6: Add field resolvers (childCount, etc.) (optional) - ~2 hours

**Phase 0a Duration (Required):** ~2 hours
**Phase 0b-0c Duration (Optional):** ~2.5 hours
**Total Phase 0 Duration:** 2-4.5 hours (depending on optional tasks)

**Key Benefits:**

- Backend now handles all filtering/sorting/pagination (scalable to any dataset size)
- Frontend eliminates client-side filtering workarounds
- Proper pagination metadata for UI controls
- GIN index optimization for hierarchy queries (O(log n) instead of N+1)

**Breaking Changes:**

- GraphQL query signature changes (requires adapter + route updates in Phase 1)
- Returns `DepartmentQueryResult` wrapper instead of `Vec<Department>`

---

## Phase 1: Department Module (Route Refactoring)

**Duration:** 1-2 days
**Goal:** Refactor 5 department routes to use existing DepartmentService with new backend query capabilities.
**Dependencies:** Phase 0 must be complete (backend filtering/sorting/pagination)

### Task 1.1: Update GraphQL Adapter to Use New Backend Capabilities

**Files:**

- Modify: `src/adapters/GraphQLDepartmentAdapter.ts` (remove client-side filtering)
- Modify: `src/domain/Department/types.ts` (add sorting options)
- Reference: `graphql-rust-server/src/schema/query.rs` (new DepartmentFilter, order_by)

**Step 1: Update GraphQL query to use new backend features**

Read: `src/adapters/GraphQLDepartmentAdapter.ts` (current query structure)

Replace the GraphQL query with:

```typescript
const GET_DEPARTMENTS = gql`
	query GetDepartments(
		$filter: DepartmentFilter
		$orderBy: DepartmentsOrderBy
		$limit: Int
		$offset: Int
	) {
		departments(filter: $filter, orderBy: $orderBy, limit: $limit, offset: $offset) {
			items {
				id
				name
				description
				managerId
				parentDepartmentId
				ancestorIds
				createdAt
				updatedAt
			}
			totalCount
			page
			limit
			totalPages
			hasNextPage
			hasPreviousPage
		}
	}
`;
```

**Step 2: Update FindDepartmentsFilter type to match backend**

Edit `src/domain/Department/types.ts`:

```typescript
export interface FindDepartmentsFilter {
	searchTerm?: string; // Maps to filter.search_term
	parentId?: string | null; // Maps to filter.parent_id
	rootOnly?: boolean; // Maps to filter.root_only
	includeDeleted?: boolean; // Maps to filter.include_deleted
	managerId?: string; // Maps to filter.manager_id
	page?: number; // For offset calculation
	limit?: number; // Direct pass-through
	orderBy?: DepartmentOrderBy; // NEW: sorting option
}

export enum DepartmentOrderBy {
	NameAsc = 'NAME_ASC',
	NameDesc = 'NAME_DESC',
	CreatedAtAsc = 'CREATED_AT_ASC',
	CreatedAtDesc = 'CREATED_AT_DESC',
	UpdatedAtAsc = 'UPDATED_AT_ASC',
	UpdatedAtDesc = 'UPDATED_AT_DESC'
}
```

**Step 3: Remove applyClientSideFilters method**

Delete the entire `applyClientSideFilters` method from `GraphQLDepartmentAdapter.ts` (lines ~150-180). Backend now handles all filtering.

**Step 4: Update findAll implementation to use backend filtering**

```typescript
async findAll(filter?: FindDepartmentsFilter): Promise<Result<FindDepartmentsResult, DomainError>> {
	try {
		const limit = filter?.limit ?? 100;
		const page = filter?.page ?? 1;
		const offset = (page - 1) * limit;

		// Build GraphQL filter object (matches backend DepartmentFilter)
		const gqlFilter: any = {};
		if (filter?.searchTerm) gqlFilter.searchTerm = filter.searchTerm;
		if (filter?.parentId !== undefined) gqlFilter.parentId = filter.parentId;
		if (filter?.rootOnly) gqlFilter.rootOnly = filter.rootOnly;
		if (filter?.managerId) gqlFilter.managerId = filter.managerId;
		if (filter?.includeDeleted) gqlFilter.includeDeleted = filter.includeDeleted;

		const result = await this.client
			.query(GET_DEPARTMENTS, {
				filter: Object.keys(gqlFilter).length > 0 ? gqlFilter : undefined,
				orderBy: filter?.orderBy || DepartmentOrderBy.NameAsc,
				limit,
				offset
			})
			.toPromise();

		if (result.error) {
			return Result.error(
				new DomainError('ADAPTER_ERROR', 'Failed to fetch departments', result.error)
			);
		}

		const data = result.data.departments;

		// No more client-side filtering needed!
		const departments = data.items.map((dept: any) =>
			Department.reconstitute({
				id: dept.id,
				name: dept.name,
				description: dept.description || undefined,
				managerId: dept.managerId || undefined,
				parentDepartmentId: dept.parentDepartmentId || undefined,
				ancestorIds: dept.ancestorIds || [],
				createdAt: dept.createdAt,
				updatedAt: dept.updatedAt
			})
		);

		return Result.ok({
			departments,
			total: data.totalCount, // Use backend count
			limit,
			offset,
			hasNextPage: data.hasNextPage,
			hasPreviousPage: data.hasPreviousPage
		});
	} catch (error) {
		return Result.error(
			new DomainError('ADAPTER_ERROR', 'Failed to fetch departments', error as Error)
		);
	}
}
```

**Step 5: Verify TypeScript compilation**

Run: `npm run check`
Expected: No errors

**Step 6: Commit adapter changes**

```bash
git add src/adapters/GraphQLDepartmentAdapter.ts src/domain/Department/types.ts
git commit -m "refactor(adapter): use backend filtering/sorting/pagination

Remove client-side filtering workarounds.
Use new DepartmentFilter and DepartmentsOrderBy from backend.
Adapter now leverages Phase 0 backend capabilities.
Reduced complexity, improved performance."
```

### Task 1.2: Refactor Main Departments Route

**Files:**

- Modify: `src/routes/dashboard/departments/+page.server.ts` (254 lines → ~180 lines)
- Reference: `src/services/DepartmentService.ts` (already exists)
- Reference: `src/routes/dashboard/management/leave-approvals/+page.server.ts` (refactored route example)

**Step 1: Read existing route to understand current structure**

Read: `src/routes/dashboard/departments/+page.server.ts` (lines 1-100)
Note: Client-side filtering logic (can now be removed)

**Step 2: Refactor load function to pass filters to service**

Replace with:

```typescript
export const load: PageServerLoad = async (event) => {
	const { url } = event;
	const loader = new RBACDataLoader(event, ['departments:read', 'departments:read:all']);

	return loader.loadWithClient(async () => {
		const { locals } = event;
		const params = new QueryParamExtractor(url);
		const { page, limit } = params.getPagination(20);
		const searchTerm = params.getString('search');
		const orderBy = params.getString('orderBy') as DepartmentOrderBy | undefined;

		// Use service layer with backend filtering
		const service = createDepartmentService(event);
		const result = await service.getDepartments({
			page,
			limit,
			searchTerm,
			orderBy: orderBy || DepartmentOrderBy.NameAsc
		});

		if (result.isError) {
			logger.error('Failed to load departments', result.error);
			return {
				departments: [],
				total: 0,
				error: result.error.message
			};
		}

		// No transformation needed - backend returns exactly what we need
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
				totalPages: Math.ceil(result.value.total / limit),
				hasNextPage: result.value.hasNextPage,
				hasPreviousPage: result.value.hasPreviousPage
			}
		};
	});
};
```

**Step 3: Remove client-side filtering code**

Delete any `.filter()` calls on the departments array (backend now handles this).

**Step 4: Update imports**

Add:

```typescript
import { createDepartmentService } from '$lib/server/services';
import { logger } from '$lib/utils/logger';
import { DepartmentOrderBy } from '$lib/domain/Department/types';
```

**Step 5: Verify TypeScript compilation**

Run: `npm run check`
Expected: No TypeScript errors

**Step 6: Test route manually**

Run: `mise run dev`
Navigate to: `http://localhost:5173/dashboard/departments?search=Engineering`
Expected: Filtered results from backend, no full dataset download

**Step 7: Commit refactored route**

```bash
git add src/routes/dashboard/departments/+page.server.ts
git commit -m "refactor(routes): migrate departments main route to backend filtering

Pass search/sort/pagination to service layer (backend handles it).
Remove client-side filtering workarounds.
Reduced from 254 to ~180 lines (29% reduction).
Scalable to large department counts."
```

### Task 1.3: Refactor Department Detail Route

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

### Task 1.4: Refactor Department Edit Route

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

### Task 1.5: Refactor Department Create Route

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

### Task 1.6: Refactor Public Departments Route

**Files:**

- Modify: `src/routes/departments/+page.server.ts`

**Step 1: Refactor (similar to Task 1.2 but simpler)**

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

## Timeline Estimates

**Phase 0 (Backend Query Capabilities):**

- Phase 0a (Required): ~2 hours (Tasks 0.1-0.4)
- Phase 0b-0c (Optional): ~2.5 hours (Tasks 0.5-0.6)
- Total: 2-4.5 hours

**Phase 1 (Department Routes):**

- Route refactoring: 1-2 days
- Total: 1-2 days (depends on Phase 0 completion)

**Phase 2 (Goals Module):**

- Full migration (Domain → Service → Adapter → Routes): 4-6 days

**Phase 3 (Performance Reviews Module):**

- Full migration: 5-7 days

**Phase 4 (Tasks Module):**

- Full migration: 6-8 days

**Overall Timeline:** 16-25 days (including Phase 0)
**Critical Path:** Phase 0 → Phase 1 (backend must be complete before frontend refactoring)

---

## Success Metrics

**Phase 0 (Backend):**

- All Rust tests passing
- No breaking changes to existing queries (backward compatible until Phase 1)
- GIN index query plans verified with EXPLAIN ANALYZE
- Pagination metadata accurate (totalCount, hasNextPage)

**Per Frontend Phase (1-4):**

- Route line reduction: ~50%
- Test coverage: Domain 100%, Service 95%+, Adapter 85%+
- Zero `any` types in new code
- All TypeScript strict checks passing

**Overall (5 Phases including Phase 0):**

- Backend query capabilities complete (filtering, sorting, pagination)
- 380+ new tests added (frontend + backend)
- ~1,200 lines of route code reduced
- 4 modules following consistent hexagonal pattern
- GraphQL changes isolated to adapters
- Business logic centralized in domain/service layers
- Client-side filtering workarounds eliminated
