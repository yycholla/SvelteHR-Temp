# GraphQL API Contracts

**Date**: 2025-09-10  
**Feature**: MountainHR Frontend Development  
**Purpose**: Define GraphQL queries, mutations, and subscriptions for HR management operations

## Core GraphQL Schema

### User Management Operations

```graphql
# Authentication & Authorization
type Query {
  # Get current authenticated user
  me: User
  
  # Validate authentication token
  validateToken: User
  
  # User management (HR Admin only)
  users(
    filter: UserFilter
    pagination: PaginationInput
    sort: SortInput
  ): UserConnection!
  
  # Get specific user (with RBAC checks)
  user(id: ID!): User
  
  # Get user permissions for current user
  myPermissions: [Permission!]!
  
  # Role management
  roles(filter: RoleFilter): [Role!]!
  role(id: ID!): Role
}

type Mutation {
  # Authentication
  login(email: String!, password: String!): AuthPayload!
  logout: Boolean!
  refreshToken(refreshToken: String!): AuthPayload!
  
  # User management
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deactivateUser(id: ID!, reason: String): User!
  
  # Password management
  changePassword(currentPassword: String!, newPassword: String!): Boolean!
  resetPassword(token: String!, newPassword: String!): Boolean!
  requestPasswordReset(email: String!): Boolean!
  
  # Role assignment
  assignRole(userId: ID!, roleId: ID!): UserRole!
  revokeRole(userId: ID!, roleId: ID!): Boolean!
}

# Types
type User {
  id: ID!
  username: String!
  email: String!
  firstName: String
  lastName: String
  employeeId: String
  onboardingStatus: OnboardingStatus!
  jobTitle: String
  isActive: Boolean!
  isVerified: Boolean!
  lastLogin: DateTime
  
  # Computed properties
  fullName: String
  displayName: String!
  searchName: String!
  isManager: Boolean!
  directReportCount: Int!
  managementLevel: Int!
  
  # Related entities (with RBAC filtering)
  manager: User
  directReports: [User!]!
  roles: [Role!]!
  department: Department
  contactInfo: ContactInformation
  personalInfo: PersonalInformation # Restricted access
  jobInfo: JobInformation
  compensation: Compensation # Highly restricted
  
  createdAt: DateTime!
  updatedAt: DateTime!
}

type AuthPayload {
  accessToken: String!
  refreshToken: String!
  expiresIn: Int!
  user: User!
}

input UserFilter {
  search: String
  departmentId: ID
  onboardingStatus: [OnboardingStatus!]
  isActive: Boolean
  roles: [String!]
  managerId: ID
  isManager: Boolean
  dateRange: DateRangeInput
}

input CreateUserInput {
  username: String!
  email: String!
  firstName: String!
  lastName: String!
  employeeId: String
  password: String!
  jobTitle: String
  departmentId: ID
  managerId: ID
  roleIds: [ID!]!
}

input UpdateUserInput {
  firstName: String
  lastName: String
  email: String
  jobTitle: String
  departmentId: ID
  managerId: ID
  isActive: Boolean
}
```

### HR Workflow Operations

