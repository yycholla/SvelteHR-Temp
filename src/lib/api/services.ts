import { apiClient } from './client';
import type {
	Employee,
	Department,
	Role,
	Task,
	ComplianceItem,
	LeaveRequest,
	LeaveBalance,
	Document,
	Notification,
	PerformanceReview,
	HRRequest,
	User,
	PaginatedResponse,
	CreateEmployeeRequest,
	UpdateEmployeeRequest,
	CreateDepartmentRequest,
	CreateTaskRequest,
	CreateLeaveRequest,
	DashboardStats,
	HealthStatus,
	VersionInfo
} from './types';

/**
 * Modern Employee API Service using MountainHR backend
 */
export const EmployeeService = {
	/**
	 * List employees with advanced query support
	 */
	async list(
		options: {
			page?: number;
			pageSize?: number;
			search?: string;
			department_id?: string;
			status?: 'active' | 'inactive' | 'terminated';
			fields?: string[];
			include?: string[];
		} = {}
	) {
		return apiClient
			.query<Employee>('employees')
			.select((options.fields as (keyof Employee)[]) || ['id', 'full_name', 'email', 'status'])
			.include(options.include || [])
			.filter({
				...(options.search && { full_name: { ilike: `%${options.search}%` } }),
				...(options.department_id && { department_id: options.department_id }),
				...(options.status && { status: options.status })
			})
			.paginate(options.page || 1, options.pageSize || 20)
			.execute();
	},

	/**
	 * Get employee by ID with full details
	 */
	async getById(id: string) {
		return apiClient.get<Employee>(`/employees/${id}`, { include: 'department,role,manager' });
	},

	/**
	 * Create new employee
	 */
	async create(data: CreateEmployeeRequest) {
		return apiClient.post<Employee>('/employees', data);
	},

	/**
	 * Update existing employee
	 */
	async update(id: string, data: UpdateEmployeeRequest) {
		return apiClient.put<Employee>(`/employees/${id}`, data);
	},

	/**
	 * Delete employee
	 */
	async delete(id: string) {
		return apiClient.delete(`/employees/${id}`);
	},

	/**
	 * Bulk operations
	 */
	async bulkUpdate(operations: { operation: string; data: any }[]) {
		return apiClient.bulk({
			operation: 'update',
			entity: 'employees',
			data: operations
		});
	},

	/**
	 * Get employee hierarchy (direct reports)
	 */
	async getDirectReports(managerId: string) {
		return apiClient
			.query<Employee>('employees')
			.filter({ manager_id: managerId })
			.include(['department', 'role'])
			.execute();
	}
};

/**
 * Department API Service
 */
export const DepartmentService = {
	/**
	 * List all departments with hierarchy
	 */
	async list() {
		return apiClient.get<Department[]>('/organization/departments');
	},

	/**
	 * Get department by ID
	 */
	async getById(id: string) {
		return apiClient.get<Department>(`/organization/departments/${id}`);
	},

	/**
	 * Create new department
	 */
	async create(data: CreateDepartmentRequest) {
		return apiClient.post<Department>('/organization/departments', data);
	},

	/**
	 * Update department
	 */
	async update(id: string, data: Partial<CreateDepartmentRequest>) {
		return apiClient.put<Department>(`/organization/departments/${id}`, data);
	},

	/**
	 * Delete department
	 */
	async delete(id: string) {
		return apiClient.delete(`/organization/departments/${id}`);
	},

	/**
	 * Get department statistics
	 */
	async getStats(id: string) {
		return apiClient
			.query<Department>('departments')
			.select(['id', 'name', 'employee_count'])
			.aggregate({ employee_count: ['sum'], avg_salary: ['avg'] })
			.filter({ id })
			.execute();
	}
};

/**
 * Role & Permissions API Service
 */
export const RoleService = {
	/**
	 * List all roles
	 */
	async list() {
		return apiClient.get<Role[]>('/organization/roles');
	},

	/**
	 * Get role by ID
	 */
	async getById(id: string) {
		return apiClient.get<Role>(`/organization/roles/${id}`);
	},

	/**
	 * Get role permissions
	 */
	async getPermissions(id: string) {
		return apiClient.get<string[]>(`/organization/roles/${id}/permissions`);
	},

	/**
	 * Add permission to role
	 */
	async addPermission(roleId: string, permissionId: string) {
		return apiClient.post(`/organization/roles/${roleId}/permissions`, {
			permission_id: permissionId
		});
	},

	/**
	 * Remove permission from role
	 */
	async removePermission(roleId: string, permissionId: string) {
		return apiClient.delete(`/organization/roles/${roleId}/permissions/${permissionId}`);
	}
};

