// Core existing models
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
pub mod task;
pub mod task_assignee;
pub mod task_audit_entry;
pub mod task_dependency;
pub mod user;
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

pub use department::{CreateDepartmentInput, Department, UpdateDepartmentInput};
pub use event::{CreateEventInput, Event, UpdateEventInput};
pub use event_attendee::{
    CreateEventAttendeeInput, EventAttendee, EventAttendeeFilter, RsvpScope, RsvpStatus,
    UpdateEventAttendeeInput,
};
pub use leave_balance::{CreateLeaveBalanceInput, LeaveBalance, UpdateLeaveBalanceInput};
pub use leave_request::{
    ApproveLeaveRequestInput, CreateLeaveRequestInput, LeaveRequest, LeaveRequestStatus,
    RejectLeaveRequestInput, UpdateLeaveRequestInput,
};
pub use leave_type::{CreateLeaveTypeInput, LeaveType, UpdateLeaveTypeInput};
pub use linked_resource::{
    CreateLinkedResourceInput, LinkedResource, ResourceType, UpdateLinkedResourceInput,
};
pub use notification::{
    Notification, NotificationCategory, NotificationResourceType, NotificationType,
};
pub use performance_review::{
    CreatePerformanceReviewInput, PerformanceReview, PerformanceReviewStatus,
    UpdatePerformanceReviewInput,
};
pub use permission::{CreatePermissionInput, Permission, UpdatePermissionInput};
pub use review_cycle::{
    CreateReviewCycleInput, ReviewCycle, ReviewCycleStatus, ReviewType, UpdateReviewCycleInput,
};
pub use review_feedback::{
    CreateReviewFeedbackInput, FeedbackType, ReviewFeedback, UpdateReviewFeedbackInput,
};
pub use review_goal::{
    CreateReviewGoalInput, GoalCompletionStatus, ReviewGoal, UpdateReviewGoalInput,
};
pub use role::{CreateRoleInput, Role, UpdateRoleInput};
pub use task::{ChangeTaskStatusInput, CreateTaskInput, Task, TaskPriority, TaskStatus, UpdateTaskInput};
pub use task_assignee::{AssignTaskInput, AssigneeRole, TaskAssignee, UpdateTaskAssigneeInput};
pub use task_audit_entry::{AuditAction, TaskAuditEntry};
pub use task_dependency::{
    CreateTaskDependencyInput, DependencyType, TaskDependency, UpdateTaskDependencyInput,
};
pub use user::{CreateUserInput, UpdateUserInput, User, UserStatus};
pub use user_role_assignment::{AssignRoleInput, UserRoleAssignment};

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
    CreateDocumentInput, CreateDocumentVersionInput, CreateEncryptedFileStorageInput, Document,
    DocumentAccessLevel, DocumentAccessLog, DocumentAccessType, DocumentAssignment,
    DocumentCategory, DocumentVersion, EncryptedFileStorage, UpdateDocumentCategoryInput,
    UpdateDocumentInput,
};
pub use time::{
    AttendanceRecord, AttendanceStatus, CreateAttendanceRecordInput, CreateTimeOffPolicyInput,
    TimeOffPolicy, UpdateAttendanceRecordInput, UpdateTimeOffPolicyInput,
};
pub use analytics::{DashboardSummary, DepartmentMetric, GoalStatistic, ReportAnalytic};
pub use system::{
    ActivityLog, BulkRollbackBatch, BulkRollbackItem, CompensationBand,
    CreateActivityLogInput, CreateBulkRollbackBatchInput, CreateBulkRollbackItemInput,
    CreateCompensationBandInput, CreateEncryptionKeyInput, CreateHRReportInput,
    CreatePayrollRecordInput, CreateRollbackRequestInput, EncryptionKey, HRReport, PayrollRecord,
    RollbackRequest, RollbackStatus, UpdateBulkRollbackBatchInput, UpdateBulkRollbackItemInput,
    UpdateCompensationBandInput, UpdateRollbackRequestInput,
};
pub use events::{
    CreateEventCommentInput, CreateEventHistoryInput, CreateEventWaitlistInput, EventComment,
    EventHistory, EventWaitlist, UpdateEventCommentInput, UpdateEventWaitlistInput,
};
pub use tasks::{CreateTaskTypeInput, TaskType, UpdateTaskTypeInput};
pub use reviews::{CreateReviewTemplateInput, ReviewTemplate, UpdateReviewTemplateInput};
