# Intuit Sync Hexagonal Refactor - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the Intuit/QuickBooks sync system to hexagonal architecture with improved maintainability, testability, and UX.

**Architecture:** Domain-driven design with ports & adapters pattern. Domain layer contains pure business logic (no I/O). Ports define interfaces. Adapters implement I/O operations. Application layer orchestrates via SyncService.

**Tech Stack:** Rust (Axum, SeaORM, async-graphql), SvelteKit 2.43+, Svelte 5, TypeScript, Tailwind CSS 4

**Reference:** See `docs/plans/2026-02-04-intuit-sync-hexagonal-design.md` for full architecture details.

---

## Phase 1: Domain Layer (Rust)

### Task 1.1: Create Domain Module Structure

**Files:**

- Create: `graphql-rust-server/src/domain/mod.rs`
- Create: `graphql-rust-server/src/domain/sync/mod.rs`
- Modify: `graphql-rust-server/src/lib.rs` (add domain module)

**Step 1: Create domain directory and mod.rs**

```bash
mkdir -p graphql-rust-server/src/domain/sync
```

**Step 2: Create domain/mod.rs**

```rust
// graphql-rust-server/src/domain/mod.rs
pub mod sync;
```

**Step 3: Create domain/sync/mod.rs**

```rust
// graphql-rust-server/src/domain/sync/mod.rs
pub mod entities;
pub mod errors;
pub mod services;
pub mod value_objects;

pub use entities::*;
pub use errors::*;
pub use value_objects::*;
```

**Step 4: Add domain module to lib.rs**

In `graphql-rust-server/src/lib.rs`, add:

```rust
pub mod domain;
```

**Step 5: Verify compilation**

Run: `cd graphql-rust-server && cargo check`
Expected: Compilation succeeds (with warnings about empty modules)

**Step 6: Commit**

```bash
git add graphql-rust-server/src/domain graphql-rust-server/src/lib.rs
git commit -m "feat(sync): create domain module structure for hexagonal architecture"
```

---

### Task 1.2: Create Value Objects

**Files:**

- Create: `graphql-rust-server/src/domain/sync/value_objects.rs`

**Step 1: Write value objects with tests**

```rust
// graphql-rust-server/src/domain/sync/value_objects.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;

/// Types of entities that can be synced
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum EntityType {
    Employee,
    Department,
}

impl fmt::Display for EntityType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            EntityType::Employee => write!(f, "Employee"),
            EntityType::Department => write!(f, "Department"),
        }
    }
}

/// Direction of sync operation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SyncDirection {
    Push,
    Pull,
    Bidirectional,
}

impl fmt::Display for SyncDirection {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SyncDirection::Push => write!(f, "Push"),
            SyncDirection::Pull => write!(f, "Pull"),
            SyncDirection::Bidirectional => write!(f, "Bidirectional"),
        }
    }
}

/// Sync operation mode
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SyncMode {
    Full,
    Incremental,
}

/// Current status of a sync operation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SyncStatus {
    Pending,
    InProgress,
    Completed,
    CompletedWithErrors,
    Failed,
}

impl SyncStatus {
    /// Determine status based on error count
    pub fn from_error_count(total: usize, errors: usize) -> Self {
        if errors == 0 {
            SyncStatus::Completed
        } else if errors < total {
            SyncStatus::CompletedWithErrors
        } else {
            SyncStatus::Failed
        }
    }
}

/// Type of change detected for an entity
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ChangeType {
    Created,
    Updated,
    Deleted,
    Unchanged,
}

/// Strategy for resolving conflicts
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConflictStrategy {
    LocalWins,
    RemoteWins,
    LastWriteWins,
    Manual,
}

impl Default for ConflictStrategy {
    fn default() -> Self {
        ConflictStrategy::Manual
    }
}

/// Winner of a conflict resolution
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConflictWinner {
    Local,
    Remote,
    Merged,
    Pending,
}

/// Unique identifier for a local entity
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct EntityId(pub String);

impl EntityId {
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl From<uuid::Uuid> for EntityId {
    fn from(id: uuid::Uuid) -> Self {
        Self(id.to_string())
    }
}

/// Unique identifier for a QuickBooks entity
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct QuickBooksId(pub String);

impl QuickBooksId {
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// Version information for optimistic concurrency
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EntityVersion {
    pub sync_token: Option<String>,
    pub last_modified: DateTime<Utc>,
}

impl EntityVersion {
    pub fn new(last_modified: DateTime<Utc>) -> Self {
        Self {
            sync_token: None,
            last_modified,
        }
    }

    pub fn with_sync_token(mut self, token: impl Into<String>) -> Self {
        self.sync_token = Some(token.into());
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sync_status_from_no_errors() {
        assert_eq!(SyncStatus::from_error_count(10, 0), SyncStatus::Completed);
    }

    #[test]
    fn sync_status_from_some_errors() {
        assert_eq!(
            SyncStatus::from_error_count(10, 3),
            SyncStatus::CompletedWithErrors
        );
    }

    #[test]
    fn sync_status_from_all_errors() {
        assert_eq!(SyncStatus::from_error_count(10, 10), SyncStatus::Failed);
    }

    #[test]
    fn entity_id_from_uuid() {
        let uuid = uuid::Uuid::new_v4();
        let entity_id = EntityId::from(uuid);
        assert_eq!(entity_id.as_str(), uuid.to_string());
    }

    #[test]
    fn entity_type_display() {
        assert_eq!(format!("{}", EntityType::Employee), "Employee");
        assert_eq!(format!("{}", EntityType::Department), "Department");
    }
}
```

**Step 2: Run tests**

Run: `cd graphql-rust-server && cargo test domain::sync::value_objects`
Expected: All 5 tests pass

**Step 3: Commit**

```bash
git add graphql-rust-server/src/domain/sync/value_objects.rs
git commit -m "feat(sync): add domain value objects with tests"
```

---

### Task 1.3: Create Domain Errors

**Files:**

- Create: `graphql-rust-server/src/domain/sync/errors.rs`

**Step 1: Write typed domain errors**

