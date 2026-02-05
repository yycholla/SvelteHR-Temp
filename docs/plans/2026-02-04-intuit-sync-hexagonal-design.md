# Intuit Sync System - Hexagonal Architecture Refactor

**Date:** 2026-02-04
**Status:** Approved
**Scope:** Full stack (Rust backend, SvelteKit API, Svelte UI)

## Overview

Refactor the Intuit/QuickBooks sync system from its current tightly-coupled architecture to a hexagonal (ports & adapters) architecture, matching the Employee module pattern. This improves maintainability, testability, and reliability while providing a more intuitive user experience.

### Goals

- **Maintainability:** Clear separation of concerns, single-responsibility components
- **Testability:** Domain logic unit-testable without I/O
- **Reliability:** Typed errors, collect-and-continue error handling, proper async patterns
- **UX:** Consolidated dashboard, actionable errors, at-a-glance visibility

### Current Pain Points

1. God object orchestrator (~1500 lines, 6+ responsibilities)
2. No domain layer (business logic mixed with I/O)
3. Generic `anyhow::Result` errors (no typed error handling)
4. N+1 query patterns in change detection
5. `block_on()` anti-pattern in async fallback logic
6. Fragmented UI (12+ sub-pages)
7. Errors shown without actionable guidance

---

## Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                           │
│  (Pure business logic - no I/O, no frameworks)              │
│                                                             │
│  Entities: Sync, SyncEntity, Conflict, ChangeSet            │
│  Value Objects: SyncStatus, ConflictStrategy, EntityType    │
│  Domain Errors: SyncError, ConflictError, ValidationError   │
│  Domain Services: ConflictResolver, ChangeDetector          │
│  Preserved: ValidationEngine (integrate, don't rewrite)     │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ (Ports - trait interfaces)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│  (Orchestration - coordinates domain + adapters)            │
│                                                             │
│  SyncService: Orchestrates sync operations                  │
│  Returns: SyncReport with collected successes/errors        │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ (Adapter implementations)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     ADAPTER LAYER                           │
│  (I/O boundaries - implements ports)                        │
│                                                             │
│  QuickBooksAdapter: Implements QuickBooksPort trait         │
│  SyncRepository: Implements SyncRepositoryPort trait        │
│  WebhookAdapter: Translates webhooks to domain events       │
│  SchedulerAdapter: Triggers SyncService on schedule         │
└─────────────────────────────────────────────────────────────┘
```

### Key Principle

Domain layer has zero dependencies on Rust frameworks, databases, or HTTP. All I/O goes through port traits, making business logic fully unit-testable.

---

## Domain Model

### Core Entities

```rust
/// The central aggregate - represents a sync operation
pub struct Sync {
    id: SyncId,
    entity_type: EntityType,
    direction: SyncDirection,
    mode: SyncMode,
    status: SyncStatus,
    started_at: DateTime<Utc>,
    completed_at: Option<DateTime<Utc>>,
    change_set: ChangeSet,
    report: SyncReport,
}

/// Tracks individual entity changes
pub struct SyncEntity {
    local_id: Option<EntityId>,
    remote_id: Option<QuickBooksId>,
    entity_type: EntityType,
    change_type: ChangeType,
    local_version: Option<EntityVersion>,
    remote_version: Option<EntityVersion>,
}

/// Represents a detected conflict
pub struct Conflict {
    entity: SyncEntity,
    local_data: EntitySnapshot,
    remote_data: EntitySnapshot,
    detected_at: DateTime<Utc>,
    resolution: Option<ConflictResolution>,
}
```

### Value Objects

```rust
pub enum EntityType { Employee, Department }
pub enum SyncDirection { Push, Pull, Bidirectional }
pub enum SyncMode { Full, Incremental }
pub enum SyncStatus { Pending, InProgress, Completed, Failed }
pub enum ChangeType { Created, Updated, Deleted, Unchanged }

/// Preserved from current implementation - already well-designed
pub enum ConflictStrategy { LocalWins, RemoteWins, LastWriteWins, Manual }
```

### Domain Errors (Typed)

```rust
pub enum SyncError {
    TokenExpired { realm_id: String },
    RateLimited { retry_after: Duration },
    ValidationFailed { entity_id: String, violations: Vec<Violation> },
    ConflictDetected { conflicts: Vec<Conflict> },
    EntityNotFound { entity_type: EntityType, id: String },
    QuickBooksApiError { code: String, message: String, retryable: bool },
}
```

### Sync Report (Collect-and-Continue)

```rust
pub struct SyncReport {
    pub entity_type: EntityType,
    pub direction: SyncDirection,
    pub started_at: DateTime<Utc>,
    pub completed_at: DateTime<Utc>,
    pub pushed: Vec<SyncedEntity>,
    pub pulled: Vec<SyncedEntity>,
    pub conflicts_detected: usize,
    pub conflicts_resolved: usize,
    pub errors: Vec<SyncError>,  // Collected, not thrown
    pub status: SyncStatus,      // Computed from errors
}
```

---

## Ports (Trait Interfaces)

### QuickBooksPort

```rust
#[async_trait]
pub trait QuickBooksPort: Send + Sync {
    async fn list_employees(&self, since: Option<DateTime<Utc>>)
        -> Result<Vec<RemoteEmployee>, SyncError>;
    async fn get_employee(&self, id: &QuickBooksId)
        -> Result<RemoteEmployee, SyncError>;
    async fn create_employee(&self, data: EmployeeData)
        -> Result<RemoteEmployee, SyncError>;
    async fn update_employee(&self, id: &QuickBooksId, data: EmployeeData)
        -> Result<RemoteEmployee, SyncError>;

    // Departments - best effort, errors collected not fatal
    async fn list_departments(&self, since: Option<DateTime<Utc>>)
        -> Result<Vec<RemoteDepartment>, SyncError>;
    async fn upsert_department(&self, data: DepartmentData)
        -> Result<RemoteDepartment, SyncError>;
}
```

### SyncRepositoryPort

```rust
#[async_trait]
pub trait SyncRepositoryPort: Send + Sync {
    async fn get_local_changes(&self, entity_type: EntityType, since: DateTime<Utc>)
        -> Result<Vec<SyncEntity>, SyncError>;
    async fn mark_synced(&self, entities: &[SyncEntity])
        -> Result<(), SyncError>;
    async fn save_conflicts(&self, conflicts: &[Conflict])
        -> Result<(), SyncError>;
    async fn get_pending_conflicts(&self)
        -> Result<Vec<Conflict>, SyncError>;
    async fn save_sync_log(&self, sync: &Sync)
        -> Result<(), SyncError>;
}
```

### HealthPort

```rust
#[async_trait]
pub trait HealthPort: Send + Sync {
    async fn record_sync_completed(&self, report: &SyncReport) -> Result<(), SyncError>;
    async fn get_health_status(&self) -> Result<HealthStatus, SyncError>;
}
```

---

## Application Layer

### SyncService

```rust
pub struct SyncService<Q: QuickBooksPort, R: SyncRepositoryPort, H: HealthPort> {
    quickbooks: Q,
    repository: R,
    health: H,
    conflict_resolver: ConflictResolver,  // Domain service (no I/O)
    change_detector: ChangeDetector,       // Domain service (no I/O)
    validation_engine: ValidationEngine,   // Preserved from current impl
}

impl<Q, R, H> SyncService<Q, R, H>
where Q: QuickBooksPort, R: SyncRepositoryPort, H: HealthPort
{
    /// Main entry point - bidirectional sync with conflict resolution
    pub async fn sync_bidirectional(
        &self,
        entity_type: EntityType,
        mode: SyncMode,
        strategy: ConflictStrategy,
    ) -> SyncReport {
        let mut report = SyncReport::new(entity_type, SyncDirection::Bidirectional);

        // 1. Detect changes (both sides)
        let local_changes = self.collect_local_changes(&mut report, entity_type, mode).await;
        let remote_changes = self.collect_remote_changes(&mut report, entity_type, mode).await;

        // 2. Detect conflicts (pure domain logic)
        let (conflicts, pushable, pullable) =
            self.change_detector.partition_changes(local_changes, remote_changes);

        // 3. Resolve conflicts (pure domain logic)
        let resolved = self.conflict_resolver.resolve_all(conflicts, strategy);
        report.conflicts_detected = resolved.len();

        // 4. Execute sync (collect errors, don't fail)
        self.push_changes(&mut report, pushable, &resolved).await;
        self.pull_changes(&mut report, pullable, &resolved).await;

        // 5. Record health metrics
        let _ = self.health.record_sync_completed(&report).await;

        report
    }
}
```

---

## Adapter Layer

### QuickBooksAdapter

```rust
pub struct QuickBooksAdapter {
    client: HttpClient,
    token_manager: TokenManager,  // Handles refresh automatically
    realm_id: String,
}

#[async_trait]
impl QuickBooksPort for QuickBooksAdapter {
    async fn list_employees(&self, since: Option<DateTime<Utc>>)
        -> Result<Vec<RemoteEmployee>, SyncError>
    {
        let token = self.token_manager.get_valid_token().await
            .map_err(|_| SyncError::TokenExpired { realm_id: self.realm_id.clone() })?;

        let query = match since {
            Some(ts) => format!(
                "SELECT * FROM Employee WHERE Metadata.LastUpdatedTime > '{}'",
                ts
            ),
            None => "SELECT * FROM Employee".to_string(),
        };

        let response = self.client.query(&token, &query).await
            .map_err(|e| self.translate_api_error(e))?;

        // Translate QB types to domain types (sanitize at boundary)
        Ok(response.employees.into_iter()
            .filter_map(|e| RemoteEmployee::try_from(e).ok())
            .collect())
    }
}
```

### SeaOrmSyncRepository

```rust
pub struct SeaOrmSyncRepository {
    db: DatabaseConnection,
}

#[async_trait]
impl SyncRepositoryPort for SeaOrmSyncRepository {
    async fn get_local_changes(&self, entity_type: EntityType, since: DateTime<Utc>)
        -> Result<Vec<SyncEntity>, SyncError>
    {
        // Single query with proper filtering (no N+1)
        let entities = match entity_type {
            EntityType::Employee => self.query_changed_employees(since).await?,
            EntityType::Department => self.query_changed_departments(since).await?,
        };
        Ok(entities)
    }

    async fn mark_synced(&self, entities: &[SyncEntity]) -> Result<(), SyncError> {
        // Single batch UPDATE, not individual queries
        let ids: Vec<_> = entities.iter().map(|e| &e.local_id).collect();
        // UPDATE ... WHERE id IN (...)
    }
}
```

### WebhookAdapter

```rust
/// Translates webhook events to domain events, triggers SyncService
pub struct WebhookAdapter<S: SyncServiceTrait> {
    sync_service: S,
    signature_verifier: HmacVerifier,
}

impl<S: SyncServiceTrait> WebhookAdapter<S> {
    pub async fn handle_webhook(&self, payload: &[u8], signature: &str) -> Result<(), SyncError> {
        // 1. Verify signature
        self.signature_verifier.verify(payload, signature)?;

        // 2. Parse to domain event
        let event = WebhookEvent::parse(payload)?;

        // 3. Trigger appropriate sync (async, non-blocking)
        match event {
            WebhookEvent::EmployeeChanged { id } => {
                tokio::spawn(async move {
                    self.sync_service.sync_single(EntityType::Employee, id).await
                });
            }
            WebhookEvent::DepartmentChanged { id } => {
                tokio::spawn(async move {
                    self.sync_service.sync_single(EntityType::Department, id).await
                });
            }
        }

        Ok(())
    }
}
```

### SchedulerAdapter

```rust
/// Triggers SyncService based on configured schedules
pub struct SchedulerAdapter<S: SyncServiceTrait, R: ScheduleRepository> {
    sync_service: S,
    schedule_repo: R,
}

impl<S, R> SchedulerAdapter<S, R> {
    /// Called by cron/timer - checks schedules and triggers syncs
    pub async fn tick(&self) -> Result<(), SyncError> {
        let due_schedules = self.schedule_repo.get_due_schedules().await?;

        for schedule in due_schedules {
            let report = self.sync_service.sync_bidirectional(
                schedule.entity_type,
                schedule.mode,
                schedule.conflict_strategy,
            ).await;

            self.schedule_repo.record_execution(&schedule, &report).await?;
        }

        Ok(())
    }
}
```

---

## Anti-Pattern Fix: block_on() Removal

### Current Problem

```rust
// PROBLEMATIC: blocking await inside async context
let mut report = match decision.sync_mode {
    SyncMode::Incremental => {
        Self::sync_bidirectional_incremental(...)
            .await
            .unwrap_or_else(|e| {
                // This can cause deadlocks!
                let full_result = futures::executor::block_on(
                    Self::sync_bidirectional(db, client, entity_type, strategy)
                );
                // ...
            })
    }
}
```

### Fixed Approach

```rust
// CORRECT: proper async fallback
pub async fn sync_with_fallback(&self, ...) -> SyncReport {
    match self.sync_incremental(...).await {
        Ok(report) => report,
        Err(e) => {
            tracing::warn!("Incremental sync failed, falling back to full: {}", e);
            // Proper async call, no blocking
            self.sync_full(...).await
        }
    }
}
```

---

## SvelteKit API Layer

### Consolidated Endpoints

```
/api/intuit/
├── connection/
│   ├── +server.ts          GET (status), POST (connect), DELETE (disconnect)
│   └── callback/+server.ts GET (OAuth callback)
│
├── sync/
│   ├── +server.ts          POST (trigger sync with options)
│   └── status/+server.ts   GET (current status, recent history)
│
├── conflicts/
│   ├── +server.ts          GET (list pending), POST (bulk resolve)
│   └── [id]/+server.ts     GET (single), PATCH (resolve one)
│
└── health/+server.ts       GET (dashboard health metrics)
```

### Example: Sync Endpoint

```typescript
// src/routes/api/intuit/sync/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { client } from '$lib/graphql/client';
import { TRIGGER_SYNC } from '$lib/graphql/intuit-operations';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { entityTypes, mode, conflictStrategy } = await request.json();

	const result = await client.mutation(TRIGGER_SYNC, {
		entityTypes, // ['Employee', 'Department']
		mode, // 'Full' | 'Incremental'
		conflictStrategy // 'LocalWins' | 'RemoteWins' | 'Manual'
	});

	return json({
		status: result.data.sync.status,
		pushed: result.data.sync.pushed,
		pulled: result.data.sync.pulled,
		conflicts: result.data.sync.conflicts,
		errors: result.data.sync.errors
	});
};
```

### Command Palette Updates

Update `src/lib/command-palette/commands/quickbooks.ts` to use new endpoints:

```typescript
export const quickbooksCommands: Command[] = [
	{
		id: 'qb-sync',
		name: 'Sync with QuickBooks',
		action: async () => {
			// Use new consolidated endpoint
			await fetch('/api/intuit/sync', {
				method: 'POST',
				body: JSON.stringify({
					entityTypes: ['Employee', 'Department'],
					mode: 'Incremental',
					conflictStrategy: 'Manual'
				})
			});
		}
	},
	{
		id: 'qb-view-conflicts',
		name: 'View QuickBooks Conflicts',
		action: () => goto('/admin/settings/integrations/quickbooks?tab=conflicts')
	}
];
```

---

## UI Design

### Consolidated Dashboard

Single page: `/admin/settings/integrations/quickbooks`

```
┌─────────────────────────────────────────────────────────────────────┐
│  QuickBooks Integration                            [Disconnect]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   STATUS    │  │  LAST SYNC  │  │  PENDING    │  │  ERRORS    │ │
│  │ ● Healthy   │  │ 5 min ago   │  │ 3 conflicts │  │ 0 issues   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  [Sync Now ▼]     Employees ✓  Departments ✓      Full | Incr  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ NEEDS ATTENTION ───────────────────────────────────────────────┐│
│  │                                                                 ││
│  │  ⚠ 3 Conflicts need resolution                     [Resolve →] ││
│  │    John Smith - Name differs (local: "Jon", QB: "John")        ││
│  │    Jane Doe - Email differs                                    ││
│  │    Acme Dept - Parent changed                                  ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ RECENT ACTIVITY ───────────────────────────────────────────────┐│
│  │  ✓ 2:45 PM - Synced 12 employees, 3 departments                ││
│  │  ✓ 1:30 PM - Synced 2 employees (incremental)                  ││
│  │  ✗ 11:00 AM - Failed: Rate limit exceeded (auto-retry in 5m)   ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Conflict Resolution Panel

