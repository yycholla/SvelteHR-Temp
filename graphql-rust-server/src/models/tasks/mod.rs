//! Task Management Extensions Domain
//!
//! Contains task type categorization model that extends the core task system.

pub mod task_type;

// Re-exports for convenient access
pub use task_type::{CreateTaskTypeInput, Model as TaskType, UpdateTaskTypeInput};