```rust
// graphql-rust-server/src/domain/sync/errors.rs
use std::time::Duration;
use thiserror::Error;

use super::{EntityId, EntityType, QuickBooksId};

/// Validation violation details
#[derive(Debug, Clone)]
pub struct Violation {
    pub field: String,
    pub message: String,
    pub code: String,
}

impl Violation {
    pub fn new(field: impl Into<String>, message: impl Into<String>, code: impl Into<String>) -> Self {
        Self {
            field: field.into(),
            message: message.into(),
            code: code.into(),
        }
    }

    pub fn required(field: impl Into<String>) -> Self {
        let field_name = field.into();
        Self::new(
            field_name.clone(),
            format!("{} is required", field_name),
            "REQUIRED",
        )
    }

    pub fn invalid_format(field: impl Into<String>, expected: impl Into<String>) -> Self {
        let field_name = field.into();
        Self::new(
            field_name.clone(),
            format!("{} has invalid format, expected: {}", field_name, expected.into()),
            "INVALID_FORMAT",
        )
    }
}

/// Domain errors for sync operations
#[derive(Debug, Error)]
pub enum SyncError {
    #[error("Authentication token expired for realm {realm_id}")]
    TokenExpired { realm_id: String },

    #[error("Rate limited by QuickBooks API, retry after {retry_after:?}")]
    RateLimited { retry_after: Duration },

    #[error("Validation failed for entity {entity_id}: {message}")]
    ValidationFailed {
        entity_id: String,
        message: String,
        violations: Vec<Violation>,
    },

    #[error("Conflict detected for {entity_type} entity")]
    ConflictDetected {
        entity_type: EntityType,
        local_id: Option<EntityId>,
        remote_id: Option<QuickBooksId>,
    },

    #[error("Entity not found: {entity_type} with id {id}")]
    EntityNotFound { entity_type: EntityType, id: String },

    #[error("QuickBooks API error [{code}]: {message}")]
    QuickBooksApiError {
        code: String,
        message: String,
        retryable: bool,
    },

    #[error("Repository error: {message}")]
    RepositoryError { message: String },

    #[error("Invalid webhook signature")]
    InvalidWebhookSignature,

    #[error("Webhook payload parse error: {message}")]
    WebhookParseError { message: String },

    #[error("Internal error: {message}")]
    Internal { message: String },
}

impl SyncError {
    /// Check if this error is retryable
    pub fn is_retryable(&self) -> bool {
        match self {
            SyncError::RateLimited { .. } => true,
            SyncError::QuickBooksApiError { retryable, .. } => *retryable,
            SyncError::TokenExpired { .. } => false, // Requires re-auth
            SyncError::ValidationFailed { .. } => false,
            SyncError::ConflictDetected { .. } => false, // Requires resolution
            SyncError::EntityNotFound { .. } => false,
            SyncError::RepositoryError { .. } => true, // Might be transient
            SyncError::InvalidWebhookSignature => false,
            SyncError::WebhookParseError { .. } => false,
            SyncError::Internal { .. } => false,
        }
    }

    /// Get error code for API responses
    pub fn error_code(&self) -> &'static str {
        match self {
            SyncError::TokenExpired { .. } => "TOKEN_EXPIRED",
            SyncError::RateLimited { .. } => "RATE_LIMITED",
            SyncError::ValidationFailed { .. } => "VALIDATION_FAILED",
            SyncError::ConflictDetected { .. } => "CONFLICT_DETECTED",
            SyncError::EntityNotFound { .. } => "ENTITY_NOT_FOUND",
            SyncError::QuickBooksApiError { .. } => "QUICKBOOKS_API_ERROR",
            SyncError::RepositoryError { .. } => "REPOSITORY_ERROR",
            SyncError::InvalidWebhookSignature => "INVALID_SIGNATURE",
            SyncError::WebhookParseError { .. } => "WEBHOOK_PARSE_ERROR",
            SyncError::Internal { .. } => "INTERNAL_ERROR",
        }
    }

    /// Create a validation error with violations
    pub fn validation(entity_id: impl Into<String>, violations: Vec<Violation>) -> Self {
        let violations_summary: Vec<String> = violations.iter().map(|v| v.message.clone()).collect();
        SyncError::ValidationFailed {
            entity_id: entity_id.into(),
            message: violations_summary.join("; "),
            violations,
        }
    }

    /// Create a QuickBooks API error
    pub fn quickbooks_api(code: impl Into<String>, message: impl Into<String>, retryable: bool) -> Self {
        SyncError::QuickBooksApiError {
            code: code.into(),
            message: message.into(),
            retryable,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rate_limited_is_retryable() {
        let err = SyncError::RateLimited {
            retry_after: Duration::from_secs(60),
        };
        assert!(err.is_retryable());
    }

    #[test]
    fn token_expired_not_retryable() {
        let err = SyncError::TokenExpired {
            realm_id: "123".to_string(),
        };
        assert!(!err.is_retryable());
    }

    #[test]
    fn validation_error_has_correct_code() {
        let err = SyncError::validation("emp-1", vec![Violation::required("email")]);
        assert_eq!(err.error_code(), "VALIDATION_FAILED");
    }

    #[test]
    fn violation_required_helper() {
        let v = Violation::required("email");
        assert_eq!(v.field, "email");
        assert_eq!(v.code, "REQUIRED");
        assert!(v.message.contains("required"));
    }

    #[test]
    fn quickbooks_api_error_retryable_flag() {
        let retryable = SyncError::quickbooks_api("500", "Server error", true);
        assert!(retryable.is_retryable());

        let not_retryable = SyncError::quickbooks_api("400", "Bad request", false);
        assert!(!not_retryable.is_retryable());
    }
}
```

**Step 2: Add thiserror to Cargo.toml if not present**

Check `graphql-rust-server/Cargo.toml` for `thiserror`. If not present, add:

```toml
thiserror = "1.0"
```

**Step 3: Run tests**

Run: `cd graphql-rust-server && cargo test domain::sync::errors`
Expected: All 5 tests pass

**Step 4: Commit**

```bash
git add graphql-rust-server/src/domain/sync/errors.rs
git commit -m "feat(sync): add typed domain errors with retryable detection"
```

---

### Task 1.4: Create Domain Entities

**Files:**

- Create: `graphql-rust-server/src/domain/sync/entities.rs`

**Step 1: Write domain entities**

