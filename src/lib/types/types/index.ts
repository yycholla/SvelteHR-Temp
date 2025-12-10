/**
 * Core Type Definitions for SvelteHR
 *
 * Centralized TypeScript interfaces and types for the HR management system.
 * These types align with the Hasura GraphQL schema and provide type safety across
 * the frontend application.
 */

// Re-export generated types from GraphQL Code Generator
export * from '../generated/types';

// =============================================================================
// Hasura-aligned Entity Types
// =============================================================================

export interface User {
	id: string;
	email: string;
	display_name: string;
	onboarding_status: 'PreHire' | 'Onboarding' | 'Active' | 'Terminated';
	job_title?: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	role_assignments?: Array<{
		role: {
			id: string;
			name: string;
			level: number;
			description?: string;
		};
	}>;
}

export interface UserFilter {
	isActive?: boolean;
	onboardingStatus?: string[];
	departmentId?: string;
	roleId?: string;
	searchQuery?: string;
	hireDate?: {
		start?: string;
		end?: string;
	};
}

export interface Role {
	id: string;
	name: string;
	description?: string;
	permissions: Permission[];
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface Permission {
	id: string;
	name: string;
	resource: string;
	action: string;
	scope: string;
	description?: string;
}

export interface Department {
	id: string;
	name: string;
	code: string;
	description?: string;
	parentDepartment?: Department;
	childDepartments: Department[];
	manager?: User;
	employees: User[];
	employeeCount: number;
	budget?: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface Task {
	id: string;
	title: string;
	description?: string;
	status: TaskStatus;
	priority: TaskPriority;
	assignedTo?: User;
	createdBy: User;
	parentTask?: Task;
	subtasks: Task[];
	dependencies: Task[];
	dueDate?: string;
	completionDate?: string;
	estimatedHours?: number;
	actualHours?: number;
	completionPercentage: number;
	isOverdue: boolean;
	attachments: Attachment[];
	comments: TaskComment[];
	createdAt: string;
	updatedAt: string;
}

export interface TaskComment {
	id: string;
	content: string;
	author: User;
	task: Task;
	createdAt: string;
	updatedAt: string;
}

export interface LeaveRequest {
	id: string;
	requestNumber: string;
	employee: User;
	leaveType: LeaveType;
	startDate: string;
	endDate: string;
	totalDays: number;
	reason: string;
	status: ApprovalStatus;
	urgency: RequestUrgency;
	isEmergency: boolean;
	emergencyContact?: EmergencyContact;
	submittedAt: string;
	approvedAt?: string;
	approver?: User;
	rejectedAt?: string;
	rejectedBy?: User;
	rejectionReason?: string;
	approvalWorkflow: ApprovalWorkflow;
	medicalCertificateRequired: boolean;
	attachments: Attachment[];
}

export interface LeaveBalance {
	id: string;
	employee: User;
	leaveType: LeaveType;
	totalDaysAllocated: number;
	daysUsed: number;
	daysRemaining: number;
	daysCarriedOver: number;
	accruedThisYear: number;
	lastAccrualDate?: string;
	expirationDate?: string;
}

export interface LeaveType {
	id: string;
	name: string;
	code: string;
	maxDaysPerYear: number;
	carryOverLimit: number;
	requiresApproval: boolean;
	allowsNegativeBalance: boolean;
	description?: string;
	isActive: boolean;
}

export interface AttendanceRecord {
	id: string;
	employee: User;
	date: string;
	clockInTime?: string;
	clockOutTime?: string;
	totalHours: number;
	regularHours: number;
	overtimeHours: number;
	breakDuration: number;
	status: AttendanceStatus;
	tardiness: number;
	earlyDeparture: number;
	workLocation: WorkLocation;
	notes?: string;
	approver?: User;
	adjustments: AttendanceAdjustment[];
}

export interface AttendanceAdjustment {
	id: string;
	originalClockIn?: string;
	originalClockOut?: string;
	adjustedClockIn?: string;
	adjustedClockOut?: string;
	reason: string;
	adjustedBy: User;
	adjustmentTime: string;
	approved: boolean;
	approver?: User;
}

export interface HRRequest {
	id: string;
	requestNumber: string;
	requestType: HRRequestType;
	employee: User;
	title: string;
	description: string;
	priority: RequestPriority;
	status: ApprovalStatus;
	requestData: Record<string, any>;
	attachments: Attachment[];
	submittedAt: string;
	dueDate?: string;
	isOverdue: boolean;
	approvalWorkflow: ApprovalWorkflow;
	completedAt?: string;
	timeline: RequestTimeline[];
}

export interface HRRequestType {
	id: string;
	name: string;
	category: HRRequestCategory;
	description?: string;
	approvalLevels: number;
	requiredFields: RequestField[];
	estimatedProcessingTime: number;
	isActive: boolean;
}

export interface RequestField {
	name: string;
	type: FieldType;
	label: string;
	required: boolean;
	validation?: string;
	options?: string[];
}

export interface ApprovalWorkflow {
	id: string;
	currentLevel: number;
	totalLevels: number;
	approvers: WorkflowApprover[];
	isComplete: boolean;
}

export interface WorkflowApprover {
	id: string;
	user: User;
	role: string;
	order: number;
	status: ApprovalStatus;
	approvedAt?: string;
	comments?: string;
	conditions?: string;
}

export interface RequestTimeline {
	id: string;
	step: string;
	status: string;
	actor: User;
	timestamp: string;
	comments?: string;
	duration: number;
	attachments: Attachment[];
}

export interface Attachment {
	id: string;
	filename: string;
	originalFilename: string;
	fileType: string;
	fileSize: number;
	url: string;
	uploadedBy: User;
	uploadedAt: string;
	virusScanStatus: VirusScanStatus;
	isPublic: boolean;
}

// =============================================================================
// Nested Object Types
// =============================================================================

export interface JobInfo {
	title: string;
	hireDate: string;
	employmentType: EmploymentType;
	isRemote: boolean;
	workSchedule?: WorkSchedule;
	managerId?: string;
	salary?: number;
	payType?: string;
}

export interface ContactInfo {
	phoneNumber?: string;
	addressStreet?: string;
	addressCity?: string;
	addressState?: string;
	addressZipCode?: string;
	emergencyContactName?: string;
	emergencyContactPhone?: string;
	emergencyContactRelationship?: string;
}

export interface PersonalInfo {
	dateOfBirth?: string;
	socialSecurityNumber?: string;
	maritalStatus?: MaritalStatus;
	dependents?: number;
	pronouns?: string;
}

export interface Compensation {
	payRate: number;
	payType: PayType;
	annualSalary: number;
	currency: string;
	lastReviewDate?: string;
	nextReviewDate?: string;
}

export interface WorkSchedule {
	id: string;
	name: string;
	startTime: string;
	endTime: string;
	workDays: DayOfWeek[];
	hoursPerDay: number;
	workDaysPerWeek: number;
	flexibleHours: boolean;
	breaks: ScheduleBreak[];
}

export interface ScheduleBreak {
	name: string;
	startTime: string;
	duration: number;
	isPaid: boolean;
}

export interface EmergencyContact {
	name: string;
	phone: string;
	relationship: string;
	isPrimary: boolean;
}

// =============================================================================
// Enum Types
// =============================================================================

export enum OnboardingStatus {
	NOT_STARTED = 'NOT_STARTED',
	IN_PROGRESS = 'IN_PROGRESS',
	COMPLETED = 'COMPLETED',
	ON_HOLD = 'ON_HOLD'
}

export enum TaskStatus {
	PENDING = 'PENDING',
	IN_PROGRESS = 'IN_PROGRESS',
	COMPLETED = 'COMPLETED',
	ON_HOLD = 'ON_HOLD',
	CANCELLED = 'CANCELLED'
}

export enum TaskPriority {
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
	URGENT = 'URGENT'
}

export enum ApprovalStatus {
	SUBMITTED = 'SUBMITTED',
	PENDING = 'PENDING',
	IN_REVIEW = 'IN_REVIEW',
	MANAGER_APPROVED = 'MANAGER_APPROVED',
	HR_APPROVED = 'HR_APPROVED',
	APPROVED = 'APPROVED',
	REJECTED = 'REJECTED',
	CANCELLED = 'CANCELLED',
	ON_HOLD = 'ON_HOLD'
}

export enum RequestUrgency {
	LOW = 'LOW',
	NORMAL = 'NORMAL',
	HIGH = 'HIGH',
	URGENT = 'URGENT',
	EMERGENCY = 'EMERGENCY'
}

export enum RequestPriority {
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
	URGENT = 'URGENT'
}

export enum AttendanceStatus {
	PRESENT = 'PRESENT',
	ABSENT = 'ABSENT',
	LATE = 'LATE',
	EARLY_DEPARTURE = 'EARLY_DEPARTURE',
	PARTIAL_DAY = 'PARTIAL_DAY',
	ON_LEAVE = 'ON_LEAVE',
	HOLIDAY = 'HOLIDAY'
}

export enum WorkLocation {
	OFFICE = 'OFFICE',
	REMOTE = 'REMOTE',
	HYBRID = 'HYBRID',
	FIELD = 'FIELD',
	CLIENT_SITE = 'CLIENT_SITE'
}

export enum EmploymentType {
	FULL_TIME = 'FULL_TIME',
	PART_TIME = 'PART_TIME',
	CONTRACT = 'CONTRACT',
	INTERN = 'INTERN',
	TEMPORARY = 'TEMPORARY'
}

export enum MaritalStatus {
	SINGLE = 'SINGLE',
	MARRIED = 'MARRIED',
	DIVORCED = 'DIVORCED',
	WIDOWED = 'WIDOWED',
	SEPARATED = 'SEPARATED'
}

export enum PayType {
	HOURLY = 'HOURLY',
	SALARY = 'SALARY',
	COMMISSION = 'COMMISSION',
	CONTRACT = 'CONTRACT'
}

export enum DayOfWeek {
	MONDAY = 'MONDAY',
	TUESDAY = 'TUESDAY',
	WEDNESDAY = 'WEDNESDAY',
	THURSDAY = 'THURSDAY',
	FRIDAY = 'FRIDAY',
	SATURDAY = 'SATURDAY',
	SUNDAY = 'SUNDAY'
}

export enum HRRequestCategory {
	COMPENSATION = 'COMPENSATION',
	BENEFITS = 'BENEFITS',
	POLICY = 'POLICY',
	EQUIPMENT = 'EQUIPMENT',
	TRAINING = 'TRAINING',
	TRANSFER = 'TRANSFER',
	OTHER = 'OTHER'
}

export enum FieldType {
	TEXT = 'TEXT',
	NUMBER = 'NUMBER',
	EMAIL = 'EMAIL',
	DATE = 'DATE',
	BOOLEAN = 'BOOLEAN',
	SELECT = 'SELECT',
	MULTI_SELECT = 'MULTI_SELECT',
	TEXTAREA = 'TEXTAREA',
	FILE = 'FILE'
}

export enum VirusScanStatus {
	PENDING = 'PENDING',
	CLEAN = 'CLEAN',
	INFECTED = 'INFECTED',
	ERROR = 'ERROR'
}

// =============================================================================
// UI and Form Types
// =============================================================================

export interface PaginationInput {
	first?: number;
	after?: string;
	last?: number;
	before?: string;
}

export interface SortInput {
	field: string;
	direction: 'ASC' | 'DESC';
}

export interface PageInfo {
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	startCursor?: string;
	endCursor?: string;
}

export interface Connection<T> {
	edges: Array<{
		node: T;
		cursor: string;
	}>;
	pageInfo: PageInfo;
	totalCount: number;
}

export interface FilterInput {
	[key: string]: any;
}

// Form validation types
export interface ValidationRule {
	required?: boolean;
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
	min?: number;
	max?: number;
	custom?: (value: any) => boolean | string;
}

export interface FormField {
	name: string;
	label: string;
	type: FieldType;
	value?: any;
	error?: string;
	rules?: ValidationRule;
	options?: Array<{ value: any; label: string }>;
	disabled?: boolean;
	placeholder?: string;
	helpText?: string;
}

export interface FormState {
	fields: { [key: string]: FormField };
	isValid: boolean;
	isSubmitting: boolean;
	errors: { [key: string]: string };
	touched: { [key: string]: boolean };
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T> {
	data?: T;
	errors?: Array<{
		message: string;
		code?: string;
		path?: string[];
		extensions?: Record<string, any>;
	}>;
}

export interface MutationResponse {
	success: boolean;
	message?: string;
	errors?: string[];
}

export interface LoginResponse {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
	user: User;
}

export interface RefreshTokenResponse {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
}

// =============================================================================
// Dashboard and Analytics Types
// =============================================================================

export interface DashboardData {
	upcomingTasks: Task[];
	recentActivity: Activity[];
	quickStats: QuickStats;
	notifications: Notification[];
}

export interface QuickStats {
	pendingTasks: number;
	completedTasksThisWeek: number;
	overdueTasksCount: number;
	pendingLeaveRequests: number;
	teamSize: number;
	attendanceRate: number;
}

export interface Activity {
	id: string;
	type: ActivityType;
	description: string;
	actor: User;
	target?: string;
	timestamp: string;
	metadata?: Record<string, any>;
}

export enum ActivityType {
	TASK_CREATED = 'TASK_CREATED',
	TASK_COMPLETED = 'TASK_COMPLETED',
	LEAVE_REQUESTED = 'LEAVE_REQUESTED',
	LEAVE_APPROVED = 'LEAVE_APPROVED',
	USER_CREATED = 'USER_CREATED',
	DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED'
}

export interface Notification {
	id: string;
	type: NotificationType;
	title: string;
	message: string;
	recipient: User;
	isRead: boolean;
	priority: NotificationPriority;
	actionUrl?: string;
	actionLabel?: string;
	createdAt: string;
	expiresAt?: string;
}

export enum NotificationType {
	TASK_ASSIGNED = 'TASK_ASSIGNED',
	TASK_DUE = 'TASK_DUE',
	LEAVE_APPROVED = 'LEAVE_APPROVED',
	LEAVE_REJECTED = 'LEAVE_REJECTED',
	SYSTEM_ALERT = 'SYSTEM_ALERT',
	REMINDER = 'REMINDER'
}

export enum NotificationPriority {
	LOW = 'LOW',
	NORMAL = 'NORMAL',
	HIGH = 'HIGH',
	URGENT = 'URGENT'
}

// =============================================================================
// Export/Import Types
// =============================================================================

export interface ExportRequest {
	format: ExportFormat;
	filters?: FilterInput;
	fields?: string[];
	options?: ExportOptions;
}

export enum ExportFormat {
	CSV = 'CSV',
	EXCEL = 'EXCEL',
	PDF = 'PDF',
	JSON = 'JSON'
}

export interface ExportOptions {
	includeHeaders?: boolean;
	dateFormat?: string;
	timezone?: string;
	compression?: boolean;
	password?: string;
}

export interface ExportJob {
	id: string;
	status: ExportJobStatus;
	progress: number;
	downloadUrl?: string;
	error?: string;
	createdAt: string;
	completedAt?: string;
	expiresAt?: string;
}

export enum ExportJobStatus {
	QUEUED = 'QUEUED',
	PROCESSING = 'PROCESSING',
	COMPLETED = 'COMPLETED',
	FAILED = 'FAILED',
	EXPIRED = 'EXPIRED'
}

// =============================================================================
// Utility Types
// =============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type EntityId = string;

export type DateTime = string;

export type Json = Record<string, any>;

// =============================================================================
// Component Props Types
// =============================================================================

export interface BaseComponentProps {
	id?: string;
	className?: string;
	'data-testid'?: string;
}

export interface TableColumn<T> {
	key: keyof T;
	label: string;
	sortable?: boolean;
	width?: string;
	render?: (value: any, row: T) => any;
}

export interface TableProps<T> extends BaseComponentProps {
	data: T[];
	columns: TableColumn<T>[];
	loading?: boolean;
	error?: string;
	pagination?: {
		currentPage: number;
		totalPages: number;
		pageSize: number;
		totalItems: number;
		onPageChange: (page: number) => void;
	};
	sorting?: {
		field: string;
		direction: 'ASC' | 'DESC';
		onSortChange: (field: string, direction: 'ASC' | 'DESC') => void;
	};
	selection?: {
		selectedItems: T[];
		onSelectionChange: (items: T[]) => void;
	};
}

export interface ModalProps extends BaseComponentProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl';
	closeOnBackdrop?: boolean;
	showCloseButton?: boolean;
}

export interface FormProps extends BaseComponentProps {
	initialValues?: Record<string, any>;
	validationSchema?: Record<string, ValidationRule>;
	onSubmit: (values: Record<string, any>) => void | Promise<void>;
	loading?: boolean;
	disabled?: boolean;
}

// Re-export commonly used types
export type { User as Employee };
export type { LeaveRequest as Leave };
export type { AttendanceRecord as Attendance };
