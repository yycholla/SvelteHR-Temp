// SeaORM generated entities
pub mod generated;

// Core existing models (SeaORM compatible)
pub mod department;
pub mod event;
pub mod event_attendee;
pub mod leave_balance;
pub mod leave_request;
pub mod leave_type;
pub mod linked_resource;
pub mod notification;
pub mod performance_review;
pub mod permission;
pub mod review_cycle;
pub mod review_feedback;
pub mod review_goal;
pub mod role;
pub mod role_permission;
pub mod session;
pub mod task;
pub mod task_assignee;
pub mod task_audit_entry;
pub mod task_dependency;
pub mod user;
pub mod user_session;
pub mod media_asset;
pub mod intuit_connection;

// Re-export generated entities for easy access
pub use generated::*;
pub mod user_role_assignment;

// New domain-based modules for complete database coverage
pub mod employee;      // Employee management extensions
pub mod documents;     // Document management system
pub mod time;          // Time-off policies and attendance
pub mod analytics;     // Materialized views for dashboards
pub mod system;        // System administration
pub mod events;        // Event management extensions
pub mod tasks;         // Task management extensions
pub mod reviews;       // Performance review extensions
pub mod training;      // Training module
pub mod onboarding;    // Onboarding module

pub use department::{CreateDepartmentInput, Model as Department, DepartmentsOrderBy, UpdateDepartmentInput};
pub use event::{CreateEventInput, Model as Event, EventCondition, EventsOrderBy, EventStatus, UpdateEventInput};
pub use event_attendee::{
    CreateEventAttendeeInput, Model as EventAttendee, EventAttendeeFilter, RsvpScope, RsvpStatus,
    UpdateEventAttendeeInput,
};
pub use leave_balance::{CreateLeaveBalanceInput, Model as LeaveBalance, UpdateLeaveBalanceInput};
pub use leave_request::{
    ApproveLeaveRequestInput, CreateLeaveRequestInput, Model as LeaveRequest, LeaveRequestStatus,
    RejectLeaveRequestInput, UpdateLeaveRequestInput,
};
pub use leave_type::{CreateLeaveTypeInput, Model as LeaveType, UpdateLeaveTypeInput};
pub use linked_resource::{
    CreateLinkedResourceInput, Model as LinkedResource, ResourceType, UpdateLinkedResourceInput,
};
pub use notification::{
    Model as Notification, NotificationCategory, NotificationResourceType, NotificationType,
    UpdateNotificationInput,
};
pub use performance_review::{
    CreatePerformanceReviewInput, Model as PerformanceReview, PerformanceReviewStatus,
    UpdatePerformanceReviewInput,
};
pub use permission::{CreatePermissionInput, Model as Permission, UpdatePermissionInput};
pub use review_cycle::{
    CreateReviewCycleInput, Model as ReviewCycle, ReviewCycleStatus, ReviewType, UpdateReviewCycleInput,
};
pub use review_feedback::{
    CreateReviewFeedbackInput, FeedbackType, Model as ReviewFeedback, UpdateReviewFeedbackInput,
};
pub use review_goal::{
    CreateReviewGoalInput, GoalCompletionStatus, Model as ReviewGoal, UpdateReviewGoalInput,
};
pub use role::{CreateRoleInput, Model as Role, UpdateRoleInput};
pub use task::{ChangeTaskStatusInput, CreateTaskInput, Model as Task, TaskFilter, TaskPriority, TaskStatus, UpdateTaskInput};
pub use task_assignee::{AssignTaskInput, AssigneeRole, Model as TaskAssignee, UpdateTaskAssigneeInput};
pub use task_audit_entry::{AuditAction, Model as TaskAuditEntry};
pub use task_dependency::{
    CreateTaskDependencyInput, DependencyType, Model as TaskDependency, UpdateTaskDependencyInput,
};
pub use user::{CreateUserInput, UpdateUserInput, Model as User, UserCondition, UsersConnection, UsersOrderBy, UserStatus};
pub use user_role_assignment::{AssignRoleInput, Model as UserRoleAssignment, UserRoleAssignmentsConnection};
pub use session::{Model as Session};
pub use media_asset::{Model as MediaAsset};

