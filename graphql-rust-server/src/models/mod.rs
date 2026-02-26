// SeaORM generated entities
pub mod generated;

// Core existing models (SeaORM compatible)
pub mod audit_log_retention;
pub mod audit_logs;
pub mod batch_operation_items;
pub mod batch_operations;
pub mod compliance_reports;
pub mod department;
pub mod email_digest_log;
pub mod email_digests;
pub mod event;
pub mod event_attendee;
pub mod failed_operations;
pub mod intuit_connection;
pub mod intuit_sync_log;
pub mod leave_balance;
pub mod leave_request;
pub mod leave_type;
pub mod linked_resource;
pub mod media_asset;
pub mod notification;
pub mod password_reset_token;
pub mod payroll_sync_history;
pub mod performance_review;
pub mod permission;
pub mod reconciliation_discrepancies;
pub mod reconciliation_reports;
pub mod refresh_token;
pub mod report_schedules;
pub mod retry_history;
pub mod review_cycle;
pub mod review_feedback;
pub mod review_goal;
pub mod role;
pub mod role_permission;
pub mod rollback_operations;
pub mod sync_health_alerts;
pub mod sync_health_metrics;
pub mod sync_permission_audit;
pub mod sync_schedule;
pub mod sync_schedule_history;
pub mod sync_sessions;
pub mod sync_snapshots;
pub mod task;
pub mod task_assignee;
pub mod task_audit_entry;
pub mod task_dependency;
pub mod user;
pub mod validation_failure;
pub mod validation_rule;
pub mod webhook_events;
pub mod webhook_subscriptions;

// Re-export generated entities for easy access
pub use generated::*;
pub mod user_role_assignment;

// New domain-based modules for complete database coverage
pub mod analytics; // Materialized views for dashboards
pub mod documents; // Document management system
pub mod employee; // Employee management extensions
pub mod events; // Event management extensions
pub mod onboarding;
pub mod reviews; // Performance review extensions
pub mod system; // System administration
pub mod tasks; // Task management extensions
pub mod time; // Time-off policies and attendance
pub mod training; // Training module // Onboarding module

pub use department::{
    BulkUpdateDepartmentInput, CreateDepartmentInput, DepartmentQueryResult, DepartmentsOrderBy,
    Model as Department, UpdateDepartmentInput,
};
pub use event::{
    CreateEventInput, EventCondition, EventStatus, EventsOrderBy, Model as Event, UpdateEventInput,
};
pub use event_attendee::{
    CreateEventAttendeeInput, EventAttendeeFilter, Model as EventAttendee, RsvpScope, RsvpStatus,
    UpdateEventAttendeeInput,
};
pub use leave_balance::{CreateLeaveBalanceInput, Model as LeaveBalance, UpdateLeaveBalanceInput};
pub use leave_request::{
    ApproveLeaveRequestInput, CreateLeaveRequestInput, LeaveRequestStatus, Model as LeaveRequest,
    RejectLeaveRequestInput, UpdateLeaveRequestInput,
};
pub use leave_type::{CreateLeaveTypeInput, Model as LeaveType, UpdateLeaveTypeInput};
pub use linked_resource::{
    CreateLinkedResourceInput, Model as LinkedResource, ResourceType, UpdateLinkedResourceInput,
};
pub use media_asset::Model as MediaAsset;
pub use notification::{
    Model as Notification, NotificationCategory, NotificationResourceType, NotificationType,
    UpdateNotificationInput,
};
pub use performance_review::{
    CreatePerformanceReviewInput, Model as PerformanceReview, PerformanceReviewStatus,
    UpdatePerformanceReviewInput,
};
pub use permission::{CreatePermissionInput, Model as Permission, UpdatePermissionInput};
pub use refresh_token::Model as RefreshToken;
pub use review_cycle::{
    CreateReviewCycleInput, Model as ReviewCycle, ReviewCycleStatus, ReviewType,
    UpdateReviewCycleInput,
};
pub use review_feedback::{
    CreateReviewFeedbackInput, FeedbackType, Model as ReviewFeedback, UpdateReviewFeedbackInput,
};
pub use review_goal::{
    CreateReviewGoalInput, GoalCompletionStatus, Model as ReviewGoal, UpdateReviewGoalInput,
};
pub use role::{CreateRoleInput, Model as Role, UpdateRoleInput};
pub use task::{
    ChangeTaskStatusInput, CreateTaskInput, Model as Task, TaskFilter, TaskPriority, TaskStatus,
    UpdateTaskInput,
};
pub use task_assignee::{
    AssignTaskInput, AssigneeRole, Model as TaskAssignee, UpdateTaskAssigneeInput,
};
pub use task_audit_entry::{AuditAction, Model as TaskAuditEntry};
pub use task_dependency::{
    CreateTaskDependencyInput, DependencyType, Model as TaskDependency, UpdateTaskDependencyInput,
};
pub use user::{
    CreateUserInput, Model as User, UpdateUserInput, UserCondition, UserStatus, UsersConnection,
    UsersOrderBy,
};
pub use user_role_assignment::{
    AssignRoleInput, Model as UserRoleAssignment, UserRoleAssignmentsConnection,
};

