# Data Model: HR Application Feature Expansion

## Core Entities

### Employee Profile (Extended)

```typescript
interface Employee {
  // Core Identity
  id: UUID
  email: string
  displayName: string

  // Employment Details
  employeeId?: string
  jobTitle?: string
  departmentId?: UUID
  managerId?: UUID
  hireDate?: Date
  employmentType: EmploymentType
  onboardingStatus: OnboardingStatus
  isActive: boolean

  // Contact Information
  phoneNumber?: string
  workPhoneNumber?: string
  address?: Address
  emergencyContact?: EmergencyContact

  // Personal Information (PII - restricted access)
  dateOfBirth?: Date
  gender?: Gender
  nationality?: string

  // System Fields
  createdAt: DateTime
  updatedAt: DateTime
  lastLogin?: DateTime

  // Relationships
  department?: Department
  manager?: Employee
  directReports?: Employee[]
  roleAssignments?: UserRoleAssignment[]
  leaveBalances?: LeaveBalance[]
  attendanceRecords?: AttendanceRecord[]
  performanceReviews?: PerformanceReview[]
  trainingRecords?: TrainingRecord[]
  documents?: EmployeeDocument[]
}

enum EmploymentType {
  FullTime = 'FullTime'
  PartTime = 'PartTime'
  Contract = 'Contract'
  Intern = 'Intern'
  Consultant = 'Consultant'
}

enum OnboardingStatus {
  PreHire = 'PreHire'
  Onboarding = 'Onboarding'
  Active = 'Active'
  Leave = 'Leave'
  Terminated = 'Terminated'
  Alumni = 'Alumni'
}
```

### Department

```typescript
interface Department {
	id: UUID;
	name: string;
	description?: string;
	budget?: number;
	parentDepartmentId?: UUID;
	managerId?: UUID;
	isActive: boolean;

	// System Fields
	createdAt: DateTime;
	updatedAt: DateTime;

	// Relationships
	parentDepartment?: Department;
	subDepartments?: Department[];
	manager?: Employee;
	employees?: Employee[];

	// Computed Fields
	employeeCount: number;
	totalBudget: number;
}
```

### Leave Management

#### Leave Policy

```typescript
interface LeavePolicy {
  id: UUID
  name: string
  leaveType: LeaveType
  description?: string
  accrualRate?: number // Hours per pay period
  maxAccrual?: number // Maximum hours that can be accrued
  maxCarryover?: number // Maximum hours that can carry over
  requiresApproval: boolean
  advanceNoticeDays: number
  maxConsecutiveDays?: number
  isActive: boolean

  // System Fields
  createdAt: DateTime
  updatedAt: DateTime

  // Relationships
  leaveBalances?: LeaveBalance[]
  leaveRequests?: LeaveRequest[]
}

enum LeaveType {
  Vacation = 'Vacation'
  Sick = 'Sick'
  Personal = 'Personal'
  Maternity = 'Maternity'
  Paternity = 'Paternity'
  Bereavement = 'Bereavement'
  Unpaid = 'Unpaid'
}
```

#### Leave Balance

```typescript
interface LeaveBalance {
	id: UUID;
	employeeId: UUID;
	leavePolicyId: UUID;
	accruedHours: number;
	usedHours: number;
	pendingHours: number;
	availableHours: number; // Computed: accrued - used - pending
	year: number;

	// System Fields
	createdAt: DateTime;
	updatedAt: DateTime;

	// Relationships
	employee: Employee;
	leavePolicy: LeavePolicy;
}
```

#### Leave Request

