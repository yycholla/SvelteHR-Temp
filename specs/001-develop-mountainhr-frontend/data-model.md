# Data Model: MountainHR Frontend

**Generated**: 2025-09-07  
**Phase**: 1 - Design & Contracts  
**Based On**: Feature specification entities and research findings

## Core Entities

### User

**Purpose**: System authentication and basic profile information
**Fields**:

- `id: ID!` - Unique identifier
- `email: String!` - Login email (unique)
- `firstName: String!` - Given name
- `lastName: String!` - Family name
- `isActive: Boolean!` - Account status
- `createdAt: DateTime!` - Registration timestamp
- `updatedAt: DateTime!` - Last modification

**Relationships**:

- `roles: [Role!]!` - Assigned roles (many-to-many)
- `employee: Employee` - Associated employee record (optional for system users)
- `sessions: [Session!]!` - Active authentication sessions

**Validation Rules**:

- Email must be valid email format
- Names must be 2-50 characters
- At least one role required

### Role

**Purpose**: Permission grouping and hierarchy definition
**Fields**:

- `id: ID!` - Unique identifier
- `name: String!` - Role name (unique)
- `description: String` - Role purpose
- `level: Int!` - Hierarchy level (higher = more permissions)
- `isSystemRole: Boolean!` - Built-in vs custom role

**Relationships**:

- `permissions: [Permission!]!` - Granted permissions (many-to-many)
- `users: [User!]!` - Assigned users

**Validation Rules**:

- Name must be unique, 3-30 characters
- Level must be positive integer
- System roles cannot be deleted

### Permission

**Purpose**: Granular access rights definition
**Fields**:

- `id: ID!` - Unique identifier
- `resource: String!` - Resource type (e.g., "employees", "departments")
- `action: String!` - Action type (e.g., "read", "write", "delete")
- `scope: String` - Permission scope (e.g., "own", "team", "all")

**Relationships**:

- `roles: [Role!]!` - Roles with this permission

**Validation Rules**:

- Resource + Action + Scope combination must be unique
- Resource must be from predefined list
- Action must be: read, write, delete, or approve

### Employee Profile

**Purpose**: HR-specific employee information and records
**Fields**:

- `id: ID!` - Unique identifier
- `employeeId: String!` - Company employee ID (unique)
- `userId: ID!` - Associated user account
- `department: Department!` - Current department
- `position: String!` - Job title
- `manager: Employee` - Direct manager (optional)
- `hireDate: Date!` - Employment start date
- `status: EmployeeStatus!` - Current employment status
- `salary: Float` - Current salary (restricted access)
- `phone: String` - Contact phone
- `address: String` - Home address

**Relationships**:

- `user: User!` - Authentication account
- `department: Department!` - Current department
- `manager: Employee` - Direct supervisor
- `directReports: [Employee!]!` - Managed employees
- `leaveRequests: [LeaveRequest!]!` - Time-off requests
- `documents: [Document!]!` - Associated files

**Validation Rules**:

- Employee ID must be unique, alphanumeric
- Hire date cannot be future date
- Phone must be valid format
- Manager cannot be self

**State Transitions**:

- Active ↔ Inactive
- Active → Terminated
- Terminated → Rehired (creates new record)

### Department

**Purpose**: Organizational structure and team grouping
**Fields**:

- `id: ID!` - Unique identifier
- `name: String!` - Department name (unique)
- `description: String` - Department purpose
- `budget: Float` - Annual budget (restricted access)
- `head: Employee` - Department head (optional)

**Relationships**:

- `employees: [Employee!]!` - Department members
- `head: Employee` - Department manager

**Validation Rules**:

- Name must be unique, 2-50 characters
- Budget must be non-negative if provided

### Communication

**Purpose**: Internal messaging and announcements
**Fields**:

- `id: ID!` - Unique identifier
- `type: MessageType!` - Message category
- `subject: String!` - Message title
- `content: String!` - Message body
- `sender: User!` - Author
- `priority: Priority!` - Urgency level
- `isRead: Boolean!` - Read status per recipient
- `createdAt: DateTime!` - Send timestamp

