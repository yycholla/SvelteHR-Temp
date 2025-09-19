// HR Entities TypeScript Interfaces
// Generated from data model specification for HR Application Feature Expansion

export type UUID = string;
export type DateTime = string; // ISO 8601 datetime string
export type Date = string; // ISO 8601 date string

// Employment Type enum
export enum EmploymentType {
	FullTime = 'FullTime',
	PartTime = 'PartTime',
	Contract = 'Contract',
	Intern = 'Intern',
	Consultant = 'Consultant'
}

// Onboarding Status enum
export enum OnboardingStatus {
	PreHire = 'PreHire',
	Onboarding = 'Onboarding',
	Active = 'Active',
	Leave = 'Leave',
	Terminated = 'Terminated',
	Alumni = 'Alumni'
}

// Leave Type enum
export enum LeaveType {
	Vacation = 'Vacation',
	Sick = 'Sick',
	Personal = 'Personal',
	Maternity = 'Maternity',
	Paternity = 'Paternity',
	Bereavement = 'Bereavement',
	Unpaid = 'Unpaid'
}

// Leave Status enum
export enum LeaveStatus {
	Pending = 'Pending',
	Approved = 'Approved',
	Rejected = 'Rejected',
	Cancelled = 'Cancelled',
	InProgress = 'InProgress',
	Completed = 'Completed'
}

// Attendance Status enum
export enum AttendanceStatus {
	Present = 'Present',
	Absent = 'Absent',
	Late = 'Late',
	PartialDay = 'PartialDay',
	Holiday = 'Holiday',
	Vacation = 'Vacation',
	Sick = 'Sick'
}

// Performance Rating enum
export enum PerformanceRating {
	Exceeds = 'Exceeds',
	Meets = 'Meets',
	Approaching = 'Approaching',
	Below = 'Below'
}

// Training Status enum
export enum TrainingStatus {
	NotStarted = 'NotStarted',
	InProgress = 'InProgress',
	Completed = 'Completed',
	Expired = 'Expired',
	Failed = 'Failed'
}

// Document Type enum
export enum DocumentType {
	Contract = 'Contract',
	Handbook = 'Handbook',
	Policy = 'Policy',
	Training = 'Training',
	Certificate = 'Certificate',
	Review = 'Review',
	Personal = 'Personal',
	Legal = 'Legal',
	Other = 'Other'
}

// Address interface
export interface Address {
	line1: string;
	line2?: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
}

// Emergency Contact interface
export interface EmergencyContact {
	name: string;
	phone: string;
	relationship: string;
}

// Geolocation interface
export interface Geolocation {
	latitude: number;
	longitude: number;
}

// Employee Profile (Extended)
export interface Employee {
	// Core Identity
	id: UUID;
	email: string;
	displayName: string;

	// Employment Details
	employeeId?: string;
	jobTitle?: string;
	departmentId?: UUID;
	managerId?: UUID;
	hireDate?: Date;
	employmentType: EmploymentType;
	onboardingStatus: OnboardingStatus;
	isActive: boolean;

	// Contact Information
	phoneNumber?: string;
	workPhoneNumber?: string;
	addressLine1?: string;
	addressLine2?: string;
	addressCity?: string;
	addressState?: string;
	addressPostalCode?: string;
	addressCountry?: string;
	emergencyContactName?: string;
	emergencyContactPhone?: string;
	emergencyContactRelationship?: string;

	// Personal Information (PII - restricted access)
	dateOfBirth?: Date;
	gender?: string;
	nationality?: string;

	// System Fields
	createdAt: DateTime;
	updatedAt: DateTime;
	lastLogin?: DateTime;

	// Relationships (optional for GraphQL responses)
	department?: Department;
	manager?: Employee;
	directReports?: Employee[];
	roleAssignments?: UserRoleAssignment[];
	leaveBalances?: LeaveBalance[];
	attendanceRecords?: AttendanceRecord[];
	performanceReviews?: PerformanceReview[];
	trainingRecords?: TrainingRecord[];
	documents?: EmployeeDocument[];
}

// Department
export interface Department {
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
	employeeCount?: number;
	totalBudget?: number;
}

// Leave Policy
export interface LeavePolicy {
	id: UUID;
	name: string;
	leaveType: LeaveType;
	description?: string;
	accrualRate?: number; // Hours per pay period
	maxAccrual?: number; // Maximum hours that can be accrued
	maxCarryover?: number; // Maximum hours that can carry over
	requiresApproval: boolean;
	advanceNoticeDays: number;
	maxConsecutiveDays?: number;
	isActive: boolean;