Expands inline when clicking "Resolve":

```
┌─ CONFLICT: John Smith ──────────────────────────────────────────────┐
│                                                                     │
│  Field          Local (HR System)       QuickBooks                  │
│  ─────────────────────────────────────────────────────────────────  │
│  First Name     ○ Jon                   ● John                      │
│  Email          ● jon@company.com       ○ john@company.com          │
│  Department     ● Engineering           ○ Engineering               │
│                      (same)                  (same)                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Quick actions:                                               │   │
│  │   [Accept All Local]  [Accept All QB]  [Accept Selected]     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Last modified: Local 2 hours ago | QuickBooks 30 min ago           │
│                                                                     │
│                                    [Cancel]  [Apply Resolution]     │
└─────────────────────────────────────────────────────────────────────┘
```

### Actionable Error Display

```
┌─ ERRORS (2) ────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌─ AUTHENTICATION ─────────────────────────────────────────────┐  │
│  │  ⚠ Token expired                                             │  │
│  │  QuickBooks session ended. Re-authenticate to continue.      │  │
│  │                                              [Reconnect →]   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ VALIDATION (1 employee) ────────────────────────────────────┐  │
│  │  ✗ Sarah Connor - Missing required field                     │  │
│  │  QuickBooks requires "SSN" but local record is empty.        │  │
│  │                                                              │  │
│  │  Options:                                                    │  │
│  │    [Edit Employee →]  [Skip this employee]  [Retry Sync]     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ RATE LIMITED ───────────────────────────────────────────────┐  │
│  │  ⏳ Too many requests                                         │  │
│  │  QuickBooks limit reached. Auto-retry in 4 minutes.          │  │
│  │                                              [Retry Now]     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Error Category Mapping

| Domain Error                     | UI Category    | Auto-Retry      | User Action         |
| -------------------------------- | -------------- | --------------- | ------------------- |
| `TokenExpired`                   | Authentication | No              | Reconnect           |
| `RateLimited`                    | Rate Limited   | Yes (countdown) | Wait or Retry       |
| `ValidationFailed`               | Validation     | No              | Edit entity or Skip |
| `ConflictDetected`               | Conflicts      | No              | Resolve             |
| `QuickBooksApiError` (retryable) | Temporary      | Yes             | Wait                |
| `QuickBooksApiError` (permanent) | API Error      | No              | Contact support     |

---

## Testing Strategy

### Domain Layer (Unit Tests)

Fast, no I/O dependencies:

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn conflict_resolver_local_wins_keeps_local_data() {
        let conflict = Conflict {
            entity: SyncEntity::employee("emp-1", "qb-123"),
            local_data: snapshot("Jon", "jon@co.com"),
            remote_data: snapshot("John", "john@co.com"),
            ..Default::default()
        };

        let resolved = ConflictResolver::resolve(conflict, ConflictStrategy::LocalWins);

        assert_eq!(resolved.winner, Winner::Local);
        assert_eq!(resolved.data.first_name, "Jon");
    }

    #[test]
    fn change_detector_identifies_conflicts_when_both_modified() {
        let local = vec![change("emp-1", ChangeType::Updated, ts("2025-01-15"))];
        let remote = vec![change("emp-1", ChangeType::Updated, ts("2025-01-16"))];

        let (conflicts, _, _) = ChangeDetector::partition_changes(local, remote);

        assert_eq!(conflicts.len(), 1);
    }
}
```

