// ========================================
// GENERATED API TYPES - MountainHR Backend
// ========================================

// Base API Response Types
export interface ApiResponse<T = any> {
	data: T | null;
	success: boolean;
	error?: string;
	message?: string;
	status: number;
	details?: any;
}

export interface ApiError {
	message: string;
	status: number;
	details?: any;
	field_errors?: Record<string, string[]>;
}

export interface PaginationMeta {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

export interface PaginatedResponse<T> {
	data: T[];
	meta: PaginationMeta;
}

// Query Types
export interface QueryParams {
	page?: number;
	pageSize?: number;
	search?: string;
	filter?: Record<string, any>;
	sort?: string;
	order?: 'ASC' | 'DESC';
	fields?: string;
	include?: string;
	exclude?: string;
}

export interface QueryFilter {
	[field: string]: {
		eq?: any;
		neq?: any;
		gt?: any;
		gte?: any;
		lt?: any;
		lte?: any;
		in?: any[];
		nin?: any[];
		like?: string;
		ilike?: string;
		is_null?: boolean;
	};
}

export interface QuerySort {
	field: string;
	direction: 'asc' | 'desc';
}

export interface QueryOptions {
	filters?: QueryFilter;
	sort?: QuerySort[];
	include?: string[];
	page?: number;
	pageSize?: number;
	aggregate?: {
		count?: boolean;
		sum?: string[];
		avg?: string[];
		min?: string[];
		max?: string[];
	};
}

// Authentication Types
export interface LoginRequest {
	email: string;
	password: string;
}

export interface RegisterRequest {
	email: string;
	password: string;
	full_name: string;
	role_id?: string;
}

export interface AuthResponse {
	token: string;
	user: User;
	expires_at: string;
}

export interface User {
	id: string;
	username: string;
	email: string;
	first_name?: string;
	last_name?: string;
	middle_name?: string;
	employee_id?: string;
	full_name?: string;
	display_name?: string;
	search_name?: string;
	is_active: boolean;
	is_verified?: boolean;
	last_login?: string | null;
	failed_login_attempts?: number;
	locked_until?: string | null;
	onboarding_status?: string;
	manager_id?: string | null;
	is_manager?: boolean;
	direct_report_count?: number;
	management_level?: number;
	// Computed HR properties from linked data
	department_name?: string | null;
	job_title?: string | null;
	hire_date?: string | null;
	employment_type?: string | null;
	contact_email?: string | null;
	phone_number?: string | null;
	created_at?: string;
	updated_at?: string;
	roles: Role[];
	permissions: string[];
}

// Core Entity Types
export interface Employee {
	id: string;
	employee_id: string;
	full_name?: string;
	email: string;
	phone?: string;
	hire_date: string;
	status: 'active' | 'inactive' | 'terminated';
	department?: Department;
	role?: Role;
	manager?: Employee;
	direct_reports: Employee[];
	created_at?: string;
	updated_at?: string;
	roles: Role[];
	permissions: string[];
}

export interface Department {
	id: string;
	name: string;
	description?: string;
	budget?: number;
	parent_department?: Department;
	manager?: Employee;
	employee_count: number;
	subdepartment_count: number;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface Role {
	id: string;
	name: string;
	display_name?: string;
	description?: string;
	level?: number;
	is_system?: boolean;
	parent_role?: string | null;
	permissions?: Permission[];
	user_count?: number;
	permission_count?: number;
	created_at?: string;
	updated_at?: string;
}

export interface Permission {
	id: string;
	name: string;
	display_name?: string;
	description?: string;
	resource?: string;
	action?: string;
	scope?: string;
	is_system?: boolean;
	role_count?: number;
	created_at: string;
	updated_at: string;
}

export interface UserRole {
	id: string;
	user_id: string;
	role_id: string;
	role: Role;
	granted_by?: string;
	expires_at?: string;
	is_active?: boolean;
	created_at: string;
	updated_at: string;
}

// Task Management Types
export interface Task {
	id: string;
	title: string;
	description?: string;
	status: TaskStatus;
	priority: 'low' | 'medium' | 'high' | 'urgent';
	assignee?: Employee;
	assigned_by?: Employee;
	due_date?: string;
	completed_at?: string;
	created_at: string;
	updated_at: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

// Leave Management Types
export interface LeaveRequest {
	id: string;
	employee: Employee;
	leave_type: string;
	start_date: string;
	end_date: string;
	days_requested: number;
	status: ApprovalStatus;
	reason?: string;
	approved_by?: Employee;
	approved_at?: string;
	created_at: string;
	updated_at: string;
}

export interface LeaveBalance {
	id: string;
	employee: Employee;
	leave_type: string;
	total_days: number;
	used_days: number;
	remaining_days: number;
	year: number;
	created_at: string;
	updated_at: string;
}

// Performance Management Types
export interface PerformanceReview {
	id: string;
	employee: Employee;
	reviewer: Employee;
	template?: PerformanceTemplate;
	period_start: string;
	period_end: string;
	status: 'draft' | 'in_progress' | 'completed' | 'published';
	overall_rating?: number;
	goals: string[];
	achievements: string[];
	areas_for_improvement: string[];
	created_at: string;
	updated_at: string;
}

export interface PerformanceTemplate {
	id: string;
	name: string;
	description?: string;
	questions: PerformanceQuestion[];
	is_default: boolean;
	created_at: string;
	updated_at: string;
}

export interface PerformanceQuestion {
	id: string;
	text: string;
	type: 'rating' | 'text' | 'multiple_choice';
	required: boolean;
	options?: string[];
}

// Compliance & Documents Types
export interface ComplianceItem {
	id: string;
	employee: Employee;
	title: string;
	description?: string;
	status: ComplianceStatus;
	due_date?: string;
	completed_date?: string;
	renewal_period?: RenewalPeriod;
	documents: Document[];
	created_at: string;
	updated_at: string;
}

export type ComplianceStatus = 'active' | 'expiring_soon' | 'expired' | 'pending_review';
export type RenewalPeriod = 'none' | 'monthly' | 'quarterly' | 'semi_annually' | 'yearly';

export interface Document {
	id: string;
	filename: string;
	original_name: string;
	mime_type: string;
	file_size: number;
	entity_type?: string;
	entity_id?: string;
	category?: string;
	is_public: boolean;
	tags: string[];
	uploaded_by: Employee;
	created_at: string;
	updated_at: string;
}

// Notification Types
export interface Notification {
	id: string;
	user: User;
	title: string;
	message: string;
	type: NotificationType;
	is_read: boolean;
	data?: Record<string, any>;
	created_at: string;
	updated_at: string;
}

export type NotificationType =
	| 'info'
	| 'success'
	| 'warning'
	| 'error'
	| 'task_update'
	| 'leave_approval';

// HR Request Types
export interface HRRequest {
	id: string;
	employee: Employee;
	type: string;
	title: string;
	description: string;
	status: ApprovalStatus;
	priority: 'low' | 'medium' | 'high';
	assigned_to?: Employee;
	responses: HRRequestResponse[];
	created_at: string;
	updated_at: string;
}

export interface HRRequestResponse {
	id: string;
	responder: Employee;
	message: string;
	is_resolution: boolean;
	created_at: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// Attendance Types
export interface Attendance {
	id: string;
	employee: Employee;
	date: string;
	clock_in?: string;
	clock_out?: string;
	break_start?: string;
	break_end?: string;
	total_hours?: number;
	status: AttendanceStatus;
	notes?: string;
	created_at: string;
	updated_at: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'partial_day';

// Portal & Event Types
export interface CompanyEvent {
	id: string;
	title: string;
	description?: string;
	event_date: string;
	location?: string;
	max_attendees?: number;
	rsvp_deadline?: string;
	created_by: Employee;
	attendees: EventRSVP[];
	created_at: string;
	updated_at: string;
}

export interface EventRSVP {
	id: string;
	event: CompanyEvent;
	employee: Employee;
	status: 'attending' | 'not_attending' | 'maybe';
	responded_at: string;
}

// Offboarding Types
export interface OffboardingProcess {
	id: string;
	employee: Employee;
	initiated_by: Employee;
	reason: string;
	last_working_day: string;
	status: 'pending' | 'in_progress' | 'completed';
	checklist_items: OffboardingItem[];
	created_at: string;
	updated_at: string;
}

export interface OffboardingItem {
	id: string;
	title: string;
	description?: string;
	responsible_party?: Employee;
	is_completed: boolean;
	completed_at?: string;
}

// File Upload Types
export interface FileUploadProgress {
	fileId: string;
	originalName: string;
	totalBytes: number;
	bytesRead: number;
	percentage: number;
	status: 'uploading' | 'completed' | 'error';
	startTime: string;
	estimatedTimeRemaining?: string;
}

// Bulk Operations Types
export interface BulkOperation<T> {
	operation: 'create' | 'update' | 'delete' | 'import' | 'export';
	entity: string;
	data: T[];
	options?: {
		batch_size?: number;
		validate_only?: boolean;
		skip_errors?: boolean;
	};
}

// WebSocket Types
export interface WSMessage {
	type: string;
	entity: string;
	action: 'created' | 'updated' | 'deleted';
	data: any;
	timestamp: string;
	user_id?: string;
}

// Request/Response Types for CRUD Operations
export interface CreateEmployeeRequest {
	full_name: string;
	email: string;
	phone?: string;
	hire_date?: string;
	department_id?: string;
	role_id?: string;
	manager_id?: string;
}

export interface UpdateEmployeeRequest extends Partial<CreateEmployeeRequest> {
	status?: 'active' | 'inactive' | 'terminated';
}

export interface CreateDepartmentRequest {
	name: string;
	description?: string;
	budget?: number;
	parent_department_id?: string;
	manager_id?: string;
}

export interface CreateTaskRequest {
	title: string;
	description?: string;
	assignee_id?: string;
	due_date?: string;
	priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface CreateLeaveRequest {
	leave_type: string;
	start_date: string;
	end_date: string;
	reason?: string;
}

// Error Types
export interface ApiError {
	message: string;
	code?: string;
	status: number;
	details?: any;
	field_errors?: Record<string, string[]>;
}

// Dashboard & Analytics Types
export interface DashboardStats {
	employee_count: number;
	active_employees: number;
	pending_leave_requests: number;
	overdue_tasks: number;
	compliance_issues: number;
	recent_activities: Activity[];
}

export interface Activity {
	id: string;
	type: string;
	description: string;
	user: User;
	timestamp: string;
	metadata?: Record<string, any>;
}

// System Types
export interface HealthStatus {
	status: 'healthy' | 'degraded' | 'unhealthy';
	timestamp: string;
	services: {
		database: 'up' | 'down';
		api: 'up' | 'down';
		websocket: 'up' | 'down';
	};
	version: string;
}

export interface VersionInfo {
	version: string;
	build: string;
	commit: string;
	timestamp: string;
}

// Enum Types
export enum OnboardingStatus {
	PRE_HIRE = 'pre_hire',
	ONBOARDING = 'onboarding',
	ACTIVE = 'active',
	TERMINATED = 'terminated'
}

export enum TimeEntryType {
	CLOCK_IN = 'clock_in',
	CLOCK_OUT = 'clock_out',
	BREAK_START = 'break_start',
	BREAK_END = 'break_end'
}