```typescript
interface LeaveRequest {
  id: UUID
  employeeId: UUID
  leavePolicyId: UUID
  startDate: Date
  endDate: Date
  hoursRequested: number
  reason?: string
  status: LeaveStatus
  submittedAt: DateTime
  reviewedBy?: UUID
  reviewedAt?: DateTime
  reviewComments?: string
  cancelledAt?: DateTime
  cancelReason?: string

  // System Fields
  createdAt: DateTime
  updatedAt: DateTime

  // Relationships
  employee: Employee
  leavePolicy: LeavePolicy
  reviewer?: Employee
}

enum LeaveStatus {
  Pending = 'Pending'
  Approved = 'Approved'
  Rejected = 'Rejected'
  Cancelled = 'Cancelled'
  InProgress = 'InProgress'
  Completed = 'Completed'
}
```

### Attendance Tracking

```typescript
interface AttendanceRecord {
  id: UUID
  employeeId: UUID
  date: Date
  clockInTime?: DateTime
  clockOutTime?: DateTime
  breakStartTime?: DateTime
  breakEndTime?: DateTime
  totalHours?: number
  overtimeHours?: number
  status: AttendanceStatus
  location?: string
  ipAddress?: string
  notes?: string
  approvedBy?: UUID
  approvedAt?: DateTime

  // System Fields
  createdAt: DateTime
  updatedAt: DateTime

  // Relationships
  employee: Employee
  approver?: Employee
}

enum AttendanceStatus {
  Present = 'Present'
  Absent = 'Absent'
  Late = 'Late'
  PartialDay = 'PartialDay'
  Holiday = 'Holiday'
  Vacation = 'Vacation'
  Sick = 'Sick'
}
```

### Performance Management

#### Performance Cycle

```typescript
interface PerformanceCycle {
	id: UUID;
	name: string;
	description?: string;
	startDate: Date;
	endDate: Date;
	reviewDueDate: Date;
	isActive: boolean;

	// System Fields
	createdAt: DateTime;
	updatedAt: DateTime;

	// Relationships
	performanceReviews?: PerformanceReview[];
}
```

#### Performance Review

```typescript
interface PerformanceReview {
  id: UUID
  employeeId: UUID
  reviewerId: UUID
  cycleId?: UUID
  reviewPeriodStart: Date
  reviewPeriodEnd: Date
  overallRating?: PerformanceRating
  goalsRating?: PerformanceRating
  competenciesRating?: PerformanceRating
  selfAssessment?: string
  managerComments?: string
  employeeComments?: string
  developmentGoals?: string
  status: string
  submittedAt?: DateTime
  completedAt?: DateTime

  // System Fields
  createdAt: DateTime
  updatedAt: DateTime

  // Relationships
  employee: Employee
  reviewer: Employee
  cycle?: PerformanceCycle
  goals?: PerformanceGoal[]
}

enum PerformanceRating {
  Exceeds = 'Exceeds'
  Meets = 'Meets'
  Approaching = 'Approaching'
  Below = 'Below'
}
```

#### Performance Goal

```typescript
interface PerformanceGoal {
	id: UUID;
	employeeId: UUID;
	reviewId?: UUID;
	title: string;
	description?: string;
	targetCompletionDate?: Date;
	weight?: number; // 0-100
	status: string;
	progressPercentage: number; // 0-100
	finalRating?: PerformanceRating;
	managerNotes?: string;
	employeeNotes?: string;

	// System Fields
	createdAt: DateTime;
	updatedAt: DateTime;

	// Relationships
	employee: Employee;
	review?: PerformanceReview;
}
```

### Training & Compliance

#### Training Program

```typescript
interface TrainingProgram {
	id: UUID;
	name: string;
	description?: string;
	type: string;
	isMandatory: boolean;
	durationHours?: number;
	expiryMonths?: number; // Training expires after X months

	// System Fields
	createdAt: DateTime;
	updatedAt: DateTime;

	// Relationships
	trainingRecords?: TrainingRecord[];
}
```

#### Training Record

