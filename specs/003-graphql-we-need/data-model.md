# Data Model: GraphQL Integration

**Feature**: 003-graphql-we-need  
**Date**: 2025-09-09  
**Status**: Complete

## Core Entities

Based on the feature specification requirements, these entities will be exposed through GraphQL:

### Employee
Primary HR entity representing individual workers.

**Fields**:
- `id`: UUID (required) - Unique identifier
- `firstName`: String (required) - Given name
- `lastName`: String (required) - Family name  
- `email`: String (required, unique) - Work email address
- `employeeId`: String (optional, unique) - Company employee number
- `isActive`: Boolean (required, default: true) - Employment status
- `hireDate`: Date (required) - Start of employment
- `terminationDate`: Date (optional) - End of employment
- `jobTitle`: String (optional) - Current position title
- `phoneNumber`: String (optional) - Contact number
- `address`: JSON (optional) - Physical address object

**Relationships**:
- `department`: Department (many-to-one) - Organizational unit
- `manager`: Employee (many-to-one, optional) - Direct supervisor
- `directReports`: [Employee] (one-to-many) - Managed employees
- `roles`: [Role] (many-to-many) - Assigned RBAC roles
- `payrollRecords`: [PayrollRecord] (one-to-many) - Compensation history
- `timeEntries`: [TimeEntry] (one-to-many) - Time tracking records
- `performanceReviews`: [PerformanceReview] (one-to-many) - Evaluation history
- `leaveRequests`: [LeaveRequest] (one-to-many) - Time-off requests
- `documents`: [Document] (one-to-many) - Associated files

**Validation Rules**:
- Email must be valid format and unique across active employees
- Hire date cannot be in the future
- Termination date must be after hire date if present
- Manager cannot be self-referential
- At least one role must be assigned

### Department
Organizational units for grouping employees.

**Fields**:
- `id`: UUID (required) - Unique identifier
- `name`: String (required, unique) - Department name
- `description`: String (optional) - Purpose description
- `budgetCode`: String (optional, unique) - Financial tracking code
- `isActive`: Boolean (required, default: true) - Operational status
- `createdAt`: DateTime (required) - Creation timestamp
- `updatedAt`: DateTime (required) - Last modification

**Relationships**:
- `parent`: Department (many-to-one, optional) - Parent department
- `children`: [Department] (one-to-many) - Sub-departments
- `employees`: [Employee] (one-to-many) - Department members
- `manager`: Employee (many-to-one, optional) - Department head

**Validation Rules**:
- Name must be unique among active departments
- Parent cannot create circular references
- Manager must be employee within department or parent department

### Role
RBAC roles defining permissions and access levels.

**Fields**:
- `id`: UUID (required) - Unique identifier
- `name`: String (required, unique) - Role name
- `description`: String (optional) - Role purpose
- `level`: Integer (required) - Hierarchical level (1-100)
- `isActive`: Boolean (required, default: true) - Role availability
- `permissions`: [String] (required) - Permission identifiers

**Relationships**:
- `employees`: [Employee] (many-to-many) - Users with this role
- `parent`: Role (many-to-one, optional) - Inherited role
- `children`: [Role] (one-to-many) - Inheriting roles

**Validation Rules**:
- Name must be unique among active roles
- Level must be between 1-100
- Permissions array cannot be empty
- Parent role level must be higher than child level

### PayrollRecord
Compensation and payment tracking for employees.

**Fields**:
- `id`: UUID (required) - Unique identifier
- `payPeriodStart`: Date (required) - Period start date
- `payPeriodEnd`: Date (required) - Period end date
- `grossPay`: Decimal (required) - Total earnings
- `netPay`: Decimal (required) - Take-home amount
- `taxes`: JSON (required) - Tax breakdown object
- `deductions`: JSON (optional) - Deduction breakdown
- `bonuses`: JSON (optional) - Bonus breakdown
- `status`: Enum (required) - DRAFT, PROCESSED, PAID
- `processedAt`: DateTime (optional) - Processing timestamp

**Relationships**:
- `employee`: Employee (many-to-one, required) - Payroll recipient

**Validation Rules**:
- Pay period end must be after start date
- Net pay must be less than or equal to gross pay
- Status transitions must follow workflow: DRAFT → PROCESSED → PAID
- Only one active record per employee per pay period

### TimeEntry
Time tracking for attendance and project work.

**Fields**:
- `id`: UUID (required) - Unique identifier
- `date`: Date (required) - Work date
- `startTime`: Time (required) - Clock-in time
- `endTime`: Time (optional) - Clock-out time
- `breakMinutes`: Integer (default: 0) - Break duration
- `hoursWorked`: Decimal (computed) - Total work hours
- `overtime`: Boolean (computed) - Overtime flag
- `status`: Enum (required) - PENDING, APPROVED, REJECTED
- `notes`: String (optional) - Additional context