```rust
// graphql-rust-server/src/domain/sync/entities.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::{
    ChangeType, ConflictStrategy, ConflictWinner, EntityId, EntityType, EntityVersion,
    QuickBooksId, SyncDirection, SyncError, SyncMode, SyncStatus,
};

/// Unique identifier for a sync operation
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SyncId(pub String);

impl SyncId {
    pub fn new() -> Self {
        Self(uuid::Uuid::new_v4().to_string())
    }
}

impl Default for SyncId {
    fn default() -> Self {
        Self::new()
    }
}

/// Snapshot of entity data at a point in time
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntitySnapshot {
    pub fields: HashMap<String, serde_json::Value>,
    pub captured_at: DateTime<Utc>,
}

impl EntitySnapshot {
    pub fn new(fields: HashMap<String, serde_json::Value>) -> Self {
        Self {
            fields,
            captured_at: Utc::now(),
        }
    }

    pub fn get_field(&self, name: &str) -> Option<&serde_json::Value> {
        self.fields.get(name)
    }

    pub fn get_string(&self, name: &str) -> Option<&str> {
        self.fields.get(name).and_then(|v| v.as_str())
    }
}

/// Tracks an individual entity's sync state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncEntity {
    pub local_id: Option<EntityId>,
    pub remote_id: Option<QuickBooksId>,
    pub entity_type: EntityType,
    pub change_type: ChangeType,
    pub local_version: Option<EntityVersion>,
    pub remote_version: Option<EntityVersion>,
}

impl SyncEntity {
    pub fn employee(local_id: impl Into<String>, remote_id: impl Into<String>) -> Self {
        Self {
            local_id: Some(EntityId::new(local_id)),
            remote_id: Some(QuickBooksId::new(remote_id)),
            entity_type: EntityType::Employee,
            change_type: ChangeType::Unchanged,
            local_version: None,
            remote_version: None,
        }
    }

    pub fn department(local_id: impl Into<String>, remote_id: impl Into<String>) -> Self {
        Self {
            local_id: Some(EntityId::new(local_id)),
            remote_id: Some(QuickBooksId::new(remote_id)),
            entity_type: EntityType::Department,
            change_type: ChangeType::Unchanged,
            local_version: None,
            remote_version: None,
        }
    }

    pub fn local_only(entity_type: EntityType, local_id: impl Into<String>) -> Self {
        Self {
            local_id: Some(EntityId::new(local_id)),
            remote_id: None,
            entity_type,
            change_type: ChangeType::Created,
            local_version: None,
            remote_version: None,
        }
    }

    pub fn remote_only(entity_type: EntityType, remote_id: impl Into<String>) -> Self {
        Self {
            local_id: None,
            remote_id: Some(QuickBooksId::new(remote_id)),
            entity_type,
            change_type: ChangeType::Created,
            local_version: None,
            remote_version: None,
        }
    }

    pub fn with_change_type(mut self, change_type: ChangeType) -> Self {
        self.change_type = change_type;
        self
    }

    pub fn with_local_version(mut self, version: EntityVersion) -> Self {
        self.local_version = Some(version);
        self
    }

    pub fn with_remote_version(mut self, version: EntityVersion) -> Self {
        self.remote_version = Some(version);
        self
    }

    /// Check if this entity exists on both sides
    pub fn is_linked(&self) -> bool {
        self.local_id.is_some() && self.remote_id.is_some()
    }

    /// Get a display identifier for logging
    pub fn display_id(&self) -> String {
        match (&self.local_id, &self.remote_id) {
            (Some(local), Some(remote)) => format!("{}:{}", local.as_str(), remote.as_str()),
            (Some(local), None) => format!("local:{}", local.as_str()),
            (None, Some(remote)) => format!("remote:{}", remote.as_str()),
            (None, None) => "unknown".to_string(),
        }
    }
}

/// Represents a detected conflict between local and remote data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conflict {
    pub entity: SyncEntity,
    pub local_data: EntitySnapshot,
    pub remote_data: EntitySnapshot,
    pub detected_at: DateTime<Utc>,
    pub conflicting_fields: Vec<String>,
    pub resolution: Option<ConflictResolution>,
}

impl Conflict {
    pub fn new(
        entity: SyncEntity,
        local_data: EntitySnapshot,
        remote_data: EntitySnapshot,
        conflicting_fields: Vec<String>,
    ) -> Self {
        Self {
            entity,
            local_data,
            remote_data,
            detected_at: Utc::now(),
            conflicting_fields,
            resolution: None,
        }
    }

    pub fn is_resolved(&self) -> bool {
        self.resolution.is_some()
    }

    pub fn resolve(&mut self, resolution: ConflictResolution) {
        self.resolution = Some(resolution);
    }
}

/// Resolution of a conflict
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictResolution {
    pub winner: ConflictWinner,
    pub resolved_at: DateTime<Utc>,
    pub resolved_by: Option<String>,
    pub field_selections: HashMap<String, ConflictWinner>,
    pub merged_data: Option<EntitySnapshot>,
}

impl ConflictResolution {
    pub fn local_wins() -> Self {
        Self {
            winner: ConflictWinner::Local,
            resolved_at: Utc::now(),
            resolved_by: None,
            field_selections: HashMap::new(),
            merged_data: None,
        }
    }

    pub fn remote_wins() -> Self {
        Self {
            winner: ConflictWinner::Remote,
            resolved_at: Utc::now(),
            resolved_by: None,
            field_selections: HashMap::new(),
            merged_data: None,
        }
    }

    pub fn with_resolver(mut self, resolver: impl Into<String>) -> Self {
        self.resolved_by = Some(resolver.into());
        self
    }

    pub fn with_field_selection(mut self, field: impl Into<String>, winner: ConflictWinner) -> Self {
        self.field_selections.insert(field.into(), winner);
        self
    }
}

/// Record of a successfully synced entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncedEntity {
    pub entity: SyncEntity,
    pub synced_at: DateTime<Utc>,
    pub direction: SyncDirection,
}

impl SyncedEntity {
    pub fn pushed(entity: SyncEntity) -> Self {
        Self {
            entity,
            synced_at: Utc::now(),
            direction: SyncDirection::Push,
        }
    }

    pub fn pulled(entity: SyncEntity) -> Self {
        Self {
            entity,
            synced_at: Utc::now(),
            direction: SyncDirection::Pull,
        }
    }
}

/// Report of a completed sync operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncReport {
    pub id: SyncId,
    pub entity_type: EntityType,
    pub direction: SyncDirection,
    pub mode: SyncMode,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub pushed: Vec<SyncedEntity>,
    pub pulled: Vec<SyncedEntity>,
    pub conflicts_detected: usize,
    pub conflicts_resolved: usize,
    pub errors: Vec<SyncError>,
    pub status: SyncStatus,
}

impl SyncReport {
    pub fn new(entity_type: EntityType, direction: SyncDirection, mode: SyncMode) -> Self {
        Self {
            id: SyncId::new(),
            entity_type,
            direction,
            mode,
            started_at: Utc::now(),
            completed_at: None,
            pushed: Vec::new(),
            pulled: Vec::new(),
            conflicts_detected: 0,
            conflicts_resolved: 0,
            errors: Vec::new(),
            status: SyncStatus::InProgress,
        }
    }

    pub fn add_pushed(&mut self, entity: SyncEntity) {
        self.pushed.push(SyncedEntity::pushed(entity));
    }

    pub fn add_pulled(&mut self, entity: SyncEntity) {
        self.pulled.push(SyncedEntity::pulled(entity));
    }

    pub fn add_error(&mut self, error: SyncError) {
        self.errors.push(error);
    }

    pub fn complete(&mut self) {
        self.completed_at = Some(Utc::now());
        let total = self.pushed.len() + self.pulled.len() + self.errors.len();
        self.status = SyncStatus::from_error_count(total, self.errors.len());
    }

    pub fn total_synced(&self) -> usize {
        self.pushed.len() + self.pulled.len()
    }

    pub fn has_errors(&self) -> bool {
        !self.errors.is_empty()
    }

    pub fn is_success(&self) -> bool {
        matches!(self.status, SyncStatus::Completed | SyncStatus::CompletedWithErrors)
    }
}

/// A set of changes to be synced
#[derive(Debug, Clone, Default)]
pub struct ChangeSet {
    pub local_changes: Vec<SyncEntity>,
    pub remote_changes: Vec<SyncEntity>,
    pub conflicts: Vec<Conflict>,
}

impl ChangeSet {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn is_empty(&self) -> bool {
        self.local_changes.is_empty() && self.remote_changes.is_empty() && self.conflicts.is_empty()
    }

    pub fn total_changes(&self) -> usize {
        self.local_changes.len() + self.remote_changes.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sync_entity_employee_builder() {
        let entity = SyncEntity::employee("local-1", "qb-123");
        assert_eq!(entity.entity_type, EntityType::Employee);
        assert!(entity.is_linked());
    }

    #[test]
    fn sync_entity_local_only() {
        let entity = SyncEntity::local_only(EntityType::Employee, "local-1");
        assert!(!entity.is_linked());
        assert!(entity.remote_id.is_none());
    }

    #[test]
    fn conflict_resolution_field_selection() {
        let resolution = ConflictResolution::local_wins()
            .with_field_selection("email", ConflictWinner::Remote)
            .with_field_selection("name", ConflictWinner::Local);

        assert_eq!(resolution.winner, ConflictWinner::Local);
        assert_eq!(
            resolution.field_selections.get("email"),
            Some(&ConflictWinner::Remote)
        );
    }

    #[test]
    fn sync_report_lifecycle() {
        let mut report = SyncReport::new(
            EntityType::Employee,
            SyncDirection::Bidirectional,
            SyncMode::Incremental,
        );

        assert_eq!(report.status, SyncStatus::InProgress);

        report.add_pushed(SyncEntity::employee("1", "qb-1"));
        report.add_pulled(SyncEntity::employee("2", "qb-2"));
        report.add_error(SyncError::EntityNotFound {
            entity_type: EntityType::Employee,
            id: "3".to_string(),
        });

        report.complete();

        assert_eq!(report.total_synced(), 2);
        assert!(report.has_errors());
        assert_eq!(report.status, SyncStatus::CompletedWithErrors);
    }

    #[test]
    fn change_set_empty_by_default() {
        let set = ChangeSet::new();
        assert!(set.is_empty());
        assert_eq!(set.total_changes(), 0);
    }
}
```

**Step 2: Run tests**

Run: `cd graphql-rust-server && cargo test domain::sync::entities`
Expected: All 5 tests pass

**Step 3: Commit**

```bash
git add graphql-rust-server/src/domain/sync/entities.rs
git commit -m "feat(sync): add domain entities - SyncEntity, Conflict, SyncReport"
```

---

### Task 1.5: Create ConflictResolver Domain Service

**Files:**

- Create: `graphql-rust-server/src/domain/sync/services/mod.rs`
- Create: `graphql-rust-server/src/domain/sync/services/conflict_resolver.rs`

**Step 1: Create services module**

```rust
// graphql-rust-server/src/domain/sync/services/mod.rs
pub mod conflict_resolver;
pub mod change_detector;

pub use conflict_resolver::ConflictResolver;
pub use change_detector::ChangeDetector;
```

**Step 2: Write ConflictResolver with tests**

