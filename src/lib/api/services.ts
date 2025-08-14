import { apiClient } from './client';
import { buildQueryParams, transformPaginatedResponse } from '$lib/schemas/transformers';
import { ErrorUtils } from '$lib/utils/error-handler';

// Import all schemas
import type { 
	Employee, 
	EmployeeFilter, 
	EmployeeListResponse, 
	CreateEmployeeInput, 
	UpdateEmployeeInput 
} from '$lib/schemas/employee';
import type { 
	Department,
	Role 
} from '$lib/schemas/employee';
import type { 
	Task, 
	TaskFilter, 
	TaskListResponse, 
	CreateTaskInput, 
	UpdateTaskInput,
	TaskStatusUpdate 
} from '$lib/schemas/task';
import type { 
	ComplianceItem, 
	ComplianceFilter, 
	ComplianceListResponse, 
	CreateComplianceItemInput, 
	UpdateComplianceItemInput,
	ComplianceStats 
} from '$lib/schemas/compliance';
import type { 
	Leave, 
	LeaveBalance, 
	LeaveFilter, 
	LeaveBalanceFilter, 
	LeaveListResponse, 
	LeaveBalanceListResponse, 
	CreateLeaveInput, 
	UpdateLeaveInput 
} from '$lib/schemas/leave';
import type { 
	Document, 
	DocumentFilter, 
	DocumentListResponse, 
	CreateDocumentInput, 
	UpdateDocumentInput,
	DocumentUploadResponse 
} from '$lib/schemas/document';
import type { 
	Notification, 
	NotificationFilter, 
	NotificationListResponse, 
	CreateNotificationInput, 
	UnreadCount 
} from '$lib/schemas/notification';
import type { 
	HRRequest, 
	HRRequestFilter, 
	HRRequestListResponse, 
	CreateHRRequestInput, 
	UpdateHRRequestInput,
	CreateHRRequestResponseInput 
} from '$lib/schemas/hr-request';

/**
 * Employee API Service
 */
export const EmployeeService = {
	async list(filter?: EmployeeFilter): Promise<EmployeeListResponse> {
		try {
			const params = filter ? buildQueryParams(filter) : undefined;
			const endpoint = params ? `employees?${params}` : 'employees';
			const response = await apiClient.get(endpoint);
			return transformPaginatedResponse(response);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'employees');
		}
	},

	async getById(id: string): Promise<Employee> {
		try {
			return await apiClient.get(`v2/employees/${id}`);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `v2/employees/${id}`);
		}
	},

	async create(data: CreateEmployeeInput): Promise<Employee> {
		try {
			return await apiClient.post('v2/employees', { json: data });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'v2/employees', { requestData: data });
		}
	},

	async update(id: string, data: UpdateEmployeeInput): Promise<Employee> {
		try {
			return await apiClient.put(`v2/employees/${id}`, { json: data });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/v2/employees/${id}`, { requestData: data });
		}
	},

	async delete(id: string): Promise<void> {
		try {
			await apiClient.delete(`v2/employees/${id}`);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/v2/employees/${id}`);
		}
	},

	async batchUpdate(operations: any[]): Promise<any> {
		try {
			return await apiClient.post('/employees/batch', { json: operations });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, '/employees/batch', { requestData: operations });
		}
	}
};

/**
 * Department API Service
 */
export const DepartmentService = {
	async list(): Promise<Department[]> {
		try {
			return await apiClient.get('departments');
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'departments');
		}
	},

	async getById(id: string): Promise<Department> {
		try {
			return await apiClient.get(`departments/${id}`);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/departments/${id}`);
		}
	},

	async create(data: { name: string; description?: string; managerId?: number }): Promise<Department> {
		try {
			return await apiClient.post('departments', { json: data });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'departments', { requestData: data });
		}
	},

	async update(id: string, data: { name?: string; description?: string; managerId?: number }): Promise<Department> {
		try {
			return await apiClient.put(`departments/${id}`, { json: data });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/departments/${id}`, { requestData: data });
		}
	}
};

/**
 * Role API Service
 */
export const RoleService = {
	async list(): Promise<Role[]> {
		try {
			return await apiClient.get('roles');
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'roles');
		}
	},

	async getById(id: string): Promise<Role> {
		try {
			return await apiClient.get(`roles/${id}`);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/roles/${id}`);
		}
	},

	async getPermissions(id: string): Promise<any[]> {
		try {
			return await apiClient.get(`roles/${id}/permissions`);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/roles/${id}/permissions`);
		}
	}
};

/**
 * Task API Service
 */