```typescript
interface TrainingRecord {
  id: UUID
  employeeId: UUID
  trainingProgramId: UUID
  assignedDate: Date
  dueDate?: Date
  startedDate?: Date
  completedDate?: Date
  expiryDate?: Date
  score?: number
  status: TrainingStatus
  notes?: string
  certificateUrl?: string

  // System Fields
  createdAt: DateTime
  updatedAt: DateTime

  // Relationships
  employee: Employee
  trainingProgram: TrainingProgram
}

enum TrainingStatus {
  NotStarted = 'NotStarted'
  InProgress = 'InProgress'
  Completed = 'Completed'
  Expired = 'Expired'
  Failed = 'Failed'
}
```

### Document Management

```typescript
interface EmployeeDocument {
  id: UUID
  employeeId: UUID
  uploadedBy: UUID
  title: string
  description?: string
  documentType: DocumentType
  fileName: string
  fileSizeBytes: number
  filePath: string
  mimeType?: string
  isConfidential: boolean
  expiryDate?: Date
  tags?: string[]
  version: number
  checksum?: string

  // System Fields
  createdAt: DateTime
  updatedAt: DateTime

  // Relationships
  employee: Employee
  uploader: Employee
}

enum DocumentType {
  Contract = 'Contract'
  Handbook = 'Handbook'
  Policy = 'Policy'
  Training = 'Training'
  Certificate = 'Certificate'
  Review = 'Review'
  Personal = 'Personal'
  Legal = 'Legal'
  Other = 'Other'
}
```

### Compliance

```typescript
interface PolicyAcknowledgment {
	id: UUID;
	employeeId: UUID;
	policyName: string;
	policyVersion: string;
	acknowledgedAt: DateTime;
	ipAddress?: string;
	digitalSignature?: string;
	expiresAt?: DateTime;

	// System Fields
	createdAt: DateTime;

	// Relationships
	employee: Employee;
}
```

## Data Relationships

### Primary Relationships

- Employee → Department (many-to-one)
- Employee → Manager (many-to-one, self-referential)
- Department → Parent Department (many-to-one, self-referential)
- LeaveRequest → Employee (many-to-one)
- LeaveRequest → LeavePolicy (many-to-one)
- AttendanceRecord → Employee (many-to-one)
- PerformanceReview → Employee (many-to-one)
- PerformanceReview → Reviewer/Employee (many-to-one)

### Data Constraints

#### Business Rules

- Employee can only have one active role assignment per time period
- Leave requests cannot exceed available leave balance
- Attendance records must be unique per employee per date
- Performance reviews require both employee and reviewer
- Training records track completion status and expiry
- Documents maintain version history and audit trails

#### Validation Rules

- Email addresses must be unique and valid format
- Dates must be logically consistent (start < end dates)
- Numeric values must be non-negative where applicable
- Enum values must match defined constants
- Required fields cannot be null/empty

#### Security Constraints

- PII data requires elevated permissions to access
- Compensation data restricted to HR and Finance roles
- Performance data visible to employee, manager, and HR
- Document access based on confidentiality flags
- Audit trails cannot be modified or deleted

## State Transitions

### Employee Lifecycle

PreHire → Onboarding → Active → Leave → Active
Active → Terminated → Alumni

### Leave Request Workflow

Pending → Approved/Rejected
Approved → InProgress → Completed
Approved/Pending → Cancelled

### Training Status Flow

NotStarted → InProgress → Completed
Completed → Expired (time-based)
InProgress → Failed (score-based)

### Performance Review Cycle

Draft → Submitted → Completed
Completed → Archived (cycle-based)

## Indexing Strategy

### Performance Indexes

- Employee: email, isActive, departmentId, managerId
- LeaveRequest: employeeId, status, dates
- AttendanceRecord: employeeId, date
- PerformanceReview: employeeId, reviewerId, cycle
- TrainingRecord: employeeId, status, dueDate

### Search Indexes

- Full-text search on employee names and emails
- Department hierarchy for organizational queries
- Date ranges for reporting and analytics
- Status-based filtering for workflow management
