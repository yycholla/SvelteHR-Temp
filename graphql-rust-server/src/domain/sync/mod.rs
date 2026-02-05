pub mod entities;
pub mod errors;
pub mod services;
pub mod value_objects;

// Re-export commonly used types from entities
pub use entities::{
    ChangeSet, Conflict, ConflictResolution, EntitySnapshot, SyncEntity, SyncId, SyncReport,
    SyncedEntity,
};

// Re-export error types
pub use errors::{SyncError, Violation};

// Re-export domain services
pub use services::{ChangeDetector, ConflictResolver};

// Re-export value objects
pub use value_objects::{
    ChangeType, ConflictStrategy, ConflictWinner, EntityId, EntityType, EntityVersion,
    QuickBooksId, SyncDirection, SyncMode, SyncStatus,
};