```rust
// graphql-rust-server/src/domain/sync/services/conflict_resolver.rs
use chrono::Utc;

use crate::domain::sync::{
    Conflict, ConflictResolution, ConflictStrategy, ConflictWinner, EntitySnapshot,
};

/// Pure domain service for resolving sync conflicts
/// No I/O - operates only on domain types
pub struct ConflictResolver;

impl ConflictResolver {
    /// Resolve a single conflict using the specified strategy
    pub fn resolve(conflict: &Conflict, strategy: ConflictStrategy) -> ConflictResolution {
        match strategy {
            ConflictStrategy::LocalWins => ConflictResolution::local_wins(),
            ConflictStrategy::RemoteWins => ConflictResolution::remote_wins(),
            ConflictStrategy::LastWriteWins => Self::resolve_last_write_wins(conflict),
            ConflictStrategy::Manual => ConflictResolution {
                winner: ConflictWinner::Pending,
                resolved_at: Utc::now(),
                resolved_by: None,
                field_selections: Default::default(),
                merged_data: None,
            },
        }
    }

    /// Resolve multiple conflicts using the same strategy
    pub fn resolve_all(
        conflicts: &[Conflict],
        strategy: ConflictStrategy,
    ) -> Vec<(Conflict, ConflictResolution)> {
        conflicts
            .iter()
            .map(|c| (c.clone(), Self::resolve(c, strategy)))
            .collect()
    }

    /// Resolve by comparing last modified timestamps
    fn resolve_last_write_wins(conflict: &Conflict) -> ConflictResolution {
        let local_time = conflict.local_data.captured_at;
        let remote_time = conflict.remote_data.captured_at;

        if local_time >= remote_time {
            ConflictResolution::local_wins()
        } else {
            ConflictResolution::remote_wins()
        }
    }

    /// Create a field-level merged resolution
    pub fn merge_fields(
        conflict: &Conflict,
        field_selections: impl IntoIterator<Item = (String, ConflictWinner)>,
    ) -> ConflictResolution {
        let selections: std::collections::HashMap<String, ConflictWinner> =
            field_selections.into_iter().collect();

        // Build merged data from selections
        let mut merged_fields = std::collections::HashMap::new();

        for field in &conflict.conflicting_fields {
            let winner = selections.get(field).unwrap_or(&ConflictWinner::Local);
            let value = match winner {
                ConflictWinner::Local | ConflictWinner::Pending => {
                    conflict.local_data.get_field(field).cloned()
                }
                ConflictWinner::Remote | ConflictWinner::Merged => {
                    conflict.remote_data.get_field(field).cloned()
                }
            };
            if let Some(v) = value {
                merged_fields.insert(field.clone(), v);
            }
        }

        ConflictResolution {
            winner: ConflictWinner::Merged,
            resolved_at: Utc::now(),
            resolved_by: None,
            field_selections: selections,
            merged_data: Some(EntitySnapshot::new(merged_fields)),
        }
    }

    /// Check if a conflict can be auto-resolved (non-overlapping changes)
    pub fn can_auto_merge(conflict: &Conflict) -> bool {
        // If no overlapping field changes, we can auto-merge
        conflict.conflicting_fields.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::sync::{EntityType, SyncEntity};
    use std::collections::HashMap;

    fn make_conflict(local_time: i64, remote_time: i64) -> Conflict {
        use chrono::TimeZone;

        let local_data = EntitySnapshot {
            fields: HashMap::from([
                ("name".to_string(), serde_json::json!("Jon")),
                ("email".to_string(), serde_json::json!("jon@local.com")),
            ]),
            captured_at: Utc.timestamp_opt(local_time, 0).unwrap(),
        };

        let remote_data = EntitySnapshot {
            fields: HashMap::from([
                ("name".to_string(), serde_json::json!("John")),
                ("email".to_string(), serde_json::json!("john@remote.com")),
            ]),
            captured_at: Utc.timestamp_opt(remote_time, 0).unwrap(),
        };

        Conflict::new(
            SyncEntity::employee("emp-1", "qb-123"),
            local_data,
            remote_data,
            vec!["name".to_string(), "email".to_string()],
        )
    }

    #[test]
    fn local_wins_strategy() {
        let conflict = make_conflict(1000, 2000);
        let resolution = ConflictResolver::resolve(&conflict, ConflictStrategy::LocalWins);
        assert_eq!(resolution.winner, ConflictWinner::Local);
    }

    #[test]
    fn remote_wins_strategy() {
        let conflict = make_conflict(1000, 2000);
        let resolution = ConflictResolver::resolve(&conflict, ConflictStrategy::RemoteWins);
        assert_eq!(resolution.winner, ConflictWinner::Remote);
    }

    #[test]
    fn last_write_wins_picks_newer_local() {
        let conflict = make_conflict(2000, 1000); // Local is newer
        let resolution = ConflictResolver::resolve(&conflict, ConflictStrategy::LastWriteWins);
        assert_eq!(resolution.winner, ConflictWinner::Local);
    }

    #[test]
    fn last_write_wins_picks_newer_remote() {
        let conflict = make_conflict(1000, 2000); // Remote is newer
        let resolution = ConflictResolver::resolve(&conflict, ConflictStrategy::LastWriteWins);
        assert_eq!(resolution.winner, ConflictWinner::Remote);
    }

    #[test]
    fn manual_strategy_leaves_pending() {
        let conflict = make_conflict(1000, 2000);
        let resolution = ConflictResolver::resolve(&conflict, ConflictStrategy::Manual);
        assert_eq!(resolution.winner, ConflictWinner::Pending);
    }

    #[test]
    fn resolve_all_applies_to_multiple() {
        let conflicts = vec![make_conflict(1000, 2000), make_conflict(3000, 1000)];

        let resolved = ConflictResolver::resolve_all(&conflicts, ConflictStrategy::LocalWins);

        assert_eq!(resolved.len(), 2);
        assert!(resolved.iter().all(|(_, r)| r.winner == ConflictWinner::Local));
    }

    #[test]
    fn merge_fields_creates_merged_data() {
        let conflict = make_conflict(1000, 2000);

        let resolution = ConflictResolver::merge_fields(
            &conflict,
            vec![
                ("name".to_string(), ConflictWinner::Local),
                ("email".to_string(), ConflictWinner::Remote),
            ],
        );

        assert_eq!(resolution.winner, ConflictWinner::Merged);
        assert!(resolution.merged_data.is_some());

        let merged = resolution.merged_data.unwrap();
        assert_eq!(merged.get_string("name"), Some("Jon"));
        assert_eq!(merged.get_string("email"), Some("john@remote.com"));
    }

    #[test]
    fn can_auto_merge_empty_conflicts() {
        let mut conflict = make_conflict(1000, 2000);
        conflict.conflicting_fields = vec![]; // No overlapping changes

        assert!(ConflictResolver::can_auto_merge(&conflict));
    }

    #[test]
    fn cannot_auto_merge_with_conflicts() {
        let conflict = make_conflict(1000, 2000);
        assert!(!ConflictResolver::can_auto_merge(&conflict));
    }
}
```

**Step 3: Run tests**

Run: `cd graphql-rust-server && cargo test domain::sync::services::conflict_resolver`
Expected: All 9 tests pass

**Step 4: Commit**

```bash
git add graphql-rust-server/src/domain/sync/services/
git commit -m "feat(sync): add ConflictResolver domain service with field-level merging"
```

---

### Task 1.6: Create ChangeDetector Domain Service

**Files:**

- Create: `graphql-rust-server/src/domain/sync/services/change_detector.rs`

**Step 1: Write ChangeDetector with tests**

