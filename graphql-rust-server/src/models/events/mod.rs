//! Event Management Extensions Domain
//!
//! Contains extended event management models: comments, history, and waitlist.
//! These extend the core event model with additional functionality.

pub mod event_comment;
pub mod event_history;
pub mod event_waitlist;

// Re-exports for convenient access
pub use event_comment::{CreateEventCommentInput, Model as EventComment, UpdateEventCommentInput};
pub use event_history::{CreateEventHistoryInput, Model as EventHistory};
pub use event_waitlist::{
    CreateEventWaitlistInput, Model as EventWaitlist, UpdateEventWaitlistInput,
};
