//! System Administration Domain
//!
//! Contains system administration models: rollback system, activity logs,
//! HR reports, compensation, and payroll.

pub mod rollback_request;
pub mod bulk_rollback_batch;
pub mod bulk_rollback_item;
pub mod activity_log;
pub mod hr_report;
pub mod compensation_band;
pub mod payroll_record;
pub mod encryption_key;

// Re-exports for convenient access
pub use rollback_request::{
    CreateRollbackRequestInput, RollbackRequest, RollbackStatus, UpdateRollbackRequestInput,
};
pub use bulk_rollback_batch::{
    BulkRollbackBatch, CreateBulkRollbackBatchInput, UpdateBulkRollbackBatchInput,
};
pub use bulk_rollback_item::{
    BulkRollbackItem, CreateBulkRollbackItemInput, UpdateBulkRollbackItemInput,
};
pub use activity_log::{ActivityLog, CreateActivityLogInput};
pub use hr_report::{CreateHRReportInput, HRReport};
pub use compensation_band::{
    CompensationBand, CreateCompensationBandInput, UpdateCompensationBandInput,
};
pub use payroll_record::{CreatePayrollRecordInput, PayrollRecord};
pub use encryption_key::{CreateEncryptionKeyInput, EncryptionKey};