	// System Fields
	createdAt: DateTime;
	updatedAt: DateTime;

	// Relationships
	leaveBalances?: LeaveBalance[];
	leaveRequests?: LeaveRequest[];
}

// Leave Balance
export interface LeaveBalance {
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

// Leave Request
export interface LeaveRequest {
	id: UUID;
	employeeId: UUID;
	leavePolicyId: UUID;
	startDate: Date;
	endDate: Date;
	hoursRequested: number;
	reason?: string;
	status: LeaveStatus;
	submittedAt: DateTime;
	reviewedBy?: UUID;
	reviewedAt?: DateTime;
	reviewComments?: string;
	cancelledAt?: DateTime;
	cancelReason?: string;

	// System Fields
	createdAt: DateTime;
	updatedAt: DateTime;

	// Relationships
	employee: Employee;
	leavePolicy: LeavePolicy;
	reviewer?: Employee;
}

// Attendance Record
export interface AttendanceRecord {
	id: UUID;
	employeeId: UUID;
	date: Date;
	clockInTime?: DateTime;
	clockOutTime?: DateTime;
	breakStartTime?: DateTime;
	breakEndTime?: DateTime;
	totalHours?: number;
	overtimeHours?: number;
	status: AttendanceStatus;
	location?: string;
	ipAddress?: string;
	latitude?: number;
	longitude?: number;
	notes?: string;
	approvedBy?: UUID;
	approvedAt?: DateTime;

	// System Fields
	createdAt: DateTime;
	updatedAt: DateTime;

	// Relationships
	employee: Employee;
	approver?: Employee;
}

// Performance Cycle
export interface PerformanceCycle {
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

	// Computed Fields
	reviewCount?: number;
}

// Performance Review
export interface PerformanceReview {
	id: UUID;
	employeeId: UUID;
	reviewerId: UUID;
	cycleId?: UUID;
	reviewPeriodStart: Date;
	reviewPeriodEnd: Date;
	overallRating?: PerformanceRating;
	goalsRating?: PerformanceRating;
	competenciesRating?: PerformanceRating;
	selfAssessment?: string;
	managerComments?: string;
	employeeComments?: string;
	developmentGoals?: string;
	status: string;
	submittedAt?: DateTime;
	completedAt?: DateTime;

	// System Fields
	createdAt: DateTime;
	updatedAt: DateTime;

	// Relationships
	employee: Employee;
	reviewer: Employee;
	cycle?: PerformanceCycle;
	goals?: PerformanceGoal[];
}

// Performance Goal
export interface PerformanceGoal {
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

// Training Program
export interface TrainingProgram {
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

	// Computed Fields
	completionRate?: number;
}

// Training Record
export interface TrainingRecord {
	id: UUID;
	employeeId: UUID;
	trainingProgramId: UUID;
	assignedDate: Date;
	dueDate?: Date;
	startedDate?: Date;
	completedDate?: Date;
	expiryDate?: Date;
	score?: number;
	status: TrainingStatus;
	notes?: string;
	certificateUrl?: string;

	// System Fields
	createdAt: DateTime;
	updatedAt: DateTime;

	// Relationships
	employee: Employee;
	trainingProgram: TrainingProgram;
}

// Employee Document
export interface EmployeeDocument {
	id: UUID;
	employeeId: UUID;
	uploadedBy: UUID;
	title: string;
	description?: string;
	documentType: DocumentType;
	fileName: string;
	fileSizeBytes: number;
	filePath: string;
	mimeType?: string;
	isConfidential: boolean;
	expiryDate?: Date;
	tags?: string[];
	version: number;
	checksum?: string;

	// System Fields
	createdAt: DateTime;
	updatedAt: DateTime;

	// Relationships
	employee: Employee;
	uploader: Employee;
}

// Policy Acknowledgment
export interface PolicyAcknowledgment {
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

// User Role Assignment (from existing system)
export interface UserRoleAssignment {
	id: UUID;
	userId: UUID;
	roleId: UUID;
	isActive: boolean;
	validFrom?: DateTime;
	validUntil?: DateTime;