### Application Layer (Integration Tests with Mocks)

```rust
#[tokio::test]
async fn sync_service_collects_errors_and_continues() {
    let mut mock_qb = MockQuickBooksPort::new();
    mock_qb.expect_list_employees()
        .returning(|_| Ok(vec![employee("1"), employee("2"), employee("3")]));
    mock_qb.expect_update_employee()
        .with(eq("1"), any())
        .returning(|_, _| Err(SyncError::ValidationFailed { .. }));
    mock_qb.expect_update_employee()
        .returning(|_, _| Ok(()));

    let service = SyncService::new(mock_qb, mock_repo, mock_health);
    let report = service.sync_bidirectional(EntityType::Employee, ...).await;

    assert_eq!(report.pushed.len(), 2);       // 2 succeeded
    assert_eq!(report.errors.len(), 1);        // 1 failed
    assert_eq!(report.status, SyncStatus::Completed);
}
```

### Adapter Layer (Integration Tests)

```rust
#[tokio::test]
#[ignore]  // Run manually or in CI with credentials
async fn quickbooks_adapter_handles_token_refresh() {
    let adapter = QuickBooksAdapter::new_with_expired_token(..);

    let result = adapter.list_employees(None).await;

    assert!(result.is_ok());  // Token was refreshed automatically
}
```