```rust
// graphql-rust-server/src/domain/sync/services/change_detector.rs
use std::collections::{HashMap, HashSet};

use crate::domain::sync::{
    ChangeSet, ChangeType, Conflict, EntityId, EntitySnapshot, EntityType, QuickBooksId,
    SyncEntity,
};

/// Pure domain service for detecting changes and conflicts
/// No I/O - operates only on domain types
pub struct ChangeDetector;

impl ChangeDetector {
    /// Partition local and remote changes into pushable, pullable, and conflicts
    ///
    /// Returns: (conflicts, local_only_changes, remote_only_changes)
    pub fn partition_changes(
        local_changes: Vec<SyncEntity>,
        remote_changes: Vec<SyncEntity>,
    ) -> (Vec<SyncEntity>, Vec<SyncEntity>, Vec<SyncEntity>) {
        let mut local_only = Vec::new();
        let mut remote_only = Vec::new();
        let mut conflicts = Vec::new();

        // Index remote changes by their IDs
        let remote_by_local_id: HashMap<&EntityId, &SyncEntity> = remote_changes
            .iter()
            .filter_map(|e| e.local_id.as_ref().map(|id| (id, e)))
            .collect();

        let remote_by_qb_id: HashMap<&QuickBooksId, &SyncEntity> = remote_changes
            .iter()
            .filter_map(|e| e.remote_id.as_ref().map(|id| (id, e)))
            .collect();

        let mut matched_remote_ids: HashSet<String> = HashSet::new();

        // Process local changes
        for local in local_changes {
            let has_remote_match = local
                .local_id
                .as_ref()
                .map(|id| remote_by_local_id.contains_key(id))
                .unwrap_or(false)
                || local
                    .remote_id
                    .as_ref()
                    .map(|id| remote_by_qb_id.contains_key(id))
                    .unwrap_or(false);

            if has_remote_match {
                // Both sides changed - conflict
                conflicts.push(local.clone());

                // Track that we've matched this remote
                if let Some(id) = &local.local_id {
                    matched_remote_ids.insert(id.as_str().to_string());
                }
                if let Some(id) = &local.remote_id {
                    matched_remote_ids.insert(id.as_str().to_string());
                }
            } else {
                // Only local changed - can push
                local_only.push(local);
            }
        }

        // Find remote-only changes (not in conflicts)
        for remote in remote_changes {
            let is_matched = remote
                .local_id
                .as_ref()
                .map(|id| matched_remote_ids.contains(id.as_str()))
                .unwrap_or(false)
                || remote
                    .remote_id
                    .as_ref()
                    .map(|id| matched_remote_ids.contains(id.as_str()))
                    .unwrap_or(false);

            if !is_matched {
                remote_only.push(remote);
            }
        }

        (conflicts, local_only, remote_only)
    }

    /// Detect which fields differ between two snapshots
    pub fn detect_conflicting_fields(
        local: &EntitySnapshot,
        remote: &EntitySnapshot,
    ) -> Vec<String> {
        let mut conflicting = Vec::new();

        // Check all local fields
        for (key, local_value) in &local.fields {
            if let Some(remote_value) = remote.fields.get(key) {
                if local_value != remote_value {
                    conflicting.push(key.clone());
                }
            }
        }

        conflicting.sort();
        conflicting
    }

    /// Build a ChangeSet from local and remote changes
    pub fn build_change_set(
        local_changes: Vec<SyncEntity>,
        remote_changes: Vec<SyncEntity>,
        local_snapshots: HashMap<String, EntitySnapshot>,
        remote_snapshots: HashMap<String, EntitySnapshot>,
    ) -> ChangeSet {
        let (conflict_entities, local_only, remote_only) =
            Self::partition_changes(local_changes, remote_changes);

        // Build full Conflict objects with snapshots
        let conflicts: Vec<Conflict> = conflict_entities
            .into_iter()
            .filter_map(|entity| {
                let local_id = entity.local_id.as_ref()?.as_str();
                let remote_id = entity.remote_id.as_ref()?.as_str();

                let local_snapshot = local_snapshots.get(local_id)?;
                let remote_snapshot = remote_snapshots.get(remote_id)?;

                let conflicting_fields =
                    Self::detect_conflicting_fields(local_snapshot, remote_snapshot);

                Some(Conflict::new(
                    entity,
                    local_snapshot.clone(),
                    remote_snapshot.clone(),
                    conflicting_fields,
                ))
            })
            .collect();

        ChangeSet {
            local_changes: local_only,
            remote_changes: remote_only,
            conflicts,
        }
    }

    /// Check if an entity needs syncing based on timestamps
    pub fn needs_sync(
        local_modified: Option<chrono::DateTime<chrono::Utc>>,
        remote_modified: Option<chrono::DateTime<chrono::Utc>>,
        last_synced: Option<chrono::DateTime<chrono::Utc>>,
    ) -> (bool, bool) {
        let local_changed = match (local_modified, last_synced) {
            (Some(modified), Some(synced)) => modified > synced,
            (Some(_), None) => true, // Never synced
            _ => false,
        };

        let remote_changed = match (remote_modified, last_synced) {
            (Some(modified), Some(synced)) => modified > synced,
            (Some(_), None) => true, // Never synced
            _ => false,
        };

        (local_changed, remote_changed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Utc};

    fn entity(local: &str, remote: &str, change: ChangeType) -> SyncEntity {
        SyncEntity::employee(local, remote).with_change_type(change)
    }

    fn local_only_entity(local: &str) -> SyncEntity {
        SyncEntity::local_only(EntityType::Employee, local)
    }

    fn remote_only_entity(remote: &str) -> SyncEntity {
        SyncEntity::remote_only(EntityType::Employee, remote)
    }

    #[test]
    fn partition_no_overlap() {
        let local = vec![local_only_entity("local-1")];
        let remote = vec![remote_only_entity("remote-1")];

        let (conflicts, local_only, remote_only) =
            ChangeDetector::partition_changes(local, remote);

        assert!(conflicts.is_empty());
        assert_eq!(local_only.len(), 1);
        assert_eq!(remote_only.len(), 1);
    }

    #[test]
    fn partition_with_conflict() {
        let local = vec![entity("emp-1", "qb-1", ChangeType::Updated)];
        let remote = vec![entity("emp-1", "qb-1", ChangeType::Updated)];

        let (conflicts, local_only, remote_only) =
            ChangeDetector::partition_changes(local, remote);

        assert_eq!(conflicts.len(), 1);
        assert!(local_only.is_empty());
        assert!(remote_only.is_empty());
    }

    #[test]
    fn partition_mixed() {
        let local = vec![
            entity("emp-1", "qb-1", ChangeType::Updated), // Conflict
            local_only_entity("emp-2"),                   // Local only
        ];
        let remote = vec![
            entity("emp-1", "qb-1", ChangeType::Updated), // Conflict
            remote_only_entity("qb-3"),                   // Remote only
        ];

        let (conflicts, local_only, remote_only) =
            ChangeDetector::partition_changes(local, remote);

        assert_eq!(conflicts.len(), 1);
        assert_eq!(local_only.len(), 1);
        assert_eq!(remote_only.len(), 1);
    }

    #[test]
    fn detect_conflicting_fields_finds_differences() {
        let local = EntitySnapshot::new(HashMap::from([
            ("name".to_string(), serde_json::json!("Jon")),
            ("email".to_string(), serde_json::json!("same@test.com")),
            ("title".to_string(), serde_json::json!("Dev")),
        ]));

        let remote = EntitySnapshot::new(HashMap::from([
            ("name".to_string(), serde_json::json!("John")),
            ("email".to_string(), serde_json::json!("same@test.com")),
            ("title".to_string(), serde_json::json!("Engineer")),
        ]));

        let conflicts = ChangeDetector::detect_conflicting_fields(&local, &remote);

        assert_eq!(conflicts.len(), 2);
        assert!(conflicts.contains(&"name".to_string()));
        assert!(conflicts.contains(&"title".to_string()));
        assert!(!conflicts.contains(&"email".to_string()));
    }

    #[test]
    fn needs_sync_local_changed() {
        let last_synced = Utc.timestamp_opt(1000, 0).unwrap();
        let local_modified = Utc.timestamp_opt(2000, 0).unwrap();

        let (local, remote) =
            ChangeDetector::needs_sync(Some(local_modified), None, Some(last_synced));

        assert!(local);
        assert!(!remote);
    }

    #[test]
    fn needs_sync_both_changed() {
        let last_synced = Utc.timestamp_opt(1000, 0).unwrap();
        let local_modified = Utc.timestamp_opt(2000, 0).unwrap();
        let remote_modified = Utc.timestamp_opt(1500, 0).unwrap();

        let (local, remote) = ChangeDetector::needs_sync(
            Some(local_modified),
            Some(remote_modified),
            Some(last_synced),
        );

        assert!(local);
        assert!(remote);
    }

    #[test]
    fn needs_sync_never_synced() {
        let local_modified = Utc.timestamp_opt(1000, 0).unwrap();

        let (local, remote) = ChangeDetector::needs_sync(Some(local_modified), None, None);

        assert!(local); // Has local data, never synced
        assert!(!remote);
    }
}
```

**Step 2: Run tests**

Run: `cd graphql-rust-server && cargo test domain::sync::services::change_detector`
Expected: All 6 tests pass

**Step 3: Run all domain tests**

Run: `cd graphql-rust-server && cargo test domain::sync`
Expected: All ~25 tests pass

**Step 4: Commit**

```bash
git add graphql-rust-server/src/domain/sync/services/change_detector.rs
git commit -m "feat(sync): add ChangeDetector domain service for conflict detection"
```

---

### Task 1.7: Domain Layer Integration Test

**Files:**

- Modify: `graphql-rust-server/src/domain/sync/mod.rs` (ensure exports)

**Step 1: Verify all exports work together**

Update `graphql-rust-server/src/domain/sync/mod.rs`:

```rust
// graphql-rust-server/src/domain/sync/mod.rs
pub mod entities;
pub mod errors;
pub mod services;
pub mod value_objects;

// Re-export commonly used types
pub use entities::{
    ChangeSet, Conflict, ConflictResolution, EntitySnapshot, SyncEntity, SyncId, SyncReport,
    SyncedEntity,
};
pub use errors::{SyncError, Violation};
pub use services::{ChangeDetector, ConflictResolver};
pub use value_objects::{
    ChangeType, ConflictStrategy, ConflictWinner, EntityId, EntityType, EntityVersion,
    QuickBooksId, SyncDirection, SyncMode, SyncStatus,
};
```

**Step 2: Run full test suite**

Run: `cd graphql-rust-server && cargo test`
Expected: All tests pass, including new domain tests

**Step 3: Run clippy**

Run: `cd graphql-rust-server && cargo clippy -- -D warnings`
Expected: No warnings or errors

**Step 4: Commit**

```bash
git add graphql-rust-server/src/domain/sync/mod.rs
git commit -m "feat(sync): complete Phase 1 - domain layer with full test coverage"
```

---

## Phase 2: Ports & Adapters (Rust)

### Task 2.1: Create Port Traits

**Files:**

- Create: `graphql-rust-server/src/ports/mod.rs`
- Create: `graphql-rust-server/src/ports/quickbooks.rs`
- Create: `graphql-rust-server/src/ports/sync_repository.rs`
- Create: `graphql-rust-server/src/ports/health.rs`
- Modify: `graphql-rust-server/src/lib.rs` (add ports module)