	// Relationships
	user: Employee;
	role: UserRole;
}

// User Role (from existing system)
export interface UserRole {
	id: UUID;
	name: string;
	level: number;
	description?: string;
}

// GraphQL Pagination interfaces
export interface PageInfo {
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	startCursor?: string;
	endCursor?: string;
}

export interface Connection<T> {
	nodes: T[];
	totalCount: number;
	pageInfo: PageInfo;
}

// Filter interfaces for GraphQL operations
export interface EmployeeFilters {
	search?: string;
	departmentIds?: UUID[];
	roleNames?: string[];
	onboardingStatuses?: OnboardingStatus[];
	isActive?: boolean;
}

export interface DepartmentFilters {
	search?: string;
	isActive?: boolean;
	parentDepartmentId?: UUID;
}

export interface LeaveRequestFilters {
	employeeId?: UUID;
	status?: LeaveStatus[];
	startDateFrom?: Date;
	startDateTo?: Date;
	leaveType?: LeaveType[];
}

export interface AttendanceFilters {
	employeeId?: UUID;
	dateFrom?: Date;
	dateTo?: Date;
	status?: AttendanceStatus[];
}

export interface PerformanceReviewFilters {
	employeeId?: UUID;
	reviewerId?: UUID;
	cycleId?: UUID;
	status?: string[];
}

export interface TrainingProgramFilters {
	isMandatory?: boolean;
	type?: string;
}

export interface EmployeeReportFilters {
	dateFrom?: Date;
	dateTo?: Date;
	departmentIds?: UUID[];
	includeInactive?: boolean;
}

export interface AttendanceAnalyticsFilters {
	employeeIds?: UUID[];
	departmentIds?: UUID[];
	dateFrom: Date;
	dateTo: Date;
}

// Input types for mutations
export interface PaginationInput {
	first?: number;
	after?: string;
	last?: number;
	before?: string;
}

export interface CreateDepartmentInput {
	name: string;
	description?: string;
	budget?: number;
	parentDepartmentId?: UUID;
	managerId?: UUID;
}

export interface UpdateDepartmentInput {
	name?: string;
	description?: string;
	budget?: number;
	parentDepartmentId?: UUID;
	managerId?: UUID;
	isActive?: boolean;
}

export interface SubmitLeaveRequestInput {
	employeeId: UUID;
	leavePolicyId: UUID;
	startDate: Date;
	endDate: Date;
	hoursRequested: number;
	reason?: string;
}

export interface ReviewLeaveRequestInput {
	status: LeaveStatus;
	reviewComments?: string;
}

export interface ClockInInput {
	employeeId: UUID;
	location?: string;
	coordinates?: GeolocationInput;
}

export interface ClockOutInput {
	location?: string;
	coordinates?: GeolocationInput;
	notes?: string;
}

export interface GeolocationInput {
	latitude: number;
	longitude: number;
}

// Error types
export interface ValidationError {
	field: string;
	message: string;
	code?: string;
}

export interface AuthorizationError {
	message: string;
	requiredPermissions: string[];
}

export interface BusinessRuleError {
	message: string;
	rule: string;
	context?: Record<string, any>;
}

// Mutation response types
export interface MutationResponse<T> {
	data?: T;
	errors?: ValidationError[];
}

export interface DepartmentMutationResponse extends MutationResponse<Department> {}
export interface LeaveRequestMutationResponse extends MutationResponse<LeaveRequest> {}
export interface AttendanceMutationResponse extends MutationResponse<AttendanceRecord> {}

// Analytics and reporting types
export interface EmployeeReportSummary {
	totalEmployees: number;
	activeEmployees: number;
	newHiresThisMonth: number;
	terminationsThisMonth: number;
	averageTenure: number;
}

export interface DepartmentBreakdown {
	department: Department;
	employeeCount: number;
	averageSalary?: number;
	turnoverRate?: number;
}

export interface HeadcountTrend {
	month: string;
	totalEmployees: number;
	newHires: number;
	terminations: number;
}

export interface EmployeeReportData {
	summary: EmployeeReportSummary;
	departmentBreakdown: DepartmentBreakdown[];
	headcountTrends: HeadcountTrend[];
}

export interface AttendanceAnalyticsSummary {
	totalWorkingDays: number;
	averageHoursPerDay: number;
	totalOvertimeHours: number;
	attendanceRate: number;
}

export interface AttendanceTrend {
	date: Date;
	clockIns: number;
	averageHours: number;
	lateArrivals: number;
}

export interface DepartmentAttendanceStats {
	department: Department;
	attendanceRate: number;
	averageHoursPerEmployee: number;
	overtimeHours: number;
}

export interface AttendanceAnalyticsData {
	summary: AttendanceAnalyticsSummary;
	trends: AttendanceTrend[];
	departmentStats: DepartmentAttendanceStats[];
}