export const TaskService = {
	async list(filter?: TaskFilter): Promise<TaskListResponse> {
		try {
			const params = filter ? buildQueryParams(filter) : undefined;
			const endpoint = params ? `tasks?${params}` : 'tasks';
			const response = await apiClient.get(endpoint);
			return transformPaginatedResponse(response);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'tasks');
		}
	},

	async getById(id: string): Promise<Task> {
		try {
			return await apiClient.get(`tasks/${id}`);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/tasks/${id}`);
		}
	},

	async getByEmployee(employeeId: string): Promise<Task[]> {
		try {
			return await apiClient.get(`tasks/employee/${employeeId}`);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/tasks/employee/${employeeId}`);
		}
	},

	async create(data: CreateTaskInput): Promise<Task> {
		try {
			return await apiClient.post('tasks', { json: data });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'tasks', { requestData: data });
		}
	},

	async updateStatus(id: string, data: TaskStatusUpdate): Promise<void> {
		try {
			await apiClient.put(`tasks/${id}/status`, { json: data });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/tasks/${id}/status`, { requestData: data });
		}
	},

	async batchUpdate(operations: any[]): Promise<any> {
		try {
			return await apiClient.post('/tasks/batch', { json: operations });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, '/tasks/batch', { requestData: operations });
		}
	}
};

/**
 * Compliance API Service
 */
export const ComplianceService = {
	async list(filter?: ComplianceFilter): Promise<ComplianceListResponse> {
		try {
			const params = filter ? buildQueryParams(filter) : undefined;
			const endpoint = params ? `compliance?${params}` : 'compliance';
			const response = await apiClient.get(endpoint);
			return transformPaginatedResponse(response);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'compliance');
		}
	},

	async getById(id: string): Promise<ComplianceItem> {
		try {
			return await apiClient.get(`compliance/${id}`);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/compliance/${id}`);
		}
	},

	async create(data: CreateComplianceItemInput): Promise<ComplianceItem> {
		try {
			return await apiClient.post('compliance', { json: data });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'compliance', { requestData: data });
		}
	},

	async update(id: string, data: UpdateComplianceItemInput): Promise<ComplianceItem> {
		try {
			return await apiClient.put(`compliance/${id}`, { json: data });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/compliance/${id}`, { requestData: data });
		}
	},

	async getStats(): Promise<ComplianceStats> {
		try {
			return await apiClient.get('/compliance/stats');
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, '/compliance/stats');
		}
	}
};

/**
 * Leave API Service
 */
export const LeaveService = {
	async listBalances(filter?: LeaveBalanceFilter): Promise<LeaveBalanceListResponse> {
		try {
			const params = filter ? buildQueryParams(filter) : undefined;
			const endpoint = params ? `leave/balances?${params}` : 'leave/balances';
			const response = await apiClient.get(endpoint);
			return transformPaginatedResponse(response);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'leave/balances');
		}
	},

	async listRequests(filter?: LeaveFilter): Promise<LeaveListResponse> {
		try {
			const params = filter ? buildQueryParams(filter) : undefined;
			const endpoint = params ? `leave/requests?${params}` : 'leave/requests';
			const response = await apiClient.get(endpoint);
			return transformPaginatedResponse(response);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'leave/requests');
		}
	},

	async createRequest(data: CreateLeaveInput): Promise<Leave> {
		try {
			return await apiClient.post('leave/requests', { json: data });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'leave/requests', { requestData: data });
		}
	},

	async updateRequest(id: string, data: UpdateLeaveInput): Promise<Leave> {
		try {
			return await apiClient.put(`leave/requests/${id}`, { json: data });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/leave/requests/${id}`, { requestData: data });
		}
	}
};

/**
 * Document API Service
 */
export const DocumentService = {
	async list(filter?: DocumentFilter): Promise<DocumentListResponse> {
		try {
			const params = filter ? buildQueryParams(filter) : undefined;
			const endpoint = params ? `documents?${params}` : 'documents';
			const response = await apiClient.get(endpoint);
			return transformPaginatedResponse(response);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'documents');
		}
	},

	async getById(id: string): Promise<Document> {
		try {
			return await apiClient.get(`documents/${id}`);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/documents/${id}`);
		}
	},

	async upload(file: File, metadata: CreateDocumentInput): Promise<DocumentUploadResponse> {
		try {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('metadata', JSON.stringify(metadata));

			return await apiClient.post('/documents/upload', { body: formData });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, '/documents/upload', { requestData: metadata });
		}
	},

	async download(id: string): Promise<Blob> {
		try {
			return await apiClient.get(`documents/${id}/download`);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/documents/${id}/download`);
		}
	},

	async delete(id: string): Promise<void> {
		try {
			await apiClient.delete(`documents/${id}`);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/documents/${id}`);
		}
	}
};

/**
 * Notification API Service
 */
export const NotificationService = {
	async list(filter?: NotificationFilter): Promise<NotificationListResponse> {
		try {
			const params = filter ? buildQueryParams(filter) : undefined;
			const endpoint = params ? `notifications?${params}` : 'notifications';
			const response = await apiClient.get(endpoint);
			return transformPaginatedResponse(response);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'notifications');
		}
	},

	async getUnreadCount(): Promise<UnreadCount> {
		try {
			return await apiClient.get('notifications/unread-count');
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'notifications/unread-count');
		}
	},

	async markAsRead(id: string): Promise<void> {
		try {
			await apiClient.put(`notifications/${id}/read`);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/notifications/${id}/read`);
		}
	}
};