**Step 1: Create ports directory**

```bash
mkdir -p graphql-rust-server/src/ports
```

**Step 2: Create ports/mod.rs**

```rust
// graphql-rust-server/src/ports/mod.rs
pub mod health;
pub mod quickbooks;
pub mod sync_repository;

pub use health::HealthPort;
pub use quickbooks::QuickBooksPort;
pub use sync_repository::SyncRepositoryPort;
```

**Step 3: Create QuickBooksPort trait**

```rust
// graphql-rust-server/src/ports/quickbooks.rs
use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::domain::sync::{EntityType, QuickBooksId, SyncError};

/// Data for creating/updating an employee in QuickBooks
#[derive(Debug, Clone)]
pub struct EmployeeData {
    pub given_name: String,
    pub family_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub department_id: Option<String>,
    pub sync_token: Option<String>,
}

/// Data for creating/updating a department in QuickBooks
#[derive(Debug, Clone)]
pub struct DepartmentData {
    pub name: String,
    pub parent_id: Option<String>,
    pub sync_token: Option<String>,
}

/// Employee data returned from QuickBooks
#[derive(Debug, Clone)]
pub struct RemoteEmployee {
    pub id: QuickBooksId,
    pub given_name: String,
    pub family_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub department_id: Option<String>,
    pub sync_token: String,
    pub last_modified: DateTime<Utc>,
    pub active: bool,
}

/// Department data returned from QuickBooks
#[derive(Debug, Clone)]
pub struct RemoteDepartment {
    pub id: QuickBooksId,
    pub name: String,
    pub parent_id: Option<String>,
    pub sync_token: String,
    pub last_modified: DateTime<Utc>,
    pub active: bool,
}

/// Port for QuickBooks API operations
/// Adapters implement this trait to provide actual API access
#[async_trait]
pub trait QuickBooksPort: Send + Sync {
    /// List employees, optionally filtered by last modified time
    async fn list_employees(
        &self,
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<RemoteEmployee>, SyncError>;

    /// Get a single employee by QuickBooks ID
    async fn get_employee(&self, id: &QuickBooksId) -> Result<RemoteEmployee, SyncError>;

    /// Create a new employee in QuickBooks
    async fn create_employee(&self, data: EmployeeData) -> Result<RemoteEmployee, SyncError>;

    /// Update an existing employee in QuickBooks
    async fn update_employee(
        &self,
        id: &QuickBooksId,
        data: EmployeeData,
    ) -> Result<RemoteEmployee, SyncError>;

    /// List departments, optionally filtered by last modified time
    async fn list_departments(
        &self,
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<RemoteDepartment>, SyncError>;

    /// Get a single department by QuickBooks ID
    async fn get_department(&self, id: &QuickBooksId) -> Result<RemoteDepartment, SyncError>;

    /// Create or update a department in QuickBooks (best effort)
    async fn upsert_department(&self, data: DepartmentData) -> Result<RemoteDepartment, SyncError>;
}

/// Mock implementation for testing
#[cfg(test)]
pub mod mock {
    use super::*;
    use std::sync::{Arc, Mutex};

    #[derive(Default)]
    pub struct MockQuickBooksPort {
        pub employees: Arc<Mutex<Vec<RemoteEmployee>>>,
        pub departments: Arc<Mutex<Vec<RemoteDepartment>>>,
        pub should_fail: Arc<Mutex<bool>>,
    }

    impl MockQuickBooksPort {
        pub fn new() -> Self {
            Self::default()
        }

        pub fn with_employees(employees: Vec<RemoteEmployee>) -> Self {
            Self {
                employees: Arc::new(Mutex::new(employees)),
                ..Default::default()
            }
        }

        pub fn set_should_fail(&self, fail: bool) {
            *self.should_fail.lock().unwrap() = fail;
        }
    }

    #[async_trait]
    impl QuickBooksPort for MockQuickBooksPort {
        async fn list_employees(
            &self,
            since: Option<DateTime<Utc>>,
        ) -> Result<Vec<RemoteEmployee>, SyncError> {
            if *self.should_fail.lock().unwrap() {
                return Err(SyncError::quickbooks_api("500", "Mock error", true));
            }

            let employees = self.employees.lock().unwrap();
            let filtered: Vec<RemoteEmployee> = match since {
                Some(ts) => employees
                    .iter()
                    .filter(|e| e.last_modified > ts)
                    .cloned()
                    .collect(),
                None => employees.clone(),
            };
            Ok(filtered)
        }

        async fn get_employee(&self, id: &QuickBooksId) -> Result<RemoteEmployee, SyncError> {
            let employees = self.employees.lock().unwrap();
            employees
                .iter()
                .find(|e| e.id == *id)
                .cloned()
                .ok_or_else(|| SyncError::EntityNotFound {
                    entity_type: EntityType::Employee,
                    id: id.as_str().to_string(),
                })
        }

        async fn create_employee(&self, data: EmployeeData) -> Result<RemoteEmployee, SyncError> {
            let employee = RemoteEmployee {
                id: QuickBooksId::new(format!("qb-{}", uuid::Uuid::new_v4())),
                given_name: data.given_name,
                family_name: data.family_name,
                email: data.email,
                phone: data.phone,
                department_id: data.department_id,
                sync_token: "1".to_string(),
                last_modified: Utc::now(),
                active: true,
            };
            self.employees.lock().unwrap().push(employee.clone());
            Ok(employee)
        }

        async fn update_employee(
            &self,
            id: &QuickBooksId,
            data: EmployeeData,
        ) -> Result<RemoteEmployee, SyncError> {
            let mut employees = self.employees.lock().unwrap();
            let emp = employees
                .iter_mut()
                .find(|e| e.id == *id)
                .ok_or_else(|| SyncError::EntityNotFound {
                    entity_type: EntityType::Employee,
                    id: id.as_str().to_string(),
                })?;

            emp.given_name = data.given_name;
            emp.family_name = data.family_name;
            emp.email = data.email;
            emp.phone = data.phone;
            emp.last_modified = Utc::now();

            Ok(emp.clone())
        }

        async fn list_departments(
            &self,
            _since: Option<DateTime<Utc>>,
        ) -> Result<Vec<RemoteDepartment>, SyncError> {
            Ok(self.departments.lock().unwrap().clone())
        }

        async fn get_department(&self, id: &QuickBooksId) -> Result<RemoteDepartment, SyncError> {
            self.departments
                .lock()
                .unwrap()
                .iter()
                .find(|d| d.id == *id)
                .cloned()
                .ok_or_else(|| SyncError::EntityNotFound {
                    entity_type: EntityType::Department,
                    id: id.as_str().to_string(),
                })
        }

        async fn upsert_department(
            &self,
            data: DepartmentData,
        ) -> Result<RemoteDepartment, SyncError> {
            let dept = RemoteDepartment {
                id: QuickBooksId::new(format!("qb-dept-{}", uuid::Uuid::new_v4())),
                name: data.name,
                parent_id: data.parent_id,
                sync_token: "1".to_string(),
                last_modified: Utc::now(),
                active: true,
            };
            self.departments.lock().unwrap().push(dept.clone());
            Ok(dept)
        }
    }
}
```

**Step 4: Create SyncRepositoryPort trait**

```rust
// graphql-rust-server/src/ports/sync_repository.rs
use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::domain::sync::{Conflict, EntityType, SyncEntity, SyncError, SyncReport};

/// Port for sync state persistence operations
#[async_trait]
pub trait SyncRepositoryPort: Send + Sync {
    /// Get local entities that changed since the given timestamp
    async fn get_local_changes(
        &self,
        entity_type: EntityType,
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<SyncEntity>, SyncError>;

    /// Get the last sync timestamp for an entity type
    async fn get_last_sync_time(
        &self,
        entity_type: EntityType,
    ) -> Result<Option<DateTime<Utc>>, SyncError>;

    /// Mark entities as synced (batch operation)
    async fn mark_synced(&self, entities: &[SyncEntity]) -> Result<(), SyncError>;

    /// Save detected conflicts
    async fn save_conflicts(&self, conflicts: &[Conflict]) -> Result<(), SyncError>;

    /// Get pending (unresolved) conflicts
    async fn get_pending_conflicts(&self) -> Result<Vec<Conflict>, SyncError>;

    /// Resolve a conflict
    async fn resolve_conflict(&self, conflict_id: &str) -> Result<(), SyncError>;

    /// Save a sync operation log
    async fn save_sync_log(&self, report: &SyncReport) -> Result<(), SyncError>;

    /// Get recent sync logs
    async fn get_recent_sync_logs(&self, limit: usize) -> Result<Vec<SyncReport>, SyncError>;
}
```

