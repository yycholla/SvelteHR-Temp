# Time Entry Sync Integration Design

**Date:** 2026-02-06
**Status:** Approved
**Related:** [Intuit Sync Hexagonal Design](./2026-02-04-intuit-sync-hexagonal-design.md)

## Problem Statement

The current codebase has two separate sync systems with conflicting GraphQL type names:

1. **Legacy Time Entry Sync** (`TimeTrackingSync` service)
   - Direct QuickBooks API calls
   - `SyncStatus` enum for time entry states
   - Independent retry/error handling logic

2. **New Hexagonal Sync** (Employees/Departments)
   - Domain-driven design with ports & adapters
   - `SyncStatus` enum for sync operation lifecycle
   - Unified conflict resolution, health monitoring, audit trail

**Conflict:** Both systems register a `SyncStatus` enum with async-graphql, preventing the Rust server from starting.

**Solution:** Extend the hexagonal sync architecture to include time entries as a third entity type, eliminating the legacy system and the naming conflict.

---

## Design Overview

### Strategy

Unify all QuickBooks sync under the hexagonal architecture by adding `TimeEntry` as a third entity type alongside `Employee` and `Department`. This provides:

- **Single source of truth** for sync operations
- **Shared infrastructure** for conflict resolution, retry logic, health monitoring
- **Consistent API** for all sync operations
- **Resolution of naming conflict** by removing duplicate `SyncStatus` enum

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│ GraphQL API Layer (Schema)                               │
│ - syncTimeEntries mutation                               │
│ - Uses unified SyncOrchestrator                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Application Layer (Services)                             │
│ - SyncOrchestrator handles Employee, Department,        │
│   and TimeEntry                                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Domain Layer (Pure Business Logic)                      │
│ - TimeEntry entity with business rules                  │
│ - Hours value object with validation                    │
│ - ApprovalStatus workflow state                         │
│ - Shared SyncStatus for all operations                  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Adapter Layer (QuickBooks Integration)                  │
│ - QuickBooksTimeEntryAdapter implements QuickBooksPort  │
│ - Maps TimeEntry ↔ QuickBooks TimeActivity API          │
└─────────────────────────────────────────────────────────┘
```

---

## Domain Model

### TimeEntry Entity

```rust
// src/domain/sync/entities/time_entry.rs

pub struct TimeEntry {
    // Identity
    id: Uuid,
    employee_id: Uuid,  // Maps to user_id in database

    // Core data
    entry_date: NaiveDate,
    hours: Hours,  // Value object with validation
    project_id: Option<Uuid>,
    description: Option<String>,
    is_billable: bool,

    // Workflow state
    approval_status: ApprovalStatus,
    approved_by: Option<Uuid>,
    approved_at: Option<DateTime<Utc>>,

    // Sync metadata
    quickbooks_id: Option<String>,  // Maps to quickbooks_time_activity_id
    last_modified_at: DateTime<Utc>,
    sync_token: Option<String>,
}
```

### Value Objects

```rust
/// Hours with business rule validation
pub struct Hours(Decimal);

impl Hours {
    pub fn new(value: f64) -> Result<Self, DomainError> {
        if value <= 0.0 || value > 24.0 {
            return Err(DomainError::InvalidHours);
        }
        Ok(Hours(Decimal::from_f64_retain(value).unwrap()))
    }

    pub fn as_decimal(&self) -> Decimal {
        self.0
    }
}

/// Time entry approval workflow states
pub enum ApprovalStatus {
    Draft,      // Can be edited, cannot be synced
    Submitted,  // Pending approval, cannot be edited
    Approved,   // Can be synced to QuickBooks
    Rejected,   // Cannot be synced
}
```

### Business Rules

**Sync Eligibility:**

```rust
impl TimeEntry {
    pub fn is_syncable(&self) -> bool {
        self.approval_status == ApprovalStatus::Approved &&
        self.project_id.is_some()
    }
}
```

**Invariants:**

- Hours must be between 0 and 24 per entry
- Only `Approved` time entries can be synced
- Cannot edit entries that are already synced (have `quickbooks_id`)
- Cannot delete synced entries without creating a deletion sync operation
- Project association required for sync (QuickBooks requires customer reference)

---

## Adapter Layer

### QuickBooksTimeEntryAdapter

```rust
// src/adapters/quickbooks/time_entry_adapter.rs

pub struct QuickBooksTimeEntryAdapter {
    client: Arc<IntuitClient>,
    db: Arc<DatabaseConnection>,
}

impl QuickBooksPort<TimeEntry> for QuickBooksTimeEntryAdapter {
    async fn push(&self, entries: Vec<TimeEntry>) -> Result<Vec<SyncResult>, SyncError> {
        // Maps TimeEntry domain model to QuickBooks TimeActivity API
        // POST to: /v3/company/{realmId}/timeactivity
        // Filters out non-syncable entries (draft, no project, etc.)
    }