**Relationships**:
- `employee`: Employee (many-to-one, required) - Worker
- `approver`: Employee (many-to-one, optional) - Approval manager

**Validation Rules**:
- Date cannot be in the future
- End time must be after start time if present
- Break minutes cannot exceed total time
- Only one entry per employee per date
- Overtime calculated based on company policy (>40 hours/week)

### PerformanceReview
Employee evaluation and feedback system.

**Fields**:
- `id`: UUID (required) - Unique identifier
- `reviewPeriodStart`: Date (required) - Evaluation period start
- `reviewPeriodEnd`: Date (required) - Evaluation period end
- `overallRating`: Integer (required) - 1-5 scale rating
- `goals`: JSON (required) - Goals and achievements object
- `feedback`: String (required) - Detailed evaluation
- `status`: Enum (required) - DRAFT, PENDING, COMPLETED
- `completedAt`: DateTime (optional) - Completion timestamp

**Relationships**:
- `employee`: Employee (many-to-one, required) - Review subject
- `reviewer`: Employee (many-to-one, required) - Evaluating manager

**Validation Rules**:
- Review period end must be after start date
- Overall rating must be between 1-5
- Reviewer cannot be the same as employee
- Only one active review per employee per period

### LeaveRequest
Time-off request and approval system.

**Fields**:
- `id`: UUID (required) - Unique identifier
- `leaveType`: Enum (required) - VACATION, SICK, PERSONAL, MEDICAL
- `startDate`: Date (required) - Leave start date
- `endDate`: Date (required) - Leave end date
- `totalDays`: Integer (computed) - Business days count
- `reason`: String (optional) - Leave justification
- `status`: Enum (required) - PENDING, APPROVED, DENIED, CANCELLED
- `appliedAt`: DateTime (required) - Application timestamp
- `respondedAt`: DateTime (optional) - Response timestamp

**Relationships**:
- `employee`: Employee (many-to-one, required) - Leave requester
- `approver`: Employee (many-to-one, optional) - Approval manager

**Validation Rules**:
- End date must be same day or after start date
- Start date cannot be in the past (except for sick leave)
- Cannot overlap with existing approved leave
- Total days calculated excluding weekends/holidays

### Document
File attachments and document management.

**Fields**:
- `id`: UUID (required) - Unique identifier
- `fileName`: String (required) - Original file name
- `fileSize`: Integer (required) - File size in bytes
- `mimeType`: String (required) - File content type
- `storageKey`: String (required, unique) - Storage location reference
- `category`: Enum (required) - CONTRACT, HANDBOOK, FORM, CERTIFICATE
- `isConfidential`: Boolean (required, default: false) - Access restriction
- `uploadedAt`: DateTime (required) - Upload timestamp
- `expiresAt`: DateTime (optional) - Expiration date

**Relationships**:
- `employee`: Employee (many-to-one, optional) - Associated employee
- `uploadedBy`: Employee (many-to-one, required) - Uploader

**Validation Rules**:
- File size cannot exceed 10MB
- Supported MIME types: PDF, Word, images
- Confidential documents require special permissions
- Expired documents cannot be downloaded

### AuditLog
Activity tracking for compliance and change history.

**Fields**:
- `id`: UUID (required) - Unique identifier
- `action`: String (required) - Performed action
- `entityType`: String (required) - Affected entity type
- `entityId`: UUID (required) - Affected entity ID
- `oldValues`: JSON (optional) - Previous field values
- `newValues`: JSON (optional) - Updated field values
- `timestamp`: DateTime (required) - Action timestamp
- `ipAddress`: String (optional) - Client IP address
- `userAgent`: String (optional) - Client browser info

**Relationships**:
- `user`: Employee (many-to-one, required) - Action performer

**Validation Rules**:
- Timestamp cannot be modified after creation
- Action must be from predefined list
- Entity type and ID must reference valid entities
- Audit logs are immutable after creation

## GraphQL Schema Considerations

### Query Optimization
- Implement field-level authorization
- Add query complexity analysis
- Support pagination for all list operations
- Enable query batching for efficiency

### Subscription Support
- Real-time updates for employee status changes
- Live notification for leave request approvals
- Department restructuring notifications
- Performance review milestone updates

### Mutation Design
- Atomic operations for data consistency
- Optimistic updates with rollback capability
- Comprehensive input validation
- Automatic audit log generation

### Caching Strategy
- Entity-level caching with TTL
- Relationship prefetching for common queries
- Cache invalidation on mutations
- Partial query result caching

This data model provides the foundation for implementing all functional requirements while maintaining data integrity, security, and performance optimization through GraphQL.