/**
 * Task Management API Service
 */
export const TaskService = {
	/**
	 * List tasks with filtering
	 */
	async list(
		options: {
			page?: number;
			pageSize?: number;
			status?: string;
			assignee_id?: string;
			priority?: string;
		} = {}
	) {
		return apiClient
			.query<Task>('tasks')
			.filter({
				...(options.status && { status: options.status }),
				...(options.assignee_id && { assignee_id: options.assignee_id }),
				...(options.priority && { priority: options.priority })
			})
			.include(['assignee', 'assigned_by'])
			.sort('created_at', 'DESC')
			.paginate(options.page || 1, options.pageSize || 20)
			.execute();
	},

	/**
	 * Get task by ID
	 */
	async getById(id: string) {
		return apiClient.get<Task>(`/tasks/${id}`);
	},

	/**
	 * Create new task
	 */
	async create(data: CreateTaskRequest) {
		return apiClient.post<Task>('/tasks', data);
	},

	/**
	 * Update task
	 */
	async update(id: string, data: Partial<CreateTaskRequest>) {
		return apiClient.put<Task>(`/tasks/${id}`, data);
	},

	/**
	 * Update task status
	 */
	async updateStatus(id: string, status: string) {
		return apiClient.put(`/tasks/${id}/status`, { status });
	},

	/**
	 * Complete task
	 */
	async complete(id: string) {
		return apiClient.put(`/tasks/${id}/complete`);
	},

	/**
	 * Get tasks assigned to employee
	 */
	async getByEmployee(employeeId: string) {
		return apiClient.get<Task[]>(`/tasks/employee/${employeeId}`);
	}
};

/**
 * Leave Management API Service
 */
export const LeaveService = {
	/**
	 * List leave requests
	 */
	async listRequests(options: { employee_id?: string; status?: string } = {}) {
		return apiClient
			.query<LeaveRequest>('leave/requests')
			.filter(options)
			.include(['employee', 'approved_by'])
			.sort('created_at', 'DESC')
			.execute();
	},

	/**
	 * List leave balances
	 */
	async listBalances(employeeId?: string) {
		const endpoint = employeeId ? `/leave/balances/employee/${employeeId}` : '/leave/balances';
		return apiClient.get<LeaveBalance[]>(endpoint);
	},

	/**
	 * Create leave request
	 */
	async createRequest(data: CreateLeaveRequest) {
		return apiClient.post<LeaveRequest>('/leave/requests', data);
	},

	/**
	 * Update leave request
	 */
	async updateRequest(id: string, data: Partial<CreateLeaveRequest>) {
		return apiClient.put<LeaveRequest>(`/leave/requests/${id}`, data);
	},

	/**
	 * Delete leave request
	 */
	async deleteRequest(id: string) {
		return apiClient.delete(`/leave/requests/${id}`);
	}
};

/**
 * Document Management API Service
 */
export const DocumentService = {
	/**
	 * List documents
	 */
	async list(options: { category?: string; entity_type?: string; entity_id?: string } = {}) {
		return apiClient
			.query<Document>('documents')
			.filter(options)
			.include(['uploaded_by'])
			.sort('created_at', 'DESC')
			.execute();
	},

	/**
	 * Get document by ID
	 */
	async getById(id: string) {
		return apiClient.get<Document>(`/documents/${id}`);
	},

	/**
	 * Upload document with progress tracking
	 */
	async upload(
		file: File,
		options: {
			category?: string;
			entityType?: string;
			entityId?: string;
			tags?: string[];
			isPublic?: boolean;
			onProgress?: (progress: any) => void;
		} = {}
	) {
		return apiClient.uploadFile(file, options);
	},

	/**
	 * Download document
	 */
	async download(id: string) {
		return apiClient.get(`/documents/${id}/download`);
	},

	/**
	 * Generate secure download token
	 */
	async getDownloadToken(id: string) {
		return apiClient.post(`/documents/${id}/download-token`);
	},

	/**
	 * Delete document
	 */
	async delete(id: string) {
		return apiClient.delete(`/documents/${id}`);
	}
};

