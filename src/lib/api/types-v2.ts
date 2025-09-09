/**
 * TypeScript types for MountainHR API v2 responses
 * Generated based on backend API endpoint documentation
 */

// Base interfaces
export interface BaseEntity {
	id: string;
	created_at?: string;
	updated_at?: string;
}

// Employee Management Types
export interface Employee extends BaseEntity {
	username: string;
	email: string;
	first_name?: string;
	last_name?: string;
	full_name?: string;
	middle_name?: string;
	employee_id?: string;
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
	// HR properties
	department_id?: string | null;
	department_name?: string | null;
	job_title?: string | null;
	hire_date?: string | null;
	employment_type?: string | null;
	termination_date?: string | null;
	contact_email?: string | null;
	phone_number?: string | null;
	status?: string;
	// Associated data
	roles?: Role[];
	permissions?: string[];
}

export interface CreateEmployeeRequest {
	email: string;
	first_name: string;
	last_name: string;
	department_id?: string;
}

export interface UpdateEmployeeRequest {
	email?: string;
	first_name?: string;
	last_name?: string;
	department_id?: string;
	is_active?: boolean;
	manager_id?: string | null;
}

// Department Management Types
export interface Department extends BaseEntity {
	name: string;
	description?: string;
	parent_department_id?: string | null;
	manager_id?: string | null;
	employee_count?: number;
	is_active?: boolean;
}

export interface CreateDepartmentRequest {
	name: string;
	description?: string;
	parent_department_id?: string;
	manager_id?: string;
}

export interface UpdateDepartmentRequest {
	name?: string;
	description?: string;
	parent_department_id?: string | null;
	manager_id?: string | null;
	is_active?: boolean;
}

// Leave Management Types
export interface Leave extends BaseEntity {
	employee_id: string;
	leave_type: string;
	start_date: string;
	end_date: string;
	reason?: string;
	status: 'pending' | 'approved' | 'rejected' | 'cancelled';
	approved_by?: string | null;
	approved_at?: string | null;
	rejection_reason?: string | null;
	total_days?: number;
	// Associated data
	employee?: Employee;
	approver?: Employee;
}

export interface CreateLeaveRequest {
	employee_id: string;
	leave_type: string;
	start_date: string;
	end_date: string;
	reason?: string;
}

export interface UpdateLeaveRequest {
	status?: 'approved' | 'rejected' | 'cancelled';
	reason?: string;
	approved_by?: string;
	rejection_reason?: string;
}

// Activity Log Types
export interface ActivityLog extends BaseEntity {
	user_id: string;
	action_type: string;
	resource_type: string;
	resource_id?: string;
	details?: Record<string, any>;
	ip_address?: string;
	user_agent?: string;
	// Associated data
	user?: Employee;
}

export interface ActivityLogFilters {
	user_id?: string;
	action_type?: string;
	resource_type?: string;
	start_date?: string;
	end_date?: string;
	limit?: number;
}

// Announcement Types
export interface Announcement extends BaseEntity {
	title: string;
	content: string;
	priority?: 'low' | 'medium' | 'high' | 'urgent';
	target_audience?: string;
	expires_at?: string | null;
	is_active?: boolean;
	created_by?: string;
	// Associated data
	creator?: Employee;
}

export interface CreateAnnouncementRequest {
	title: string;
	content: string;
	priority?: string;
	target_audience?: string;
	expires_at?: string;
}

export interface UpdateAnnouncementRequest {
	title?: string;
	content?: string;
	priority?: string;
	target_audience?: string;
	expires_at?: string | null;
	is_active?: boolean;
}

// Document Management Types
export interface Document extends BaseEntity {
	title: string;
	category?: string;
	employee_id?: string;
	file_path?: string;
	content?: string;
	file_size?: number;
	mime_type?: string;
	is_confidential?: boolean;
	access_level?: string;
	// Associated data
	employee?: Employee;
}

export interface CreateDocumentRequest {
	title: string;
	category?: string;
	employee_id?: string;
	file_path?: string;
	content?: string;
	is_confidential?: boolean;
	access_level?: string;
}

export interface UpdateDocumentRequest {
	title?: string;
	category?: string;
	content?: string;
	is_confidential?: boolean;
	access_level?: string;
}

// HR Request Types
export interface HRRequest extends BaseEntity {
	employee_id: string;
	request_type: string;
	description: string;
	status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
	priority?: 'low' | 'medium' | 'high' | 'urgent';
	response?: string;
	handled_by?: string | null;
	handled_at?: string | null;
	due_date?: string | null;
	// Associated data
	employee?: Employee;
	handler?: Employee;
}