### Frontend (Vitest + Playwright)

- Component tests for conflict resolution UI
- E2E tests for full sync flow

---

## Implementation Phases

### Phase 1: Domain Layer (Rust) - ~20%

- [ ] Create domain entities: `Sync`, `SyncEntity`, `Conflict`, `ChangeSet`
- [ ] Create value objects: `EntityType`, `SyncStatus`, `ConflictStrategy`
- [ ] Create typed errors: `SyncError` enum with all variants
- [ ] Create domain services: `ConflictResolver`, `ChangeDetector`
- [ ] Integrate existing `ValidationEngine`
- [ ] Write unit tests (no I/O dependencies)

### Phase 2: Ports & Adapters (Rust) - ~35%

- [ ] Define port traits: `QuickBooksPort`, `SyncRepositoryPort`, `HealthPort`
- [ ] Implement `QuickBooksAdapter` (wrap existing client, add error translation)
- [ ] Implement `SeaOrmSyncRepository` (fix N+1 queries, batch operations)
- [ ] Implement `WebhookAdapter` (translate events, trigger SyncService)
- [ ] Implement `SchedulerAdapter` (trigger on schedule)
- [ ] Implement `SyncService` orchestration
- [ ] Fix `block_on()` anti-pattern
- [ ] Write integration tests with mocks