/**
 * Notification API Service
 */
export const NotificationService = {
	/**
	 * List notifications
	 */
	async list(options: { unread_only?: boolean } = {}) {
		return apiClient
			.query<Notification>('notifications')
			.filter(options.unread_only ? { is_read: false } : {})
			.sort('created_at', 'DESC')
			.execute();
	},

	/**
	 * Get unread count
	 */
	async getUnreadCount() {
		return apiClient.get<{ count: number }>('/notifications/unread-count');
	},

	/**
	 * Mark notification as read
	 */
	async markAsRead(id: string) {
		return apiClient.put(`/notifications/${id}/read`);
	},

	/**
	 * Mark all notifications as read
	 */
	async markAllAsRead() {
		return apiClient.put('/notifications/mark-all-read');
	},

	/**
	 * Delete notification
	 */
	async delete(id: string) {
		return apiClient.delete(`/notifications/${id}`);
	}
};

/**
 * Performance Management API Service
 */
export const PerformanceService = {
	/**
	 * List performance reviews
	 */
	async listReviews(options: { employee_id?: string; status?: string } = {}) {
		return apiClient
			.query<PerformanceReview>('performance/reviews')
			.filter(options)
			.include(['employee', 'reviewer', 'template'])
			.sort('created_at', 'DESC')
			.execute();
	},

	/**
	 * Get my performance reviews
	 */
	async getMyReviews() {
		return apiClient.get<PerformanceReview[]>('/performance/reviews/my-reviews');
	},

	/**
	 * Get review by ID
	 */
	async getReviewById(id: string) {
		return apiClient.get<PerformanceReview>(`/performance/reviews/${id}`);
	},

	/**
	 * Create performance review
	 */
	async createReview(data: any) {
		return apiClient.post<PerformanceReview>('/performance/reviews', data);
	},

	/**
	 * Save review responses
	 */
	async saveResponses(id: string, responses: any) {
		return apiClient.put(`/performance/reviews/${id}/responses`, responses);
	},

	/**
	 * Submit performance review
	 */
	async submitReview(id: string) {
		return apiClient.post(`/performance/reviews/${id}/submit`);
	},

	/**
	 * List performance templates
	 */
	async listTemplates() {
		return apiClient.get('/performance/templates');
	},

	/**
	 * Create performance template
	 */
	async createTemplate(data: any) {
		return apiClient.post('/performance/templates', data);
	},

	/**
	 * Duplicate template
	 */
	async duplicateTemplate(id: string) {
		return apiClient.post(`/performance/templates/${id}/duplicate`);
	},

	/**
	 * Set as default template
	 */
	async setDefaultTemplate(id: string) {
		return apiClient.put(`/performance/templates/${id}/default`);
	}
};

/**
 * HR Request API Service
 */
export const HRRequestService = {
	/**
	 * List HR requests
	 */
	async list(options: { status?: string; type?: string } = {}) {
		return apiClient
			.query<HRRequest>('hr-requests')
			.filter(options)
			.include(['employee', 'assigned_to', 'responses'])
			.sort('created_at', 'DESC')
			.execute();
	},

	/**
	 * Get HR request by ID
	 */
	async getById(id: string) {
		return apiClient.get<HRRequest>(`/hr-requests/${id}`);
	},

	/**
	 * Create HR request
	 */
	async create(data: any) {
		return apiClient.post<HRRequest>('/hr-requests', data);
	},

	/**
	 * Update HR request
	 */
	async update(id: string, data: any) {
		return apiClient.put<HRRequest>(`/hr-requests/${id}`, data);
	},

	/**
	 * Add response to HR request
	 */
	async respond(id: string, response: { message: string; is_resolution: boolean }) {
		return apiClient.post(`/hr-requests/${id}/respond`, response);
	},

	/**
	 * Delete HR request
	 */
	async delete(id: string) {
		return apiClient.delete(`/hr-requests/${id}`);
	}
};

/**
 * Compliance Management API Service
 */
