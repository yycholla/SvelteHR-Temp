# GraphQL Schema Contracts

## Employee Directory Operations

### Query: Employee Directory

```graphql
query GetEmployeeDirectory($filters: EmployeeFilters, $pagination: PaginationInput) {
	employees(filters: $filters, pagination: $pagination) {
		nodes {
			id
			email
			displayName
			jobTitle
			onboardingStatus
			isActive
			hireDate
			department {
				id
				name
			}
			manager {
				id
				displayName
			}
			profileImage
		}
		totalCount
		pageInfo {
			hasNextPage
			hasPreviousPage
			startCursor
			endCursor
		}
	}
}

input EmployeeFilters {
	search: String
	departmentIds: [UUID!]
	roleNames: [String!]
	onboardingStatuses: [OnboardingStatus!]
	isActive: Boolean
}
```

### Query: Employee Profile Detail

```graphql
query GetEmployeeProfile($id: UUID!) {
	employee(id: $id) {
		id
		email
		displayName
		jobTitle
		employeeId
		onboardingStatus
		isActive
		hireDate
		employmentType
		phoneNumber
		workPhoneNumber
		address {
			line1
			line2
			city
			state
			postalCode
			country
		}
		emergencyContact {
			name
			phone
			relationship
		}
		department {
			id
			name
			budget
		}
		manager {
			id
			displayName
			email
		}
		directReports {
			id
			displayName
			jobTitle
		}
		roleAssignments {
			role {
				name
				level
				description
			}
			isActive
			validFrom
			validUntil
		}
	}
}
```

## Department Management Operations

### Query: Department List

```graphql
query GetDepartments($filters: DepartmentFilters) {
	departments(filters: $filters) {
		nodes {
			id
			name
			description
			budget
			isActive
			parentDepartment {
				id
				name
			}
			manager {
				id
				displayName
			}
			employeeCount
			subDepartments {
				id
				name
				employeeCount
			}
			createdAt
			updatedAt
		}
		totalCount
	}
}

input DepartmentFilters {
	search: String
	isActive: Boolean
	parentDepartmentId: UUID
}
```

### Mutation: Create Department

```graphql
mutation CreateDepartment($input: CreateDepartmentInput!) {
	createDepartment(input: $input) {
		department {
			id
			name
			description
			budget
			parentDepartmentId
			managerId
			isActive
			createdAt
		}
		errors {
			field
			message
		}
	}
}

input CreateDepartmentInput {
	name: String!
	description: String
	budget: Float
	parentDepartmentId: UUID
	managerId: UUID
}
```

### Mutation: Update Department

```graphql
mutation UpdateDepartment($id: UUID!, $input: UpdateDepartmentInput!) {
	updateDepartment(id: $id, input: $input) {
		department {
			id
			name
			description
			budget
			updatedAt
		}
		errors {
			field
			message
		}
	}
}

input UpdateDepartmentInput {
	name: String
	description: String
	budget: Float
	parentDepartmentId: UUID
	managerId: UUID
	isActive: Boolean
}
```

## Leave Management Operations

### Query: Leave Policies

```graphql
query GetLeavePolicies {
	leavePolicies {
		nodes {
			id
			name
			leaveType
			description
			accrualRate
			maxAccrual
			maxCarryover
			requiresApproval
			advanceNoticeDays
			maxConsecutiveDays
			isActive
		}
	}
}
```

### Query: Employee Leave Balances

```graphql
query GetEmployeeLeaveBalances($employeeId: UUID!, $year: Int) {
	leaveBalances(employeeId: $employeeId, year: $year) {
		nodes {
			id
			accruedHours
			usedHours
			pendingHours
			availableHours
			year
			leavePolicy {
				id
				name
				leaveType
				maxAccrual
			}
		}
	}
}
```

### Query: Leave Requests

