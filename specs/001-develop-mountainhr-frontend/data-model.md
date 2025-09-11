# Data Model: MountainHR Frontend

**Date**: 2025-09-10  
**Feature**: MountainHR Frontend Development  
**Source**: Existing GelDB schema analysis + frontend requirements

## Overview

This data model defines the TypeScript interfaces and GraphQL types for the MountainHR frontend, mapping directly to the existing GelDB schema while providing frontend-optimized structures for UI components and business logic.

## Core Entities

### 1. User Management (rbac module)

```typescript
// Core user entity combining authentication and HR data
interface User {
  id: string; // UUID
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  onboardingStatus: OnboardingStatus;
  jobTitle?: string;
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: Date;
  
  // Computed properties
  fullName?: string;
  displayName: string;
  searchName: string;
  isManager: boolean;
  directReportCount: number;
  managementLevel: number;
  
  // Related data
  manager?: User;
  directReports?: User[];
  roles: Role[];
  department?: Department;
  contactInfo?: ContactInformation;
  personalInfo?: PersonalInformation;
  jobInfo?: JobInformation;
  compensation?: Compensation;
}

interface Role {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  level: number;
  isSystem: boolean;
  parentRole?: Role;
  permissions: Permission[];
  userCount: number;
  permissionCount: number;
}

interface Permission {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  resource: string;
  action: string;
  scope?: string;
  isSystem: boolean;
}

interface UserRole {
  id: string;
  user: User;
  role: Role;
  grantedBy?: User;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
}
```

### 2. Employee Information (default module)