```graphql
extend type Query {
  # Dashboard data
  dashboardData: DashboardData!
  
  # Task management
  tasks(
    filter: TaskFilter
    pagination: PaginationInput
    sort: SortInput
  ): TaskConnection!
  
  task(id: ID!): Task
  
  # Leave management
  leaveBalances(employeeId: ID): [LeaveBalance!]!
  leaveRequests(
    filter: LeaveFilter
    pagination: PaginationInput
  ): LeaveConnection!
  
  # Attendance tracking
  attendance(
    employeeId: ID
    dateRange: DateRangeInput!
  ): [Attendance!]!
  
  # HR requests
  hrRequests(
    filter: HRRequestFilter
    pagination: PaginationInput
  ): HRRequestConnection!
  
  # Change requests
  changeRequests(
    filter: ChangeRequestFilter
    pagination: PaginationInput
  ): ChangeRequestConnection!
}

extend type Mutation {
  # Task management
  createTask(input: CreateTaskInput!): Task!
  updateTask(id: ID!, input: UpdateTaskInput!): Task!
  completeTask(id: ID!): Task!
  deleteTask(id: ID!): Boolean!
  
  # Leave requests
  submitLeaveRequest(input: LeaveRequestInput!): Leave!
  approveLeave(id: ID!, comments: String): Leave!
  rejectLeave(id: ID!, reason: String!): Leave!
  cancelLeave(id: ID!): Leave!
  
  # Attendance
  clockIn(location: String, deviceInfo: String): TimeEntry!
  clockOut(location: String, deviceInfo: String): TimeEntry!
  submitAttendanceCorrection(input: AttendanceCorrectionInput!): Attendance!
  
  # HR requests
  submitHRRequest(input: HRRequestInput!): HRRequest!
  assignHRRequest(id: ID!, assigneeId: ID!): HRRequest!
  resolveHRRequest(id: ID!, resolution: String!): HRRequest!
  
  # Change requests
  submitChangeRequest(input: ChangeRequestInput!): ChangeRequest!
  approveChangeRequest(id: ID!, comments: String): ChangeRequest!
  rejectChangeRequest(id: ID!, reason: String!): ChangeRequest!
}

# Types
type DashboardData {
  user: User!
  upcomingTasks: [Task!]!
  pendingApprovals: [ApprovalItem!]!
  recentActivity: [ActivityItem!]!
  teamMetrics: TeamMetrics
  notifications: [Notification!]!
  quickStats: DashboardStats!
}

type Task {
  id: ID!
  title: String!
  description: String
  status: TaskStatus!
  priority: String!
  dueDate: DateTime
  completionDate: DateTime
  estimatedHours: Float
  actualHours: Float
  
  # Relationships
  assignedTo: User!
  createdBy: User
  parentTask: Task
  subtasks: [Task!]!
  dependencies: [Task!]!
  
  # Computed
  completionPercentage: Float!
  isOverdue: Boolean!
  
  createdAt: DateTime!
  updatedAt: DateTime!
}

type LeaveBalance {
  id: ID!
  employee: User!
  leaveType: String!
  balance: Float!
  accruedYtd: Float!
  usedYtd: Float!
  carryOverLimit: Float
  accrualRate: Float
  lastUpdated: DateTime
  
  # Computed
  availableBalance: Float!
  projectedBalance: Float!
  
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Leave {
  id: ID!
  leaveBalance: LeaveBalance!
  startDate: Date!
  endDate: Date!
  status: ApprovalStatus!
  reason: String
  daysRequested: Float
  approver: User
  approvedAt: DateTime
  comments: String
  isEmergency: Boolean!
  
  # Computed
  isPending: Boolean!
  isApproved: Boolean!
  dayCount: Int!
  
  createdAt: DateTime!
  updatedAt: DateTime!
}

input CreateTaskInput {
  title: String!
  description: String
  priority: String! # low, medium, high, critical
  assignedToId: ID!
  dueDate: DateTime
  parentTaskId: ID
  dependencyIds: [ID!]
  estimatedHours: Float
}

input LeaveRequestInput {
  leaveBalanceId: ID!
  startDate: Date!
  endDate: Date!
  reason: String
  isEmergency: Boolean!
}

input TaskFilter {
  assignedToId: ID
  status: [TaskStatus!]
  priority: [String!]
  dueDateRange: DateRangeInput
  createdByIds: [ID!]
  hasParent: Boolean
}
```

### Department and Organization Operations

```graphql
extend type Query {
  # Organization structure
  departments(
    filter: DepartmentFilter
    includeInactive: Boolean
  ): [Department!]!
  
  department(id: ID!): Department
  
  # Organization chart
  organizationChart: [OrgNode!]!
}

extend type Mutation {
  # Department management
  createDepartment(input: CreateDepartmentInput!): Department!
  updateDepartment(id: ID!, input: UpdateDepartmentInput!): Department!
  deactivateDepartment(id: ID!, reason: String): Department!
  
  # Organization restructuring
  transferEmployee(employeeId: ID!, departmentId: ID!, managerId: ID): User!
  updateReportingStructure(employeeId: ID!, managerId: ID!): User!
}

type Department {
  id: ID!
  name: String!
  description: String
  budget: Float
  isActive: Boolean!
  parentDepartment: Department
  manager: User
  
  # Computed properties
  employeeCount: Int!
  subdepartmentCount: Int!
  activeEmployeeCount: Int!
  departmentHierarchy: String!
  budgetPerEmployee: Float
  
  # Related data
  subdepartments: [Department!]!
  employees: [User!]!
  
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrgNode {
  user: User!
  department: Department
  directReports: [OrgNode!]!
  level: Int!
}

input CreateDepartmentInput {
  name: String!
  description: String
  budget: Float
  parentDepartmentId: ID
  managerId: ID
}
```

### Reporting and Analytics Operations

