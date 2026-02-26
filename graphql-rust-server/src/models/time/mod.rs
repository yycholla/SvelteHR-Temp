//! Time Management Domain
//!
//! Contains time-off policies, attendance tracking, and time entry models.

pub mod attendance_record;
pub mod project;
pub mod time_entry;
pub mod time_off_policy;

// Re-exports for convenient access
pub use attendance_record::{
    AttendanceStatus, CreateAttendanceRecordInput, Model as AttendanceRecord,
    UpdateAttendanceRecordInput,
};
pub use project::{CreateProjectInput, Model as Project, UpdateProjectInput};
pub use time_entry::{
    ApproveTimeEntryInput, CreateTimeEntryInput, Model as TimeEntry, TimeEntryStatus,
    TimeEntrySyncState, UpdateTimeEntryInput,
};
pub use time_off_policy::{CreateTimeOffPolicyInput, TimeOffPolicy, UpdateTimeOffPolicyInput};