```typescript
interface Department {
  id: string;
  name: string;
  description?: string;
  budget?: number;
  isActive: boolean;
  parentDepartment?: Department;
  manager?: User;
  
  // Computed properties
  employeeCount: number;
  subdepartmentCount: number;
  activeEmployeeCount: number;
  departmentHierarchy: string;
  budgetPerEmployee?: number;
  
  // Related data
  subdepartments?: Department[];
  employees?: User[];
}

interface ContactInformation {
  id: string;
  employee: User;
  email?: string;
  phoneNumber?: string;
  workPhoneNumber?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PersonalInformation {
  id: string;
  employee: User;
  dateOfBirth?: Date;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  socialSecurityNumber?: string; // Encrypted
  passportNumber?: string;
  driversLicenseNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface JobInformation {
  id: string;
  employee: User;
  department?: Department;
  jobTitle?: string;
  hireDate?: Date;
  employmentType?: string;
  workLocation?: string;
  workSchedule?: string;
  manager?: User;
  terminationDate?: Date;
  isRemote: boolean;
  
  // Computed properties
  isCurrentEmployee: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

interface Compensation {
  id: string;
  employee: User;
  payType?: PayType;
  payRate?: number;
  currency: string;
  bankName?: string;
  bankAccountType?: BankAccountType;
  bankAccountNumber?: string; // Encrypted
  bankRoutingNumber?: string; // Encrypted
  directDepositEnabled: boolean;
  salaryReviewDate?: Date;
  bonusEligible: boolean;
  overtimeEligible: boolean;
  
  // Computed properties
  annualSalary?: number;
  payFrequency: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. HR Workflows (hr_workflows module)

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: string;
  dueDate?: Date;
  completionDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  
  // Relationships
  assignedTo: User;
  createdBy?: User;
  parentTask?: Task;
  subtasks?: Task[];
  dependencies?: Task[];
  
  // Computed properties
  completionPercentage: number;
  
  createdAt: Date;
  updatedAt: Date;
}

interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  defaultPriority: string;
  estimatedHours?: number;
  daysToComplete?: number;
  defaultAssignee?: User;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface LeaveBalance {
  id: string;
  employee: User;
  leaveType: string; // Vacation, Sick, Personal, etc.
  balance: number;
  accruedYtd: number;
  usedYtd: number;
  carryOverLimit?: number;
  accrualRate?: number;
  lastUpdated?: Date;
  
  // Computed properties
  availableBalance: number;
  projectedBalance: number;
  
  createdAt: Date;
  updatedAt: Date;
}

interface Leave {
  id: string;
  leaveBalance: LeaveBalance;
  startDate: Date;
  endDate: Date;
  status: ApprovalStatus;
  reason?: string;
  daysRequested?: number;
  approver?: User;
  approvedAt?: Date;
  comments?: string;
  isEmergency: boolean;
  
  // Computed properties
  isPending: boolean;
  isApproved: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

interface Attendance {
  id: string;
  employee: User;
  date: Date;
  status: AttendanceStatus;
  clockInTime?: string; // Time format
  clockOutTime?: string; // Time format
  breakDuration?: string; // Duration format
  totalHours?: number;
  overtimeHours?: number;
  approvalStatus: ApprovalStatus;
  approvedBy?: User;
  notes?: string;
  
  // Computed properties
  isLate: boolean;
  leftEarly: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

interface TimeEntry {
  id: string;
  attendance: Attendance;
  entryType: TimeEntryType;
  timestamp: Date;
  location?: string;
  ipAddress?: string;
  deviceInfo?: string;
  notes?: string;
  
  // Computed properties
  date: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

interface HRRequest {
  id: string;
  employee: User;
  requestType: string;
  subject: string;
  description: string;
  status: ApprovalStatus;
  priority: string;
  assignedToUser?: User;
  resolution?: string;
  resolvedAt?: Date;
  
  // Computed properties
  isResolved: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

interface ChangeRequest {
  id: string;
  employee: User;
  changeType: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  status: ApprovalStatus;
  reviewedBy?: User;
  reviewedAt?: Date;
  reason?: string;
  supportingDocuments?: any; // JSON
  
  // Computed properties
  isPending: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 4. Authentication & Sessions (default module)

```typescript
interface AuthSession {
  id: string;
  user: User;
  tokenHash: string;
  expiresAt: Date;
  refreshTokenHash?: string;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface OAuthConnection {
  id: string;
  user: User;
  provider: string;
  providerUserId: string;
  providerEmail?: string;
  providerName?: string;
  accessTokenHash?: string;
  refreshTokenHash?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Enumerated Types

```typescript
enum OnboardingStatus {
  PreHire = 'PreHire',
  Onboarding = 'Onboarding', 
  Active = 'Active',
  Terminated = 'Terminated'
}

enum TaskStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Blocked = 'Blocked'
}

enum ApprovalStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Skipped = 'Skipped',
  Escalated = 'Escalated'
}

enum AttendanceStatus {
  Present = 'Present',
  Absent = 'Absent',
  Late = 'Late',
  LeftEarly = 'LeftEarly',
  Holiday = 'Holiday'
}

enum TimeEntryType {
  ClockIn = 'ClockIn',
  ClockOut = 'ClockOut',
  BreakStart = 'BreakStart',
  BreakEnd = 'BreakEnd'
}

enum PayType {
  Hourly = 'Hourly',
  Salary = 'Salary',
  Commission = 'Commission',
  Contractor = 'Contractor'
}

enum BankAccountType {
  Checking = 'Checking',
  Savings = 'Savings'
}

enum NotificationType {
  Info = 'Info',
  Success = 'Success',
  Warning = 'Warning',
  Error = 'Error',
  Reminder = 'Reminder'
}
```

## Frontend-Specific Models

### UI State Models

```typescript
interface DashboardData {
  user: User;
  upcomingTasks: Task[];
  pendingApprovals: (Leave | ChangeRequest | HRRequest)[];
  recentActivity: ActivityItem[];
  teamMetrics?: TeamMetrics;
  notifications: Notification[];
}

interface TeamMetrics {
  totalEmployees: number;
  activeEmployees: number;
  pendingOnboarding: number;
  pendingTerminations: number;
  departmentBreakdown: DepartmentCount[];
  recentHires: User[];
  upcomingReviews: ReviewItem[];
}

interface ActivityItem {
  id: string;
  type: 'task_completed' | 'leave_approved' | 'user_onboarded' | 'profile_updated';
  user: User;
  description: string;
  timestamp: Date;
  metadata?: any;
}

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
}
```

### Form Models

```typescript
interface CreateTaskInput {
  title: string;
  description?: string;
  priority: string;
  assignedToId: string;
  dueDate?: string;
  parentTaskId?: string;
  dependencyIds?: string[];
  estimatedHours?: number;
}

interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  jobTitle?: string;
  departmentId?: string;
  managerId?: string;
  isActive?: boolean;
}

interface LeaveRequestInput {
  leaveBalanceId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  isEmergency: boolean;
}

interface ChangeRequestInput {
  changeType: string;
  fieldName: string;
  newValue: string;
  reason?: string;
  supportingDocuments?: File[];
}
```

### Filter and Search Models

```typescript
interface UserFilter {
  search?: string;
  departmentId?: string;
  onboardingStatus?: OnboardingStatus[];
  isActive?: boolean;
  roles?: string[];
  managerId?: string;
  isManager?: boolean;
  dateRange?: DateRange;
}

interface TaskFilter {
  assignedToId?: string;
  status?: TaskStatus[];
  priority?: string[];
  dueDateRange?: DateRange;
  createdByIds?: string[];
  hasParent?: boolean;
}

interface DateRange {
  start?: Date;
  end?: Date;
}

interface PaginationInput {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

interface SortInput {
  field: string;
  direction: 'ASC' | 'DESC';
}
```

## State Transitions

### User Onboarding Flow
```
PreHire → Onboarding → Active → Terminated
```

### Task Lifecycle
```
Pending → InProgress → (Completed | Blocked)
         ↓
    (Back to Pending from Blocked)
```

### Approval Workflows
```
Pending → (Approved | Rejected | Escalated)
       → Skipped (admin override)
```

## Validation Rules

### User Validation
- Username: 3-50 characters, alphanumeric + underscore
- Email: Valid email format, unique across system
- Employee ID: Unique, alphanumeric, optional
- First/Last Name: 1-100 characters when provided

### Task Validation
- Title: 1-200 characters, required
- Description: Max 2000 characters
- Due date: Must be future date
- Estimated hours: Positive number, max 1000

### Leave Request Validation  
- Start date: Cannot be in past (except emergency)
- End date: Must be >= start date
- Duration: Max 365 days per request
- Balance check: Must have sufficient available balance

### Contact Information Validation
- Phone numbers: E.164 format validation
- Email: Valid format, unique if provided
- Address: Standard postal format validation

## Performance Considerations

### Computed Properties
- All computed properties are calculated in GraphQL resolvers
- Frontend caches computed values to reduce recalculation
- Pagination for large datasets (users, tasks, attendance records)

### Caching Strategy
- User data: 5-minute cache TTL
- Organizational structure: 15-minute cache TTL  
- Attendance/time data: 2-minute cache TTL
- Reports and analytics: 10-minute cache TTL

### Optimistic Updates
- Task status changes: Immediate UI update with rollback on error
- Leave requests: Show as "pending" immediately
- Profile updates: Show changes with loading state

This data model provides a comprehensive foundation for the MountainHR frontend while maintaining alignment with the existing GelDB schema structure and supporting all required HR workflow operations.