```graphql
extend type Query {
  # HR Reports
  employeeReport(
    filter: EmployeeReportFilter
    groupBy: [String!]
    metrics: [String!]!
  ): EmployeeReport!
  
  attendanceReport(
    filter: AttendanceReportFilter
    dateRange: DateRangeInput!
  ): AttendanceReport!
  
  leaveReport(
    filter: LeaveReportFilter  
    dateRange: DateRangeInput!
  ): LeaveReport!
  
  performanceMetrics(
    departmentId: ID
    dateRange: DateRangeInput!
  ): PerformanceMetrics!
  
  # Export capabilities
  exportData(
    type: ExportType!
    filter: ExportFilter!
    format: ExportFormat!
  ): ExportJob!
  
  exportStatus(jobId: ID!): ExportJob!
}

type EmployeeReport {
  totalCount: Int!
  activeCount: Int!
  inactiveCount: Int!
  newHires: Int!
  terminations: Int!
  
  breakdowns: [ReportBreakdown!]!
  trends: [TrendData!]!
  demographics: Demographics!
}

type AttendanceReport {
  totalDays: Int!
  presentDays: Int!
  absentDays: Int!
  lateDays: Int!
  overtimeHours: Float!
  
  employeeBreakdowns: [EmployeeAttendance!]!
  departmentBreakdowns: [DepartmentAttendance!]!
}

input EmployeeReportFilter {
  departmentIds: [ID!]
  onboardingStatuses: [OnboardingStatus!]
  dateRange: DateRangeInput
  includeTerminated: Boolean
}

enum ExportType {
  EMPLOYEES
  ATTENDANCE
  LEAVE_REQUESTS
  PAYROLL
  PERFORMANCE
}

enum ExportFormat {
  CSV
  XLSX
  PDF
  JSON
}
```

## WebSocket Subscriptions

```graphql
type Subscription {
  # Real-time notifications
  notifications(userId: ID!): Notification!
  
  # Task updates
  taskUpdates(assigneeId: ID): Task!
  
  # Approval workflow updates
  approvalUpdates(approverId: ID!): ApprovalUpdate!
  
  # System status updates
  systemStatus: SystemStatusUpdate!
}

type Notification {
  id: ID!
  type: NotificationType!
  title: String!
  message: String!
  timestamp: DateTime!
  isRead: Boolean!
  actionUrl: String
  metadata: JSON
}

type ApprovalUpdate {
  type: String! # leave_request, change_request, hr_request
  itemId: ID!
  status: ApprovalStatus!
  approver: User
  timestamp: DateTime!
}
```

## Common Types and Enums

```graphql
# Enums
enum OnboardingStatus {
  PRE_HIRE
  ONBOARDING
  ACTIVE
  TERMINATED
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  BLOCKED
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  SKIPPED
  ESCALATED
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  LEFT_EARLY
  HOLIDAY
}

enum NotificationType {
  INFO
  SUCCESS
  WARNING
  ERROR
  REMINDER
}

# Scalars
scalar DateTime
scalar Date
scalar JSON

# Common input types
input DateRangeInput {
  start: Date
  end: Date
}

input PaginationInput {
  first: Int
  after: String
  last: Int
  before: String
}

input SortInput {
  field: String!
  direction: SortDirection!
}

enum SortDirection {
  ASC
  DESC
}

# Connection types for pagination
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

## Error Handling

```graphql
# Error types returned in GraphQL errors
enum ErrorCode {
  UNAUTHENTICATED
  FORBIDDEN
  VALIDATION_ERROR
  NOT_FOUND
  RATE_LIMITED
  INTERNAL_ERROR
}

# Error extensions format
{
  "errors": [
    {
      "message": "User does not have permission to access this resource",
      "extensions": {
        "code": "FORBIDDEN",
        "field": "users",
        "requiredPermission": "VIEW_ALL_USERS"
      }
    }
  ]
}
```

## Contract Validation Rules

### Authentication Requirements
- All operations except login/register require valid JWT token
- Token must not be expired or revoked
- User must be active and verified

### Authorization Rules
- User operations: HR_ADMIN or accessing own data
- Department management: HR_ADMIN only
- Approval operations: Requires APPROVE_LEAVES permission
- Personal info access: HR_ADMIN or data owner only
- Compensation data: HR_ADMIN only

### Input Validation
- Required fields must be provided and non-empty
- Email addresses must be valid format
- Dates must be valid ISO format
- IDs must be valid UUIDs
- Pagination limits: max 100 items per request

### Rate Limiting
- Authentication endpoints: 5 requests per minute per IP
- Query operations: 100 requests per minute per user
- Mutation operations: 30 requests per minute per user
- Export operations: 5 requests per hour per user

This GraphQL contract provides comprehensive API coverage for all MountainHR frontend operations while maintaining security, performance, and usability standards.