**Step 5: Create HealthPort trait**

```rust
// graphql-rust-server/src/ports/health.rs
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::sync::{SyncError, SyncReport};

/// Health status of the sync system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: HealthLevel,
    pub last_sync: Option<DateTime<Utc>>,
    pub last_sync_success: bool,
    pub sync_count_24h: usize,
    pub error_count_24h: usize,
    pub pending_conflicts: usize,
    pub uptime_percentage: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HealthLevel {
    Healthy,
    Warning,
    Critical,
}

impl HealthStatus {
    pub fn healthy() -> Self {
        Self {
            status: HealthLevel::Healthy,
            last_sync: None,
            last_sync_success: true,
            sync_count_24h: 0,
            error_count_24h: 0,
            pending_conflicts: 0,
            uptime_percentage: 100.0,
        }
    }
}

/// Port for health monitoring operations
#[async_trait]
pub trait HealthPort: Send + Sync {
    /// Record that a sync completed
    async fn record_sync_completed(&self, report: &SyncReport) -> Result<(), SyncError>;

    /// Get current health status
    async fn get_health_status(&self) -> Result<HealthStatus, SyncError>;
}
```

**Step 6: Add ports module to lib.rs**

In `graphql-rust-server/src/lib.rs`, add:

```rust
pub mod ports;
```

**Step 7: Add async-trait to Cargo.toml if not present**

Check `graphql-rust-server/Cargo.toml` for `async-trait`. If not present, add:

```toml
async-trait = "0.1"
```

**Step 8: Verify compilation**

Run: `cd graphql-rust-server && cargo check`
Expected: Compilation succeeds

**Step 9: Commit**

```bash
git add graphql-rust-server/src/ports graphql-rust-server/src/lib.rs
git commit -m "feat(sync): add port traits for QuickBooks, Repository, and Health"
```

---

### Task 2.2: Create Application Layer - SyncService

**Files:**

- Create: `graphql-rust-server/src/application/mod.rs`
- Create: `graphql-rust-server/src/application/sync_service.rs`
- Modify: `graphql-rust-server/src/lib.rs` (add application module)

**Step 1: Create application directory**

```bash
mkdir -p graphql-rust-server/src/application
```

**Step 2: Create application/mod.rs**

```rust
// graphql-rust-server/src/application/mod.rs
pub mod sync_service;

pub use sync_service::SyncService;
```

**Step 3: Create SyncService**