### Phase 3: GraphQL & API Layer - ~15%

- [ ] Update GraphQL schema to expose new domain types
- [ ] Consolidate SvelteKit API endpoints
- [ ] Update mutations/queries to use `SyncService`
- [ ] Update command palette commands
- [ ] Ensure backward compatibility during transition

### Phase 4: UI Redesign (Svelte) - ~30%

- [ ] Build consolidated dashboard component
- [ ] Build status cards (health, last sync, conflicts, errors)
- [ ] Build sync trigger controls
- [ ] Build "Needs Attention" section
- [ ] Build conflict resolution panel (field-level)
- [ ] Build actionable error display
- [ ] Build recent activity feed
- [ ] Remove old fragmented pages
- [ ] E2E tests for sync flows

---

## Entity Notes

### Employees

- Primary sync entity
- Full bidirectional support
- True source-of-truth model (either side can be authoritative)

### Departments

- Secondary/optional sync entity
- Best-effort approach (errors collected, don't block sync)
- Creation may not be supported by QuickBooks API
- Attempt upsert, continue if fails
- Hierarchy support not implemented (future enhancement)

---

## Files to Modify/Create

### Rust Backend (graphql-rust-server)

**New files:**

- `src/domain/sync/mod.rs` - Domain module
- `src/domain/sync/entities.rs` - Sync, SyncEntity, Conflict
- `src/domain/sync/value_objects.rs` - Enums and value types
- `src/domain/sync/errors.rs` - SyncError enum
- `src/domain/sync/services/mod.rs` - Domain services
- `src/domain/sync/services/conflict_resolver.rs`
- `src/domain/sync/services/change_detector.rs`
- `src/ports/mod.rs` - Port traits
- `src/ports/quickbooks.rs` - QuickBooksPort
- `src/ports/sync_repository.rs` - SyncRepositoryPort
- `src/adapters/quickbooks_adapter.rs`
- `src/adapters/sync_repository_adapter.rs`
- `src/adapters/webhook_adapter.rs`
- `src/adapters/scheduler_adapter.rs`
- `src/application/sync_service.rs`

**Modified files:**

- `src/integrations/intuit/client.rs` - Wrapped by adapter
- `src/services/sync_orchestrator.rs` - Deprecated, replaced by SyncService
- `src/handlers/intuit_webhook.rs` - Use WebhookAdapter

### SvelteKit

**New files:**

- `src/routes/api/intuit/connection/+server.ts`
- `src/routes/api/intuit/connection/callback/+server.ts`
- `src/routes/api/intuit/sync/+server.ts`
- `src/routes/api/intuit/sync/status/+server.ts`
- `src/routes/api/intuit/conflicts/+server.ts`
- `src/routes/api/intuit/conflicts/[id]/+server.ts`
- `src/routes/api/intuit/health/+server.ts`
- `src/lib/components/integrations/IntuitDashboard.svelte`
- `src/lib/components/integrations/ConflictResolutionPanel.svelte`
- `src/lib/components/integrations/ActionableErrorDisplay.svelte`
- `src/lib/components/integrations/SyncStatusCards.svelte`

**Modified files:**

- `src/routes/admin/settings/integrations/+page.svelte` - Use new dashboard
- `src/lib/command-palette/commands/quickbooks.ts` - New endpoints

**Removed files (after migration):**

- `src/routes/api/intuit/pull/+server.ts`
- `src/routes/api/intuit/push/+server.ts`
- `src/routes/api/intuit/sync-bidirectional/+server.ts`
- `src/routes/admin/settings/integrations/*/` - Old sub-pages

---

## Success Criteria

1. **Maintainability:** New developer can understand sync flow by reading domain layer
2. **Testability:** Domain logic has 80%+ unit test coverage without mocks
3. **Reliability:** Typed errors enable proper error handling at every layer
4. **Performance:** No N+1 queries; batch operations for bulk sync
5. **UX:** Users can see status, resolve conflicts, and fix errors from single page
