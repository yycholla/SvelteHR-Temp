//! Performance Review Extensions Domain
//!
//! Contains review template model that extends the performance review system.

pub mod review_template;

// Re-exports for convenient access
pub use review_template::{
    CreateReviewTemplateInput, Model as ReviewTemplate, UpdateReviewTemplateInput,
};
