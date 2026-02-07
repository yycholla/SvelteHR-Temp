//! Time Management Domain
//!
//! Contains time-off policies, attendance tracking, and time entry models.

pub mod time_off_policy;
pub mod attendance_record;
pub mod time_entry;
pub mod project;

// Re-exports for convenient access
pub use time_off_policy::{
    CreateTimeOffPolicyInput, TimeOffPolicy, UpdateTimeOffPolicyInput,
};
pub use attendance_record::{
    Model as AttendanceRecord, AttendanceStatus, CreateAttendanceRecordInput, UpdateAttendanceRecordInput,
};
pub use time_entry::{
    Model as TimeEntry, TimeEntryStatus, TimeEntrySyncState, CreateTimeEntryInput,
    UpdateTimeEntryInput, ApproveTimeEntryInput,
};
pub use project::{
    Model as Project, CreateProjectInput, UpdateProjectInput,
};
