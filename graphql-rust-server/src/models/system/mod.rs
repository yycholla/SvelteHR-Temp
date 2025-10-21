//! System Administration Domain
//!
//! Contains system administration models: rollback system, activity logs,
//! HR reports, compensation, payroll, and system settings.

pub mod rollback_request;
pub mod bulk_rollback_batch;
pub mod bulk_rollback_item;
pub mod activity_log;
pub mod hr_report;
pub mod compensation_band;
pub mod payroll_record;
pub mod encryption_key;
pub mod system_settings;

// Re-exports for convenient access
pub use rollback_request::{
    CreateRollbackRequestInput, Model as RollbackRequest, RollbackRequestCondition, RollbackRequestsConnection, RollbackRequestsOrderBy, RollbackStatus, UpdateRollbackRequestInput,
};
pub use bulk_rollback_batch::{
    CreateBulkRollbackBatchInput, Model as BulkRollbackBatch, UpdateBulkRollbackBatchInput,
};
pub use bulk_rollback_item::{
    CreateBulkRollbackItemInput, Model as BulkRollbackItem, UpdateBulkRollbackItemInput,
};
pub use activity_log::{Model as ActivityLog, ActivityLogCondition, ActivityLogsConnection, ActivityLogsOrderBy, CreateActivityLogInput};
pub use hr_report::{CreateHRReportInput, Model as HRReport};
pub use compensation_band::{
    CreateCompensationBandInput, Model as CompensationBand, UpdateCompensationBandInput,
};
pub use payroll_record::{CreatePayrollRecordInput, Model as PayrollRecord};
pub use encryption_key::{CreateEncryptionKeyInput, Model as EncryptionKey};
pub use system_settings::{Model as SystemSettings, UpdateSystemSettingsInput};