**Relationships**:

- `sender: User!` - Message author
- `recipients: [User!]!` - Message targets
- `attachments: [Document!]!` - Attached files

**Validation Rules**:

- Subject must be 5-100 characters
- Content must be 10-5000 characters
- At least one recipient required

### HR Process

**Purpose**: Workflow tracking and approval chains
**Fields**:

- `id: ID!` - Unique identifier
- `type: ProcessType!` - Process category
- `title: String!` - Process description
- `status: ProcessStatus!` - Current state
- `requester: Employee!` - Process initiator
- `approver: Employee` - Assigned approver
- `data: JSON!` - Process-specific data
- `createdAt: DateTime!` - Initiation timestamp
- `completedAt: DateTime` - Completion timestamp

**Relationships**:

- `requester: Employee!` - Process initiator
- `approver: Employee` - Responsible approver
- `comments: [ProcessComment!]!` - Discussion thread

**State Transitions**:

- Submitted → Pending → Approved/Rejected
- Pending ↔ More Info Needed
- Any Status → Cancelled

**Validation Rules**:

- Title must be 5-100 characters
- Data must validate against process type schema

### Session

**Purpose**: Authentication session tracking
**Fields**:

- `id: ID!` - Unique identifier
- `userId: ID!` - Associated user
- `token: String!` - JWT token hash
- `refreshToken: String!` - Refresh token hash
- `expiresAt: DateTime!` - Session expiry
- `lastActivity: DateTime!` - Last access time
- `ipAddress: String` - Client IP
- `userAgent: String` - Client browser

**Relationships**:

- `user: User!` - Session owner

**Validation Rules**:

- Tokens must be securely hashed
- Expires at must be future date
- Max 5 concurrent sessions per user

### Audit Log

**Purpose**: Security and compliance tracking
**Fields**:

- `id: ID!` - Unique identifier
- `userId: ID` - Acting user (optional for system events)
- `action: String!` - Action performed
- `resource: String!` - Affected resource
- `resourceId: String` - Specific resource ID
- `metadata: JSON` - Additional context
- `timestamp: DateTime!` - Event time
- `ipAddress: String` - Client IP
- `success: Boolean!` - Action result

**Relationships**:

- `user: User` - Acting user

**Validation Rules**:

- Action must be from predefined list
- Resource must be valid entity type
- Timestamp must be server-generated

## Enumerations

### EmployeeStatus

- `ACTIVE` - Currently employed
- `INACTIVE` - Temporarily inactive
- `TERMINATED` - Employment ended
- `ON_LEAVE` - Extended leave of absence

### MessageType

- `ANNOUNCEMENT` - Company-wide news
- `DIRECT_MESSAGE` - Private communication
- `NOTIFICATION` - System-generated alerts
- `REMINDER` - Deadline reminders

### Priority

- `LOW` - Informational
- `MEDIUM` - Normal business
- `HIGH` - Important attention needed
- `URGENT` - Immediate action required

### ProcessType

- `LEAVE_REQUEST` - Time-off applications
- `EXPENSE_CLAIM` - Reimbursement requests
- `PERFORMANCE_REVIEW` - Evaluation processes
- `TRANSFER_REQUEST` - Department/role changes
- `DOCUMENT_APPROVAL` - File review workflows

### ProcessStatus

- `SUBMITTED` - Initial state
- `PENDING` - Under review
- `MORE_INFO_NEEDED` - Requires clarification
- `APPROVED` - Completed successfully
- `REJECTED` - Denied
- `CANCELLED` - Withdrawn by requester

## GraphQL Schema Considerations

### Security

- Field-level permissions based on user roles
- Sensitive fields (salary, etc.) require elevated permissions
- Automatic user context injection in resolvers

### Performance

- Pagination for list queries (employees, messages, etc.)
- DataLoader pattern for N+1 query prevention
- Query complexity analysis to prevent abuse

### Versioning

- Schema deprecation warnings for breaking changes
- Parallel field resolution during migrations
- Version headers for client compatibility