```graphql
query GetLeaveRequests($filters: LeaveRequestFilters, $pagination: PaginationInput) {
	leaveRequests(filters: $filters, pagination: $pagination) {
		nodes {
			id
			startDate
			endDate
			hoursRequested
			reason
			status
			submittedAt
			reviewedAt
			reviewComments
			employee {
				id
				displayName
				email
			}
			leavePolicy {
				id
				name
				leaveType
			}
			reviewer {
				id
				displayName
			}
		}
		totalCount
	}
}

input LeaveRequestFilters {
	employeeId: UUID
	status: [LeaveStatus!]
	startDateFrom: Date
	startDateTo: Date
	leaveType: [LeaveType!]
}
```

### Mutation: Submit Leave Request

```graphql
mutation SubmitLeaveRequest($input: SubmitLeaveRequestInput!) {
	submitLeaveRequest(input: $input) {
		leaveRequest {
			id
			startDate
			endDate
			hoursRequested
			status
			submittedAt
		}
		errors {
			field
			message
		}
	}
}

input SubmitLeaveRequestInput {
	employeeId: UUID!
	leavePolicyId: UUID!
	startDate: Date!
	endDate: Date!
	hoursRequested: Float!
	reason: String
}
```

### Mutation: Review Leave Request

```graphql
mutation ReviewLeaveRequest($id: UUID!, $input: ReviewLeaveRequestInput!) {
	reviewLeaveRequest(id: $id, input: $input) {
		leaveRequest {
			id
			status
			reviewedAt
			reviewComments
		}
		errors {
			field
			message
		}
	}
}

input ReviewLeaveRequestInput {
	status: LeaveStatus!
	reviewComments: String
}
```

## Attendance Tracking Operations

### Query: Attendance Records

```graphql
query GetAttendanceRecords($filters: AttendanceFilters, $pagination: PaginationInput) {
	attendanceRecords(filters: $filters, pagination: $pagination) {
		nodes {
			id
			date
			clockInTime
			clockOutTime
			breakStartTime
			breakEndTime
			totalHours
			overtimeHours
			status
			location
			notes
			employee {
				id
				displayName
			}
		}
		totalCount
	}
}

input AttendanceFilters {
	employeeId: UUID
	dateFrom: Date
	dateTo: Date
	status: [AttendanceStatus!]
}
```

### Mutation: Clock In

```graphql
mutation ClockIn($input: ClockInInput!) {
	clockIn(input: $input) {
		attendanceRecord {
			id
			date
			clockInTime
			status
			location
		}
		errors {
			field
			message
		}
	}
}

input ClockInInput {
	employeeId: UUID!
	location: String
	coordinates: GeolocationInput
}

input GeolocationInput {
	latitude: Float!
	longitude: Float!
}
```

### Mutation: Clock Out

```graphql
mutation ClockOut($attendanceRecordId: UUID!, $input: ClockOutInput!) {
	clockOut(attendanceRecordId: $attendanceRecordId, input: $input) {
		attendanceRecord {
			id
			clockOutTime
			totalHours
			overtimeHours
			status
		}
		errors {
			field
			message
		}
	}
}

input ClockOutInput {
	location: String
	coordinates: GeolocationInput
	notes: String
}
```

## Performance Management Operations

### Query: Performance Cycles

```graphql
query GetPerformanceCycles($isActive: Boolean) {
	performanceCycles(isActive: $isActive) {
		nodes {
			id
			name
			description
			startDate
			endDate
			reviewDueDate
			isActive
			reviewCount
		}
	}
}
```

### Query: Performance Reviews

```graphql
query GetPerformanceReviews($filters: PerformanceReviewFilters) {
	performanceReviews(filters: $filters) {
		nodes {
			id
			reviewPeriodStart
			reviewPeriodEnd
			overallRating
			goalsRating
			competenciesRating
			status
			submittedAt
			completedAt
			employee {
				id
				displayName
				jobTitle
			}
			reviewer {
				id
				displayName
			}
			cycle {
				id
				name
			}
			goals {
				id
				title
				status
				progressPercentage
				finalRating
			}
		}
	}
}

input PerformanceReviewFilters {
	employeeId: UUID
	reviewerId: UUID
	cycleId: UUID
	status: [String!]
}
```