/**
 * Performance API Service
 */
export const PerformanceService = {
	async listReviews(filter?: { status?: string; employeeId?: string }): Promise<any> {
		try {
			const params = filter ? buildQueryParams(filter) : undefined;
			const endpoint = params ? `performance/reviews?${params}` : 'performance/reviews';
			const response = await apiClient.get(endpoint);
			return transformPaginatedResponse(response);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'performance/reviews');
		}
	},

	async getReviewById(id: string): Promise<any> {
		try {
			return await apiClient.get(`performance/reviews/${id}`);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/performance/reviews/${id}`);
		}
	},

	async createReview(data: any): Promise<any> {
		try {
			return await apiClient.post('performance/reviews', { json: data });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'performance/reviews', { requestData: data });
		}
	},

	async updateReview(id: string, data: any): Promise<any> {
		try {
			return await apiClient.put(`performance/reviews/${id}`, { json: data });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/performance/reviews/${id}`, { requestData: data });
		}
	},

	async submitReview(id: string): Promise<void> {
		try {
			await apiClient.post(`performance/reviews/${id}/submit`);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/performance/reviews/${id}/submit`);
		}
	},

	async approveReview(id: string): Promise<void> {
		try {
			await apiClient.post(`performance/reviews/${id}/approve`);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/performance/reviews/${id}/approve`);
		}
	},

	async listGoals(employeeId?: string): Promise<any> {
		try {
			const params = employeeId ? `?employeeId=${employeeId}` : '';
			const response = await apiClient.get(`performance/goals${params}`);
			return transformPaginatedResponse(response);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'performance/goals');
		}
	},

	async createGoal(data: any): Promise<any> {
		try {
			return await apiClient.post('performance/goals', { json: data });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'performance/goals', { requestData: data });
		}
	},

	async updateGoal(id: string, data: any): Promise<any> {
		try {
			return await apiClient.put(`performance/goals/${id}`, { json: data });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/performance/goals/${id}`, { requestData: data });
		}
	}
};

/**
 * HR Request API Service
 */
export const HRRequestService = {
	async list(filter?: HRRequestFilter): Promise<HRRequestListResponse> {
		try {
			const params = filter ? buildQueryParams(filter) : undefined;
			const endpoint = params ? `hr-requests?${params}` : 'hr-requests';
			const response = await apiClient.get(endpoint);
			return transformPaginatedResponse(response);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'hr-requests');
		}
	},

	async getById(id: string): Promise<HRRequest> {
		try {
			return await apiClient.get(`hr-requests/${id}`);
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/hr-requests/${id}`);
		}
	},

	async create(data: CreateHRRequestInput): Promise<HRRequest> {
		try {
			return await apiClient.post('hr-requests', { json: data });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'hr-requests', { requestData: data });
		}
	},

	async respond(id: string, data: CreateHRRequestResponseInput): Promise<void> {
		try {
			await apiClient.post(`hr-requests/${id}/respond`, { json: data });
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, `/hr-requests/${id}/respond`, { requestData: data });
		}
	}
};

/**
 * Monitoring API Service
 */
export const MonitoringService = {
	async getMetrics(): Promise<any> {
		try {
			return await apiClient.get('monitoring/metrics');
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'monitoring/metrics');
		}
	},

	async getHealth(): Promise<any> {
		try {
			return await apiClient.get('monitoring/health');
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'monitoring/health');
		}
	},

	async getSlowQueries(): Promise<any> {
		try {
			return await apiClient.get('monitoring/slow-queries');
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'monitoring/slow-queries');
		}
	}
};

/**
 * Auth API Service
 */
export const AuthService = {
	async login(username: string, password: string): Promise<any> {
		try {
			return await apiClient.post('auth/login', { 
				json: { username, password } 
			});
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'auth/login');
		}
	},

	async logout(): Promise<void> {
		try {
			await apiClient.post('auth/logout');
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'auth/logout');
		}
	},

	async refreshToken(): Promise<any> {
		try {
			return await apiClient.post('auth/refresh');
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'auth/refresh');
		}
	},

	async getProfile(): Promise<any> {
		try {
			return await apiClient.get('auth/profile');
		} catch (error) {
			throw await ErrorUtils.handleApiError(error, 'auth/profile');
		}
	}
};

// Export all services as a single object for convenience
export const ApiServices = {
	employees: EmployeeService,
	departments: DepartmentService,
	roles: RoleService,
	tasks: TaskService,
	compliance: ComplianceService,
	leave: LeaveService,
	documents: DocumentService,
	notifications: NotificationService,
	performance: PerformanceService,
	hrRequests: HRRequestService,
	monitoring: MonitoringService,
	auth: AuthService
};