// New domain model re-exports
pub use employee::{
    CreateEmployeeCertificationInput, CreateEmployeeGoalInput, CreateEmployeeSkillInput,
    CreateEmployeeVehicleInput, CreateEmergencyContactInput, EmergencyContact,
    EmployeeCertification, EmployeeCertificationFilter, EmployeeGoal, EmployeeSkill,
    EmployeeSkillFilter, EmployeeVehicle, GoalStatus, ProficiencyLevel,
    UpdateEmployeeGoalInput, UpdateEmployeeSkillInput, UpdateEmployeeVehicleInput,
    UpdateEmergencyContactInput,
};
pub use documents::{
    CreateDocumentAccessLogInput, CreateDocumentAssignmentInput, CreateDocumentCategoryInput,
    CreateDocumentInput, CreateDocumentVersionInput, CreateEncryptedFileStorageInput,
    DocumentAccessLog, DocumentAccessType,
    DocumentAssignment, DocumentCategory, DocumentVersion, EncryptedFileStorage,
    UpdateDocumentCategoryInput, UpdateDocumentInput, UploadDocumentInput,
    Document, DocumentAccessLevel,
};
pub use time::{
    AttendanceRecord, CreateAttendanceRecordInput, UpdateAttendanceRecordInput,
};
pub use system::{
    ActivityLog, BulkRollbackBatch, BulkRollbackItem, CompensationBand,
    CreateActivityLogInput, CreateBulkRollbackBatchInput, CreateBulkRollbackItemInput,
    CreateCompensationBandInput, CreateEncryptionKeyInput, CreateHRReportInput,
    CreatePayrollRecordInput, CreateRollbackRequestInput, HRReport, PayrollRecord,
    RollbackRequest, RollbackStatus,
    SystemSettings, UpdateBulkRollbackBatchInput, UpdateBulkRollbackItemInput,
    UpdateCompensationBandInput, UpdateRollbackRequestInput, UpdateSystemSettingsInput,
};
pub use events::{
    CreateEventCommentInput, CreateEventHistoryInput, CreateEventWaitlistInput, EventComment,
    EventHistory, EventWaitlist, UpdateEventCommentInput, UpdateEventWaitlistInput,
};
pub use tasks::{CreateTaskTypeInput, TaskType, UpdateTaskTypeInput};
pub use reviews::{CreateReviewTemplateInput, ReviewTemplate, UpdateReviewTemplateInput};
pub use training::{
    Training, CreateTrainingInput, UpdateTrainingInput,
    TrainingContent, CreateTrainingContentInput, UpdateTrainingContentInput, ContentType,
    TrainingAssignment, CreateAssignmentInput,
    TrainingProgress, UpdateProgressInput, ProgressStatus,
};
pub use onboarding::{
    OnboardingModule, CreateOnboardingModuleInput, UpdateOnboardingModuleInput,
    FormTemplate, CreateFormTemplateInput, UpdateFormTemplateInput,
    ContentBlock, ContentBlockGraphQL, CreateContentBlockInput, UpdateContentBlockInput, OnboardingContentType,
    OnboardingForm, OnboardingFormGraphQL, CreateOnboardingFormInput, UpdateOnboardingFormInput,
    FormBlock, FormBlockGraphQL, CreateFormBlockInput, UpdateFormBlockInput, OnboardingFormBlockType,
    FormProgress, FormProgressGraphQL, SaveFormProgressInput, CompleteFormInput, OnboardingFormProgressStatus,
    Assignment, CreateAssignmentInput as CreateOnboardingAssignmentInput, UpdateAssignmentInput as UpdateOnboardingAssignmentInput,
    AssignmentWithModule, AssignmentWithUser,
    Progress, ProgressGraphQL, UpdateProgressInput as UpdateOnboardingProgressInput, OnboardingProgressStatus,
    FormSubmission, CreateFormSubmissionInput,
    DocumentUpload, CreateDocumentUploadInput, UpdateDocumentUploadInput,
};
