# Codebase Modernization Brainstorming Session

**Date:** 2026-02-05
**Status:** Brainstorming Phase
**Goal:** Identify and prioritize modernization improvements following hexagonal/clean architecture

---

## Current State Assessment

### ✅ Already Modernized

**Employee Module (Complete):**

- Domain layer with value objects (Email, PersonName, HireDate, EmployeeStatus)
- Employee entity with business logic and invariants
- GraphQLEmployeeAdapter implementing EmployeeRepository port
- EmployeeService with Result<T, E> pattern
- 156 comprehensive tests (100% passing)
- Used in: admin users route, employee detail pages

**Intuit Sync Refactor (In Progress - Rust):**

- Phase 1: Domain layer (value objects, errors, entities, services)
- Phase 2: Ports & adapters (QuickBooksPort, SyncRepositoryPort, adapters)
- Pending: GraphQL layer and UI components

**Modern Route Utilities (Partial):**

- RBACDataLoader - auth, session, permissions
- QueryParamExtractor - type-safe URL params
- ClientSideFilter - filtering helpers
- StatisticsCalculator - analytics
- Used in: ~10 routes (departments, tasks, etc.)

### 🔧 Still Using Legacy Patterns

**Direct GraphQL Client Usage:**

- 50+ routes still using `createUrqlClient()` directly
- Inline GraphQL queries in route files
- No service layer abstraction
- Examples: documents, analytics, audit, compliance, onboarding, events, reviews

**No Domain Layer:**

- Documents module
- Tasks module
- Departments module
- Events module
- Reviews module
- Onboarding module
- All business logic scattered in routes and components

**Mixed Data Fetching:**

- Some routes use UnifiedGraphQLClient
- Others use createUrqlClient() with manual cookie handling
- Inconsistent error handling patterns

---

## Modernization Options

### Option A: Domain Layer Expansion ⭐ (SELECTED FOR BRAINSTORMING)

**Concept:** Create domain entities for 2-3 core modules following Employee pattern

**Modules to Prioritize:**

- Tasks (high complexity, lots of business rules)
- Documents (file management, versioning, assignments)
- Departments (organizational hierarchy)

**Pattern:**

```
src/domain/Task/
  ├── Task.ts (entity)
  ├── TaskStatus.ts (value object)
  ├── Priority.ts (value object)
  ├── DueDate.ts (value object)
  ├── types.ts
  └── index.ts

src/services/TaskService.ts (business logic)
src/adapters/GraphQLTaskAdapter.ts (implements TaskRepository)
```

**Benefits:**

- Type safety with domain types
- Business rules enforced at entity creation
- Testable domain logic (no I/O)
- Foundation for service layer

**Effort:** Medium per module (3-5 days each)

---

### Option B: Service Layer Consolidation

**Concept:** Create TypeScript services to centralize business logic

**Pattern:**

```
src/services/
  ├── TaskService.ts
  ├── DocumentService.ts
  ├── DepartmentService.ts
  └── EventService.ts
```

**Benefits:**

- Reusable business logic
- Easier to test
- Routes become thin orchestrators
- Single source of truth for operations

**Dependencies:** Requires domain layer first (Option A)

**Effort:** Medium-High (requires domain foundation)

---

### Option C: Route Standardization

**Concept:** Migrate all routes to modern utilities

**Changes:**

- Replace direct GraphQL client with RBACDataLoader
- Use QueryParamExtractor for all URL params
- Standardized error handling
- Consistent return types

**Benefits:**

- Reduced boilerplate (~40% less code per route)
- Consistent auth/permission checks
- Better error handling
- Easier maintenance

**Effort:** Low-Medium (mechanical refactor, 1-2 days per 10 routes)

---

### Option D: Data Access Layer

**Concept:** Repository pattern for database access

**Changes:**

- Define port interfaces (TaskRepository, DocumentRepository)
- Implement adapters (GraphQL, SeaORM)
- Replace direct database calls

**Benefits:**

- Testability (mock repositories)
- Flexibility (swap implementations)
- Clear boundaries between layers

**Effort:** High (architectural change, 1-2 weeks)

---

## Next Steps

1. ✅ **Selected:** Option A - Domain Layer Expansion
2. 🔄 **Current:** Brainstorming domain design for Tasks, Documents, Departments
3. ⏳ **After:** Write design document and implementation plan

---

## Questions to Explore (Option A)

### Module Selection

- Which 2-3 modules should we prioritize?
- What's the dependency order? (e.g., Departments needed for Tasks?)

### Domain Design

- What are the key entities and value objects for each module?
- What business rules need enforcement?
- What invariants must hold?

### Integration Strategy

- Phased rollout or big-bang migration?
- Backwards compatibility with existing code?
- How to handle GraphQL schema alignment?

### Testing Strategy

- Unit tests for domain entities (fast, no I/O)
- Integration tests for adapters
- E2E tests for routes

---

## References

- Employee module: `src/domain/Employee/`
- EmployeeService: `src/services/EmployeeService.ts`
- GraphQLEmployeeAdapter: `src/adapters/GraphQLEmployeeAdapter.ts`
- Intuit Sync design: `docs/plans/2026-02-04-intuit-sync-hexagonal-design.md`