// New domain model re-exports
pub use documents::{
    CreateDocumentAccessLogInput, CreateDocumentAssignmentInput, CreateDocumentCategoryInput,
    CreateDocumentInput, CreateDocumentVersionInput, CreateEncryptedFileStorageInput, Document,
    DocumentAccessLevel, DocumentAccessLog, DocumentAccessType, DocumentAssignment,
    DocumentCategory, DocumentVersion, EncryptedFileStorage, UpdateDocumentCategoryInput,
    UpdateDocumentInput, UploadDocumentInput,
};
pub use employee::{
    CreateEmergencyContactInput, CreateEmployeeCertificationInput, CreateEmployeeGoalInput,
    CreateEmployeeSkillInput, CreateEmployeeVehicleInput, EmergencyContact, EmployeeCertification,
    EmployeeCertificationFilter, EmployeeGoal, EmployeeSkill, EmployeeSkillFilter, EmployeeVehicle,
    GoalStatus, ProficiencyLevel, UpdateEmergencyContactInput, UpdateEmployeeGoalInput,
    UpdateEmployeeSkillInput, UpdateEmployeeVehicleInput,
};
pub use events::{
    CreateEventCommentInput, CreateEventHistoryInput, CreateEventWaitlistInput, EventComment,
    EventHistory, EventWaitlist, UpdateEventCommentInput, UpdateEventWaitlistInput,
};
pub use onboarding::{
    Assignment, AssignmentWithModule, AssignmentWithUser, CompleteFormInput, ContentBlock,
    ContentBlockGraphQL, CreateAssignmentInput as CreateOnboardingAssignmentInput,
    CreateContentBlockInput, CreateDocumentUploadInput, CreateFormBlockInput,
    CreateFormSubmissionInput, CreateFormTemplateInput, CreateOnboardingFormInput,
    CreateOnboardingModuleInput, DocumentUpload, FormBlock, FormBlockGraphQL, FormProgress,
    FormProgressGraphQL, FormSubmission, FormTemplate, OnboardingContentType, OnboardingForm,
    OnboardingFormBlockType, OnboardingFormGraphQL, OnboardingFormProgressStatus, OnboardingModule,
    OnboardingProgressStatus, Progress, ProgressGraphQL, SaveFormProgressInput,
    UpdateAssignmentInput as UpdateOnboardingAssignmentInput, UpdateContentBlockInput,
    UpdateDocumentUploadInput, UpdateFormBlockInput, UpdateFormTemplateInput,
    UpdateOnboardingFormInput, UpdateOnboardingModuleInput,
    UpdateProgressInput as UpdateOnboardingProgressInput,
};
pub use reviews::{CreateReviewTemplateInput, ReviewTemplate, UpdateReviewTemplateInput};
pub use system::{
    ActivityLog, BulkRollbackBatch, BulkRollbackItem, CompensationBand, CreateActivityLogInput,
    CreateBulkRollbackBatchInput, CreateBulkRollbackItemInput, CreateCompensationBandInput,
    CreateEncryptionKeyInput, CreateHRReportInput, CreatePayrollRecordInput,
    CreateRollbackRequestInput, HRReport, PayrollRecord, RollbackRequest, RollbackStatus,
    SystemSettings, UpdateBulkRollbackBatchInput, UpdateBulkRollbackItemInput,
    UpdateCompensationBandInput, UpdateRollbackRequestInput, UpdateSystemSettingsInput,
};
pub use tasks::{CreateTaskTypeInput, TaskType, UpdateTaskTypeInput};
pub use time::{AttendanceRecord, CreateAttendanceRecordInput, UpdateAttendanceRecordInput};
pub use training::{
    ContentType, CreateAssignmentInput, CreateTrainingContentInput, CreateTrainingInput,
    ProgressStatus, Training, TrainingAssignment, TrainingContent, TrainingProgress,
    UpdateProgressInput, UpdateTrainingContentInput, UpdateTrainingInput,
};
