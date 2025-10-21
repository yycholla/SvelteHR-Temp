//! Time Management Domain
//!
//! Contains time-off policies and attendance tracking models.

pub mod time_off_policy;
pub mod attendance_record;

// Re-exports for convenient access
pub use time_off_policy::{
    CreateTimeOffPolicyInput, TimeOffPolicy, UpdateTimeOffPolicyInput,
};
pub use attendance_record::{
    Model as AttendanceRecord, AttendanceStatus, CreateAttendanceRecordInput, UpdateAttendanceRecordInput,
};