## Training & Compliance Operations

### Query: Training Programs

```graphql
query GetTrainingPrograms($filters: TrainingProgramFilters) {
	trainingPrograms(filters: $filters) {
		nodes {
			id
			name
			description
			type
			isMandatory
			durationHours
			expiryMonths
			completionRate
		}
	}
}

input TrainingProgramFilters {
	isMandatory: Boolean
	type: String
}
```

### Query: Employee Training Records

```graphql
query GetEmployeeTrainingRecords($employeeId: UUID!) {
	trainingRecords(employeeId: $employeeId) {
		nodes {
			id
			assignedDate
			dueDate
			startedDate
			completedDate
			expiryDate
			score
			status
			certificateUrl
			trainingProgram {
				id
				name
				type
				isMandatory
				durationHours
			}
		}
	}
}
```

## Reporting Operations

### Query: Employee Report Data

```graphql
query GetEmployeeReportData($filters: EmployeeReportFilters) {
	employeeReports(filters: $filters) {
		summary {
			totalEmployees
			activeEmployees
			newHiresThisMonth
			terminationsThisMonth
			averageTenure
		}
		departmentBreakdown {
			department {
				id
				name
			}
			employeeCount
			averageSalary
			turnoverRate
		}
		headcountTrends {
			month
			totalEmployees
			newHires
			terminations
		}
	}
}

input EmployeeReportFilters {
	dateFrom: Date
	dateTo: Date
	departmentIds: [UUID!]
	includeInactive: Boolean
}
```

### Query: Attendance Analytics

```graphql
query GetAttendanceAnalytics($filters: AttendanceAnalyticsFilters) {
	attendanceAnalytics(filters: $filters) {
		summary {
			totalWorkingDays
			averageHoursPerDay
			totalOvertimeHours
			attendanceRate
		}
		trends {
			date
			clockIns
			averageHours
			lateArrivals
		}
		departmentStats {
			department {
				id
				name
			}
			attendanceRate
			averageHoursPerEmployee
			overtimeHours
		}
	}
}

input AttendanceAnalyticsFilters {
	employeeIds: [UUID!]
	departmentIds: [UUID!]
	dateFrom: Date!
	dateTo: Date!
}
```

## Error Types

```graphql
type ValidationError {
	field: String!
	message: String!
	code: String
}

type AuthorizationError {
	message: String!
	requiredPermissions: [String!]
}

type BusinessRuleError {
	message: String!
	rule: String!
	context: JSON
}
```

## Enums

```graphql
enum OnboardingStatus {
	PRE_HIRE
	ONBOARDING
	ACTIVE
	LEAVE
	TERMINATED
	ALUMNI
}

enum EmploymentType {
	FULL_TIME
	PART_TIME
	CONTRACT
	INTERN
	CONSULTANT
}

enum LeaveType {
	VACATION
	SICK
	PERSONAL
	MATERNITY
	PATERNITY
	BEREAVEMENT
	UNPAID
}

enum LeaveStatus {
	PENDING
	APPROVED
	REJECTED
	CANCELLED
	IN_PROGRESS
	COMPLETED
}

enum AttendanceStatus {
	PRESENT
	ABSENT
	LATE
	PARTIAL_DAY
	HOLIDAY
	VACATION
	SICK
}

enum PerformanceRating {
	EXCEEDS
	MEETS
	APPROACHING
	BELOW
}

enum TrainingStatus {
	NOT_STARTED
	IN_PROGRESS
	COMPLETED
	EXPIRED
	FAILED
}

enum DocumentType {
	CONTRACT
	HANDBOOK
	POLICY
	TRAINING
	CERTIFICATE
	REVIEW
	PERSONAL
	LEGAL
	OTHER
}
```