```rust
// graphql-rust-server/src/application/sync_service.rs
use std::sync::Arc;

use crate::domain::sync::{
    ChangeDetector, ChangeSet, ConflictResolver, ConflictStrategy, EntityType, SyncDirection,
    SyncEntity, SyncError, SyncMode, SyncReport, SyncStatus,
};
use crate::ports::{HealthPort, QuickBooksPort, SyncRepositoryPort};

/// Application service that orchestrates sync operations
pub struct SyncService<Q, R, H>
where
    Q: QuickBooksPort,
    R: SyncRepositoryPort,
    H: HealthPort,
{
    quickbooks: Arc<Q>,
    repository: Arc<R>,
    health: Arc<H>,
}

impl<Q, R, H> SyncService<Q, R, H>
where
    Q: QuickBooksPort,
    R: SyncRepositoryPort,
    H: HealthPort,
{
    pub fn new(quickbooks: Arc<Q>, repository: Arc<R>, health: Arc<H>) -> Self {
        Self {
            quickbooks,
            repository,
            health,
        }
    }

    /// Execute a bidirectional sync operation
    pub async fn sync_bidirectional(
        &self,
        entity_type: EntityType,
        mode: SyncMode,
        strategy: ConflictStrategy,
    ) -> SyncReport {
        let mut report = SyncReport::new(entity_type, SyncDirection::Bidirectional, mode);

        // 1. Get last sync time for incremental mode
        let since = match mode {
            SyncMode::Incremental => {
                match self.repository.get_last_sync_time(entity_type).await {
                    Ok(time) => time,
                    Err(e) => {
                        report.add_error(e);
                        None
                    }
                }
            }
            SyncMode::Full => None,
        };

        // 2. Collect local changes
        let local_changes = match self.repository.get_local_changes(entity_type, since).await {
            Ok(changes) => changes,
            Err(e) => {
                report.add_error(e);
                Vec::new()
            }
        };

        // 3. Collect remote changes
        let remote_changes = match self.fetch_remote_changes(entity_type, since).await {
            Ok(changes) => changes,
            Err(e) => {
                report.add_error(e);
                Vec::new()
            }
        };

        // 4. Detect conflicts and partition changes
        let (conflicts, pushable, pullable) =
            ChangeDetector::partition_changes(local_changes, remote_changes);

        report.conflicts_detected = conflicts.len();

        // 5. Resolve conflicts if strategy is not Manual
        if strategy != ConflictStrategy::Manual && !conflicts.is_empty() {
            let resolved = ConflictResolver::resolve_all(&self.build_conflicts(&conflicts), strategy);
            report.conflicts_resolved = resolved.len();

            // Apply resolutions
            for (conflict, resolution) in resolved {
                if let Err(e) = self.apply_resolution(&mut report, conflict, resolution).await {
                    report.add_error(e);
                }
            }
        } else if !conflicts.is_empty() {
            // Save conflicts for manual resolution
            if let Err(e) = self.repository.save_conflicts(&self.build_conflicts(&conflicts)).await {
                report.add_error(e);
            }
        }

        // 6. Push local changes
        for entity in pushable {
            if let Err(e) = self.push_entity(&mut report, entity).await {
                report.add_error(e);
            }
        }

        // 7. Pull remote changes
        for entity in pullable {
            if let Err(e) = self.pull_entity(&mut report, entity).await {
                report.add_error(e);
            }
        }

        // 8. Complete the report
        report.complete();

        // 9. Record health metrics
        let _ = self.health.record_sync_completed(&report).await;

        // 10. Save sync log
        let _ = self.repository.save_sync_log(&report).await;

        report
    }

    /// Execute a push-only sync
    pub async fn sync_push(
        &self,
        entity_type: EntityType,
        mode: SyncMode,
    ) -> SyncReport {
        let mut report = SyncReport::new(entity_type, SyncDirection::Push, mode);

        let since = match mode {
            SyncMode::Incremental => {
                self.repository.get_last_sync_time(entity_type).await.ok().flatten()
            }
            SyncMode::Full => None,
        };

        let local_changes = match self.repository.get_local_changes(entity_type, since).await {
            Ok(changes) => changes,
            Err(e) => {
                report.add_error(e);
                report.complete();
                return report;
            }
        };

        for entity in local_changes {
            if let Err(e) = self.push_entity(&mut report, entity).await {
                report.add_error(e);
            }
        }

        report.complete();
        let _ = self.health.record_sync_completed(&report).await;
        let _ = self.repository.save_sync_log(&report).await;

        report
    }

    /// Execute a pull-only sync
    pub async fn sync_pull(
        &self,
        entity_type: EntityType,
        mode: SyncMode,
    ) -> SyncReport {
        let mut report = SyncReport::new(entity_type, SyncDirection::Pull, mode);

        let since = match mode {
            SyncMode::Incremental => {
                self.repository.get_last_sync_time(entity_type).await.ok().flatten()
            }
            SyncMode::Full => None,
        };

        let remote_changes = match self.fetch_remote_changes(entity_type, since).await {
            Ok(changes) => changes,
            Err(e) => {
                report.add_error(e);
                report.complete();
                return report;
            }
        };

        for entity in remote_changes {
            if let Err(e) = self.pull_entity(&mut report, entity).await {
                report.add_error(e);
            }
        }

        report.complete();
        let _ = self.health.record_sync_completed(&report).await;
        let _ = self.repository.save_sync_log(&report).await;

        report
    }

    // Private helper methods

    async fn fetch_remote_changes(
        &self,
        entity_type: EntityType,
        since: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Result<Vec<SyncEntity>, SyncError> {
        match entity_type {
            EntityType::Employee => {
                let employees = self.quickbooks.list_employees(since).await?;
                Ok(employees
                    .into_iter()
                    .map(|e| {
                        SyncEntity::remote_only(EntityType::Employee, e.id.as_str())
                            .with_remote_version(crate::domain::sync::EntityVersion::new(e.last_modified)
                                .with_sync_token(&e.sync_token))
                    })
                    .collect())
            }
            EntityType::Department => {
                let departments = self.quickbooks.list_departments(since).await?;
                Ok(departments
                    .into_iter()
                    .map(|d| {
                        SyncEntity::remote_only(EntityType::Department, d.id.as_str())
                            .with_remote_version(crate::domain::sync::EntityVersion::new(d.last_modified)
                                .with_sync_token(&d.sync_token))
                    })
                    .collect())
            }
        }
    }

    fn build_conflicts(&self, entities: &[SyncEntity]) -> Vec<crate::domain::sync::Conflict> {
        // Simplified - in real impl, would fetch snapshots
        entities
            .iter()
            .map(|e| {
                crate::domain::sync::Conflict::new(
                    e.clone(),
                    crate::domain::sync::EntitySnapshot::new(Default::default()),
                    crate::domain::sync::EntitySnapshot::new(Default::default()),
                    Vec::new(),
                )
            })
            .collect()
    }

    async fn apply_resolution(
        &self,
        report: &mut SyncReport,
        conflict: crate::domain::sync::Conflict,
        resolution: crate::domain::sync::ConflictResolution,
    ) -> Result<(), SyncError> {
        use crate::domain::sync::ConflictWinner;

        match resolution.winner {
            ConflictWinner::Local => {
                self.push_entity(report, conflict.entity).await?;
            }
            ConflictWinner::Remote => {
                self.pull_entity(report, conflict.entity).await?;
            }
            ConflictWinner::Merged | ConflictWinner::Pending => {
                // Merged requires special handling, Pending is skipped
            }
        }
        Ok(())
    }

    async fn push_entity(
        &self,
        report: &mut SyncReport,
        entity: SyncEntity,
    ) -> Result<(), SyncError> {
        // In real implementation, would fetch local data and push to QB
        // For now, just mark as pushed
        report.add_pushed(entity.clone());
        self.repository.mark_synced(&[entity]).await
    }

    async fn pull_entity(
        &self,
        report: &mut SyncReport,
        entity: SyncEntity,
    ) -> Result<(), SyncError> {
        // In real implementation, would fetch remote data and save locally
        // For now, just mark as pulled
        report.add_pulled(entity.clone());
        self.repository.mark_synced(&[entity]).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ports::health::HealthStatus;
    use std::sync::Mutex;

    // Mock implementations for testing

    struct MockRepo {
        changes: Mutex<Vec<SyncEntity>>,
    }

    impl MockRepo {
        fn new() -> Self {
            Self {
                changes: Mutex::new(Vec::new()),
            }
        }

        fn with_changes(changes: Vec<SyncEntity>) -> Self {
            Self {
                changes: Mutex::new(changes),
            }
        }
    }

    #[async_trait::async_trait]
    impl SyncRepositoryPort for MockRepo {
        async fn get_local_changes(
            &self,
            _entity_type: EntityType,
            _since: Option<chrono::DateTime<chrono::Utc>>,
        ) -> Result<Vec<SyncEntity>, SyncError> {
            Ok(self.changes.lock().unwrap().clone())
        }

        async fn get_last_sync_time(
            &self,
            _entity_type: EntityType,
        ) -> Result<Option<chrono::DateTime<chrono::Utc>>, SyncError> {
            Ok(None)
        }

        async fn mark_synced(&self, _entities: &[SyncEntity]) -> Result<(), SyncError> {
            Ok(())
        }

        async fn save_conflicts(
            &self,
            _conflicts: &[crate::domain::sync::Conflict],
        ) -> Result<(), SyncError> {
            Ok(())
        }

        async fn get_pending_conflicts(
            &self,
        ) -> Result<Vec<crate::domain::sync::Conflict>, SyncError> {
            Ok(Vec::new())
        }

        async fn resolve_conflict(&self, _conflict_id: &str) -> Result<(), SyncError> {
            Ok(())
        }

        async fn save_sync_log(&self, _report: &SyncReport) -> Result<(), SyncError> {
            Ok(())
        }

        async fn get_recent_sync_logs(&self, _limit: usize) -> Result<Vec<SyncReport>, SyncError> {
            Ok(Vec::new())
        }
    }

    struct MockHealth;

    #[async_trait::async_trait]
    impl HealthPort for MockHealth {
        async fn record_sync_completed(&self, _report: &SyncReport) -> Result<(), SyncError> {
            Ok(())
        }

        async fn get_health_status(&self) -> Result<HealthStatus, SyncError> {
            Ok(HealthStatus::healthy())
        }
    }

    #[tokio::test]
    async fn sync_bidirectional_completes_without_changes() {
        use crate::ports::quickbooks::mock::MockQuickBooksPort;

        let qb = Arc::new(MockQuickBooksPort::new());
        let repo = Arc::new(MockRepo::new());
        let health = Arc::new(MockHealth);

        let service = SyncService::new(qb, repo, health);
        let report = service
            .sync_bidirectional(
                EntityType::Employee,
                SyncMode::Full,
                ConflictStrategy::LocalWins,
            )
            .await;

        assert_eq!(report.status, SyncStatus::Completed);
        assert_eq!(report.total_synced(), 0);
        assert!(!report.has_errors());
    }

    #[tokio::test]
    async fn sync_pull_fetches_remote_changes() {
        use crate::ports::quickbooks::mock::MockQuickBooksPort;
        use crate::ports::quickbooks::RemoteEmployee;
        use crate::domain::sync::QuickBooksId;
        use chrono::Utc;

        let employees = vec![RemoteEmployee {
            id: QuickBooksId::new("qb-1"),
            given_name: "John".to_string(),
            family_name: "Doe".to_string(),
            email: Some("john@test.com".to_string()),
            phone: None,
            department_id: None,
            sync_token: "1".to_string(),
            last_modified: Utc::now(),
            active: true,
        }];

        let qb = Arc::new(MockQuickBooksPort::with_employees(employees));
        let repo = Arc::new(MockRepo::new());
        let health = Arc::new(MockHealth);

        let service = SyncService::new(qb, repo, health);
        let report = service.sync_pull(EntityType::Employee, SyncMode::Full).await;

        assert_eq!(report.pulled.len(), 1);
        assert!(report.is_success());
    }
}
```

**Step 4: Add application module to lib.rs**

```rust
pub mod application;
```

**Step 5: Run tests**

Run: `cd graphql-rust-server && cargo test application::sync_service`
Expected: All tests pass

**Step 6: Commit**

```bash
git add graphql-rust-server/src/application graphql-rust-server/src/lib.rs
git commit -m "feat(sync): add SyncService application layer with bidirectional sync"
```

---

## Remaining Tasks (Outline)

Due to document length, the following tasks are outlined. Each follows the same TDD pattern:

### Phase 2 Continued:

**Task 2.3:** Implement QuickBooksAdapter (wraps existing IntuitClient)

- Files: `graphql-rust-server/src/adapters/quickbooks_adapter.rs`
- Translates IntuitClient responses to domain types
- Maps errors to SyncError variants

**Task 2.4:** Implement SeaOrmSyncRepository

- Files: `graphql-rust-server/src/adapters/sync_repository_adapter.rs`
- Batch queries (fix N+1)
- Uses existing SeaORM models

**Task 2.5:** Implement WebhookAdapter

- Files: `graphql-rust-server/src/adapters/webhook_adapter.rs`
- Signature verification
- Triggers SyncService

**Task 2.6:** Fix block_on() anti-pattern in existing code

- Files: Modify `graphql-rust-server/src/services/sync_orchestrator.rs`
- Replace blocking calls with proper async

### Phase 3: GraphQL & API Layer

**Task 3.1:** Update GraphQL schema for new domain types
**Task 3.2:** Create consolidated SvelteKit API endpoints
**Task 3.3:** Update command palette commands

### Phase 4: UI Redesign

**Task 4.1:** Create IntuitDashboard.svelte component
**Task 4.2:** Create SyncStatusCards.svelte component
**Task 4.3:** Create ConflictResolutionPanel.svelte component
**Task 4.4:** Create ActionableErrorDisplay.svelte component
**Task 4.5:** Wire up dashboard page
**Task 4.6:** E2E tests for sync flows
**Task 4.7:** Remove deprecated pages

---

## Verification Checklist

After completing all tasks:

- [ ] `cargo test` passes in graphql-rust-server
- [ ] `cargo clippy` has no warnings
- [ ] `npm run check` passes in frontend
- [ ] `npm run test` passes
- [ ] E2E tests cover sync flows
- [ ] Old fragmented pages removed
- [ ] Design document criteria met