export interface CreateHRRequestRequest {
	employee_id: string;
	request_type: string;
	description: string;
	priority?: string;
	due_date?: string;
}

export interface UpdateHRRequestRequest {
	status?: string;
	response?: string;
	handled_by?: string;
	priority?: string;
	due_date?: string | null;
}

// Task Management Types
export interface Task extends BaseEntity {
	title: string;
	description?: string;
	assigned_to?: string;
	assigned_by?: string;
	status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
	priority?: 'low' | 'medium' | 'high' | 'urgent';
	due_date?: string | null;
	completed_at?: string | null;
	// Associated data
	assignee?: Employee;
	assigner?: Employee;
}

export interface CreateTaskRequest {
	title: string;
	description?: string;
	assigned_to?: string;
	priority?: string;
	due_date?: string;
}

export interface UpdateTaskRequest {
	title?: string;
	description?: string;
	status?: string;
	priority?: string;
	due_date?: string | null;
}

// File Management Types
export interface FileRecord extends BaseEntity {
	filename: string;
	original_filename: string;
	file_path: string;
	file_size: number;
	mime_type: string;
	category?: string;
	entity_type?: string;
	entity_id?: string;
	is_public?: boolean;
	uploaded_by?: string;
	// Associated data
	uploader?: Employee;
}

// Role and Permission Types (RBAC)
export interface Role extends BaseEntity {
	name: string;
	display_name?: string;
	description?: string;
	level?: number;
	is_system?: boolean;
	is_active?: boolean;
	parent_role?: string | null;
	user_count?: number;
	permission_count?: number;
}

export interface Permission extends BaseEntity {
	name: string;
	display_name?: string;
	description?: string;
	resource?: string;
	action?: string;
	scope?: string;
	is_system?: boolean;
	role_count?: number;
}

export interface UserRole extends BaseEntity {
	user_id: string;
	role_id: string;
	granted_by?: string | null;
	expires_at?: string | null;
	is_active?: boolean;
	// Associated data
	role: Role;
	user?: Employee;
	granter?: Employee;
}

// Authentication Response Types
export interface LoginResponse {
	token: string;
	token_type: string;
	expires_at: string;
	user: Employee;
	roles?: Role[];
	permissions?: string[];
}

export interface AuthVerifyResponse {
	user: Employee;
	roles: Role[];
	permissions: string[];
	token_expires_at?: string;
}

// API Response Wrappers
export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page?: number;
	limit?: number;
	has_next?: boolean;
	has_prev?: boolean;
}

export interface ApiResponse<T> {
	data: T | null;
	success: boolean;
	error?: string;
	status: number;
	details?: any;
}

// Query Parameters - Using index signature for compatibility
export interface PaginationParams {
	limit?: number;
	offset?: number;
	page?: number;
}

export interface SortParams {
	order_by?: string;
	sort_direction?: 'asc' | 'desc';
}

export interface FilterParams {
	filter?: string;
	search?: string;
}

// Common parameter combinations with index signature for API compatibility
export interface ListParams extends PaginationParams, SortParams, FilterParams {
	[key: string]: string | number | boolean | undefined;
}

// API Endpoint Categories
export interface EndpointInfo {
	path: string;
	method: string;
	description: string;
	category: string;
	parameters?: Array<{
		name: string;
		in: 'query' | 'path' | 'header';
		type: string;
		required: boolean;
		description?: string;
		default?: any;
	}>;
	request_body?: {
		content_type: string;
		required: boolean;
		schema: any;
	};
	responses: Record<
		string,
		{
			description: string;
			content_type: string;
		}
	>;
	security?: string[];
}

export interface EndpointsResponse {
	api_version: string;
	categories: string[];
	endpoints: Record<string, EndpointInfo[]>;
	documentation: {
		openapi: string;
		postman: string;
		schema: string;
		swagger: string;
		typescript: string;
	};
}

// Bulk Operations
export interface BulkOperation<T> {
	operation: 'create' | 'update' | 'delete';
	data: T[];
	options?: Record<string, any>;
}

export interface BulkOperationResult {
	batch_id: string;
	status: 'pending' | 'processing' | 'completed' | 'failed';
	progress?: number;
	total?: number;
	processed?: number;
	errors?: Array<{
		index: number;
		error: string;
		data?: any;
	}>;
}

// File Upload
export interface FileUploadProgress {
	fileId: string;
	originalName: string;
	totalBytes: number;
	bytesRead: number;
	percentage: number;
	status: 'uploading' | 'completed' | 'error';
	startTime: string;
	error?: string;
}