    async fn pull(&self, since: Option<DateTime<Utc>>) -> Result<Vec<TimeEntry>, SyncError> {
        // Query: SELECT * FROM TimeActivity WHERE TxnDate >= ?
        // Maps QuickBooks TimeActivity response to TimeEntry domain model
    }

    async fn get_by_id(&self, qb_id: &str) -> Result<Option<TimeEntry>, SyncError> {
        // GET: /v3/company/{realmId}/timeactivity/{id}
    }
}
```

### API Mapping

| Domain Field  | QuickBooks TimeActivity Field | Transformation                                  |
| ------------- | ----------------------------- | ----------------------------------------------- |
| `employee_id` | `EmployeeRef.value`           | Look up via employee's `quickbooks_employee_id` |
| `entry_date`  | `TxnDate`                     | ISO date format (YYYY-MM-DD)                    |
| `hours`       | `Hours` + `Minutes`           | Convert decimal to H:MM (e.g., 7.5 → 7:30)      |
| `project_id`  | `CustomerRef.value`           | Look up via project's `quickbooks_customer_id`  |
| `description` | `Description`                 | Direct string mapping                           |
| `is_billable` | `BillableStatus`              | Map to "Billable" or "NotBillable"              |
| `sync_token`  | `SyncToken`                   | Required for updates, optimistic locking        |

### QuickBooks API Endpoints

- **Create/Update:** `POST /v3/company/{realmId}/timeactivity`
- **Read:** `GET /v3/company/{realmId}/timeactivity/{id}`
- **Query:** `POST /v3/company/{realmId}/query` with `SELECT * FROM TimeActivity WHERE ...`

### Error Handling

Adapter translates QuickBooks API errors to domain `SyncError`:

```rust
pub enum SyncError {
    // ... existing errors ...
    InvalidTimeEntry { reason: String },           // Hours out of range, missing project
    EmployeeMappingFailed { employee_id: Uuid },  // No QuickBooks employee ID
    ProjectMappingFailed { project_id: Uuid },    // No QuickBooks customer ID
}
```

---

## Database Schema Changes

### Migration: m20260206_001_extend_time_entries_for_sync.rs

**Changes to `hr_public.time_entries` table:**

1. **Add `last_modified_at`** (required for incremental sync)
   - Type: `TIMESTAMPTZ NOT NULL`
   - Default: `NOW()`
   - Backfilled from `updated_at`

2. **Add `quickbooks_sync_token`** (QuickBooks optimistic locking)
   - Type: `TEXT NULL`

3. **Rename `sync_status` → `sync_state`** (clarity)
   - Existing column, just renamed
   - Values remain: 'not_synced', 'pending', 'synced', 'failed'
   - Actual sync operation status tracked in `sync_logs` table

**Migration implementation:**

```rust
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Add last_modified_at column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .add_column(
                        ColumnDef::new(TimeEntries::LastModifiedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp())
                    )
                    .to_owned(),
            )
            .await?;

        // 2. Add quickbooks_sync_token column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .add_column(
                        ColumnDef::new(TimeEntries::QuickbooksSyncToken)
                            .string()
                            .null()
                    )
                    .to_owned(),
            )
            .await?;

        // 3. Backfill last_modified_at from updated_at
        let db = manager.get_connection();
        db.execute(Statement::from_string(
            manager.get_database_backend(),
            "UPDATE hr_public.time_entries
             SET last_modified_at = updated_at
             WHERE last_modified_at IS NULL".to_string(),
        ))
        .await?;

        // 4. Rename sync_status to sync_state
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .rename_column(TimeEntries::SyncStatus, TimeEntries::SyncState)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .rename_column(TimeEntries::SyncState, TimeEntries::SyncStatus)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .drop_column(TimeEntries::QuickbooksSyncToken)
                    .drop_column(TimeEntries::LastModifiedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Schema { HrPublic }

#[derive(Iden)]
enum TimeEntries {
    Table,
    SyncStatus,
    SyncState,
    LastModifiedAt,
    QuickbooksSyncToken,
}
```

**Data Preservation:**

- All existing time entries remain unchanged
- `quickbooks_time_activity_id` maps to domain's `quickbooks_id`
- Existing `sync_status` values preserved as `sync_state`
- Sync history will be migrated to unified `sync_logs` table

---

## Migration Strategy

### Phase 1: Immediate Fix (Resolve Naming Conflict)

**Goal:** Get tests and server running again

1. **Rename legacy enum** in `src/models/time/time_entry.rs`:

   ```rust
   #[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
   #[graphql(name = "TimeEntrySyncState")]
   pub enum TimeEntrySyncState {  // Was: SyncStatus
       #[graphql(name = "NOT_SYNCED")]
       NotSynced,
       #[graphql(name = "PENDING")]
       Pending,
       #[graphql(name = "SYNCED")]
       Synced,
       #[graphql(name = "FAILED")]
       Failed,
   }
   ```

2. **Update Model struct:**

   ```rust
   pub struct Model {
       // ... other fields ...
       pub sync_status: TimeEntrySyncState,  // Was: SyncStatus
   }
   ```

3. **Update all usages** in:
   - `src/schema/queries/time_entry.rs` (line 18, 35, 95-96)
   - `src/schema/mutations/time_entry.rs` (line 70, 106, 158)

**Result:** GraphQL naming conflict resolved, all tests can run.

### Phase 2: Database Migration

**Goal:** Add required columns for hexagonal architecture

1. Create migration file: `migration/m20260206_001_extend_time_entries_for_sync.rs`
2. Add to `migration/lib.rs`
3. Run migration: `mise run db:migrate`
4. Verify columns exist

### Phase 3: Domain Layer Implementation

**Goal:** Add TimeEntry entity to domain layer

1. Create `src/domain/sync/entities/time_entry.rs`
2. Implement `Hours` value object
3. Implement `ApprovalStatus` enum
4. Add business rules and invariants
5. Update `EntityType` enum to include `TimeEntry`
6. Write domain layer tests

### Phase 4: Adapter Implementation

**Goal:** Create QuickBooks adapter for time entries

1. Create `src/adapters/quickbooks/time_entry_adapter.rs`
2. Implement `QuickBooksPort<TimeEntry>` trait
3. Add API mapping logic (Hours conversion, reference lookups)
4. Implement error translation
5. Write adapter tests

### Phase 5: Service Integration

**Goal:** Integrate with SyncOrchestrator

1. Update `SyncOrchestrator::sync()` to handle `EntityType::TimeEntry`
2. Create `TimeEntryRepository` port for database operations
3. Implement repository adapter using SeaORM
4. Update GraphQL mutations to use new sync system

### Phase 6: Deprecation & Cleanup

**Goal:** Remove legacy system

1. Deprecate `TimeTrackingSync` service
2. Remove old sync mutations
3. Remove legacy `TimeSyncResult` type
4. Update documentation

---

## Benefits

### Immediate

- **Resolves GraphQL naming conflict** - server and tests can run
- **No data loss** - all existing time entries preserved

### Long-term

- **Unified sync architecture** - single codebase for all QuickBooks sync
- **Shared infrastructure** - conflict resolution, retry logic, health monitoring
- **Consistent API** - all entity types use same sync patterns
- **Better error handling** - typed domain errors instead of string messages
- **Improved testability** - domain layer tests without I/O dependencies
- **Audit trail** - unified sync history across all entity types

---

## Risks & Mitigations

| Risk                              | Impact | Mitigation                                  |
| --------------------------------- | ------ | ------------------------------------------- |
| Breaking existing time entry sync | HIGH   | Phase 1 keeps existing system working       |
| Data migration errors             | MEDIUM | Backfill in migration, verify with tests    |
| QuickBooks API differences        | MEDIUM | Adapter layer isolates API specifics        |
| Performance degradation           | LOW    | Incremental sync only pulls changed entries |

---

## Success Criteria

- [ ] GraphQL naming conflict resolved
- [ ] All existing tests pass
- [ ] Migration applied successfully
- [ ] Domain layer tests achieve >90% coverage
- [ ] Adapter correctly maps to QuickBooks TimeActivity API
- [ ] Can sync time entries using new SyncOrchestrator
- [ ] Legacy TimeTrackingSync service removed
- [ ] Documentation updated

---

## Related Documents

- [Intuit Sync Hexagonal Design](./2026-02-04-intuit-sync-hexagonal-design.md) - Base architecture
- [Intuit Sync Hexagonal Plan](./2026-02-04-intuit-sync-hexagonal-plan.md) - Implementation plan for Employee/Department

---

## Appendix: Entity Type Comparison

| Aspect             | Employee           | Department    | TimeEntry                |
| ------------------ | ------------------ | ------------- | ------------------------ |
| QuickBooks API     | `/employee`        | `/department` | `/timeactivity`          |
| Sync Direction     | Bidirectional      | Bidirectional | Bidirectional            |
| Conflict Scenarios | Email, SSN changes | Name changes  | Hour adjustments         |
| Approval Required  | No                 | No            | Yes (Approved status)    |
| Parent Relations   | Department         | Parent dept   | Project (Customer)       |
| Unique Challenges  | PII data           | Hierarchy     | Decimal hours conversion |