export const ComplianceService = {
	/**
	 * List compliance items
	 */
	async list(options: { status?: string; employee_id?: string } = {}) {
		return apiClient
			.query<ComplianceItem>('compliance')
			.filter(options)
			.include(['employee', 'documents'])
			.sort('due_date', 'ASC')
			.execute();
	},

	/**
	 * Get compliance statistics
	 */
	async getStats() {
		return apiClient.get('/compliance/stats');
	},

	/**
	 * Get compliance item by ID
	 */
	async getById(id: string) {
		return apiClient.get<ComplianceItem>(`/compliance/${id}`);
	},

	/**
	 * Create compliance item
	 */
	async create(data: any) {
		return apiClient.post<ComplianceItem>('/compliance', data);
	},

	/**
	 * Update compliance item
	 */
	async update(id: string, data: any) {
		return apiClient.put<ComplianceItem>(`/compliance/${id}`, data);
	},

	/**
	 * Delete compliance item
	 */
	async delete(id: string) {
		return apiClient.delete(`/compliance/${id}`);
	}
};

/**
 * Attendance Management API Service
 */
export const AttendanceService = {
	/**
	 * List attendance records
	 */
	async list(options: { employee_id?: string; date?: string } = {}) {
		return apiClient
			.query('attendance')
			.filter(options)
			.include(['employee'])
			.sort('date', 'DESC')
			.execute();
	},

	/**
	 * Create attendance record
	 */
	async create(data: any) {
		return apiClient.post('/attendance', data);
	},

	/**
	 * Get employee attendance records
	 */
	async getByEmployee(employeeId: string) {
		return apiClient.get(`/attendance/employee/${employeeId}`);
	},

	/**
	 * Delete attendance record
	 */
	async delete(id: string) {
		return apiClient.delete(`/attendance/${id}`);
	}
};

/**
 * Portal & Events API Service
 */
export const PortalService = {
	/**
	 * List company events
	 */
	async listEvents() {
		return apiClient.get('/portal/events');
	},

	/**
	 * RSVP to event
	 */
	async rsvpToEvent(eventId: string, status: 'attending' | 'not_attending' | 'maybe') {
		return apiClient.post(`/portal/events/${eventId}/rsvp`, { status });
	},

	/**
	 * Invite users to event
	 */
	async inviteToEvent(eventId: string, userIds: string[]) {
		return apiClient.post(`/portal/events/${eventId}/invite`, { user_ids: userIds });
	},

	/**
	 * Get event attendees
	 */
	async getEventAttendees(eventId: string) {
		return apiClient.get(`/portal/events/${eventId}/attendees`);
	}
};

/**
 * Admin Dashboard API Service
 */
export const AdminService = {
	/**
	 * Get dashboard statistics
	 */
	async getDashboardStats() {
		return apiClient.get<DashboardStats>('/admin/dashboard/stats');
	},

	/**
	 * List all users
	 */
	async listUsers() {
		return apiClient.get<User[]>('/admin/users');
	},

	/**
	 * Get database info
	 */
	async getDatabaseInfo() {
		return apiClient.get('/admin/database/info');
	},

	/**
	 * Get system logs
	 */
	async getSystemLogs() {
		return apiClient.get('/admin/system/logs');
	},

	/**
	 * Update user role
	 */
	async updateUserRole(userId: string, roleId: string) {
		return apiClient.put('/admin/users/role', { user_id: userId, role_id: roleId });
	},

	/**
	 * Deactivate user
	 */
	async deactivateUser(userId: string, reason: string) {
		return apiClient.put('/admin/users/deactivate', { user_id: userId, reason });
	}
};

/**
 * System Health & Monitoring API Service
 */
export const SystemService = {
	/**
	 * Get system health
	 */
	async getHealth() {
		return apiClient.get<HealthStatus>('/public/health');
	},

	/**
	 * Get API version
	 */
	async getVersion() {
		return apiClient.get<VersionInfo>('/public/version');
	},

	/**
	 * Ping endpoint
	 */
	async ping() {
		return apiClient.get<string>('/ping');
	}
};

// Export all services as a single object for convenience
export const ApiServices = {
	employees: EmployeeService,
	departments: DepartmentService,
	roles: RoleService,
	tasks: TaskService,
	leave: LeaveService,
	documents: DocumentService,
	notifications: NotificationService,
	performance: PerformanceService,
	hrRequests: HRRequestService,
	compliance: ComplianceService,
	attendance: AttendanceService,
	portal: PortalService,
	admin: AdminService,
	system: SystemService,
	auth: apiClient.auth
};

// Services are already exported above as const declarations
// No need for duplicate exports

// Re-export auth service for convenience
export const AuthService = apiClient.auth;
