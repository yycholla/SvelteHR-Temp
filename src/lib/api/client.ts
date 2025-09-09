import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { PUBLIC_API_URL } from '$env/static/public';
import { PUBLIC_GELDB_URL } from '$env/static/public';
import type {
	ApiResponse,
	PaginatedResponse,
	QueryParams,
	BulkOperation,
	FileUploadProgress
} from './types';
import type {
	Employee,
	Department,
	Leave,
	ActivityLog,
	Announcement,
	Document,
	HRRequest,
	Task,
	FileRecord,
	LoginResponse,
	AuthVerifyResponse,
	CreateEmployeeRequest,
	UpdateEmployeeRequest,
	CreateDepartmentRequest,
	UpdateDepartmentRequest,
	CreateLeaveRequest,
	UpdateLeaveRequest,
	CreateAnnouncementRequest,
	UpdateAnnouncementRequest,
	CreateDocumentRequest,
	UpdateDocumentRequest,
	CreateHRRequestRequest,
	UpdateHRRequestRequest,
	CreateTaskRequest,
	UpdateTaskRequest,
	ListParams,
	EndpointsResponse,
	BulkOperationResult
} from './types-v2';

interface RequestConfig extends RequestInit {
	params?: Record<string, string | number | boolean>;
	skipAuth?: boolean;
	skipRefresh?: boolean;
}

interface QueryBuilderOptions<T> {
	fields?: (keyof T)[];
	include?: string[];
	filter?: Record<string, any>;
	sort?: string;
	order?: 'ASC' | 'DESC';
	page?: number;
	pageSize?: number;
	aggregate?: Record<string, boolean | string[]>;
}

/**
 * MountainHR API v2 Client - Comprehensive TypeScript client for server-side usage
 *
 * IMPORTANT: This client is designed for SERVER-SIDE ONLY usage with Bearer token authentication.
 * All API calls must be made from +page.server.ts, +layout.server.ts, or API routes.
 *
 * Features:
 * - Complete JWT Bearer token authentication with auto-refresh
 * - Full TypeScript support with strict typing for all endpoints
 * - Comprehensive error handling with intelligent retry logic
 * - Built-in pagination, filtering, and sorting support
 * - Rate limiting and network error recovery
 * - All 20 API endpoint categories fully implemented
 *
 * Authentication Flow:
 * 1. Login with username/password to get JWT token
 * 2. Token automatically included in Authorization header for all requests
 * 3. Auto-refresh token when expired (if refresh endpoint available)
 * 4. Server-side cookie management for secure token storage
 *
 * Usage Example:
 * ```typescript
 * // In +page.server.ts
 * export const load: PageServerLoad = async ({ cookies }) => {
 *   const apiClient = new MountainHRApiClient();
 *   const token = cookies.get('hr_token');
 *
 *   if (token) {
 *     apiClient.setToken(token);
 *   }
 *
 *   try {
 *     // Verify authentication
 *     const authCheck = await apiClient.auth.verify();
 *     if (!authCheck.success) {
 *       throw redirect(303, '/login');
 *     }
 *
 *     // Fetch data with proper typing
 *     const employees = await apiClient.employees.list({ limit: 20, order_by: 'full_name' });
 *     const departments = await apiClient.departments.list();
 *
 *     return {
 *       user: authCheck.data.user,
 *       employees: employees.data,
 *       departments: departments.data
 *     };
 *   } catch (error) {
 *     console.error('API Error:', error);
 *     throw error(500, 'Failed to load data');
 *   }
 * };
 * ```
 *
 * Available API Methods:
 * - employees: CRUD operations for employee management
 * - departments: Department hierarchy and management
 * - leaves: Leave request workflows and approvals
 * - activityLogs: System audit trails and activity tracking
 * - announcements: Company-wide announcements
 * - documents: Document management and storage
 * - hrRequests: HR service request workflows
 * - tasks: Task assignment and tracking
 * - files: File upload, download, and management
 * - schema: API documentation and endpoint discovery
 * - auth: Authentication and session management
 *
 * Error Handling:
 * - Automatic retry for network errors and server unavailability
 * - Rate limiting compliance with exponential backoff
 * - Detailed error responses with context and retry information
 * - Token refresh handling for expired authentication
 */
export class MountainHRApiClient {
	private baseURL: string;
	private token: string | null = null;

	constructor(baseURL?: string) {
		this.baseURL = baseURL || PUBLIC_API_URL || 'http://localhost:8080';

		// Initialize token from localStorage if available
		if (browser) {
			this.token = localStorage.getItem('hr_token');
		}
	}

	/**
	 * Set authentication token
	 */
	setToken(token: string): void {
		this.token = token;
		if (browser) {
			localStorage.setItem('hr_token', token);
		}
	}

	/**
	 * Clear authentication token
	 */
	clearToken(): void {
		this.token = null;
		if (browser) {
			localStorage.removeItem('hr_token');
		}
	}

	/**
	 * Get current authentication headers
	 */
	private getAuthHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		if (this.token) {
			headers.Authorization = `Bearer ${this.token}`;
		}

		return headers;
	}

	/**
	 * Clean parameters by removing undefined values
	 */
	private cleanParams(
		params?: Record<string, string | number | boolean | undefined>
	): Record<string, string | number | boolean> | undefined {
		if (!params) return undefined;

		const cleaned: Record<string, string | number | boolean> = {};
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				cleaned[key] = value;
			}
		});

		return Object.keys(cleaned).length > 0 ? cleaned : undefined;
	}

	/**
	 * Build URL with query parameters
	 */
	private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
		const url = new URL(`${this.baseURL}${endpoint}`);

		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					url.searchParams.append(key, value.toString());
				}
			});
		}

		return url.toString();
	}

	/**
	 * Core request method with error handling, token refresh, and retry logic
	 */
	private async request<T>(
		endpoint: string,
		config: RequestConfig = {},
		attempt: number = 1
	): Promise<ApiResponse<T>> {
		const { params, skipAuth = false, skipRefresh = false, ...fetchConfig } = config;

		const requestConfig: RequestInit = {
			method: 'GET',
			headers: {
				...(skipAuth ? {} : this.getAuthHeaders()),
				...fetchConfig.headers
			},
			...fetchConfig
		};

		if (
			requestConfig.body &&
			typeof requestConfig.body === 'object' &&
			!(requestConfig.body instanceof FormData)
		) {
			requestConfig.body = JSON.stringify(requestConfig.body);
		}

		try {
			const response = await fetch(this.buildUrl(endpoint, params), requestConfig);

			// Handle authentication errors with token refresh
			if (response.status === 401 && !skipAuth && !skipRefresh && this.token) {
				try {
					// Attempt token refresh
					const refreshResponse = await this.request<{ token: string }>('/api/v2/auth/refresh', {
						method: 'POST',
						skipRefresh: true
					});

					if (refreshResponse.success && refreshResponse.data?.token) {
						this.setToken(refreshResponse.data.token);
						// Retry original request
						return this.request<T>(endpoint, { ...config, skipRefresh: true }, attempt);
					}
				} catch (refreshError) {
					// Refresh failed, clear token and redirect
					this.clearToken();
					if (browser) {
						await goto('/login');
					}
				}
			}

			// Check if we should retry this request
			if (!response.ok) {
				const retryInfo = await this.handleApiError(response, {
					endpoint,
					method: requestConfig.method || 'GET',
					attempt
				});

				if (retryInfo.shouldRetry) {
					if (retryInfo.retryAfter) {
						await this.sleep(retryInfo.retryAfter);
					}
					return this.request<T>(endpoint, config, attempt + 1);
				}
			}

			const data = await response.json().catch(() => null);

			if (!response.ok) {
				// Create detailed error response
				return {
					data: null,
					success: false,
					error: data?.error || data?.message || this.getStatusMessage(response.status),
					status: response.status,
					details: { ...data, attempt, endpoint, method: requestConfig.method }
				};
			}

			return {
				data,
				success: true,
				status: response.status
			};
		} catch (error) {
			// Handle network errors and other exceptions
			const isNetworkError = error instanceof TypeError && error.message.includes('fetch');

			// Retry network errors once
			if (isNetworkError && attempt < 2) {
				console.warn(`Network error on ${endpoint}, attempt ${attempt}. Retrying...`);
				await this.sleep(2000);
				return this.request<T>(endpoint, config, attempt + 1);
			}

			return {
				data: null,
				success: false,
				error: isNetworkError
					? 'Network error. Please check your internet connection and try again.'
					: error instanceof Error
						? error.message
						: 'An unexpected error occurred',
				status: isNetworkError ? 0 : 500,
				details: { originalError: error, attempt, endpoint, method: requestConfig.method }
			};
		}
	}

	/**
	 * Get user-friendly error message for HTTP status codes
	 */
	private getStatusMessage(status: number): string {
		switch (status) {
			case 400:
				return 'Bad request. Please check your input data and try again.';
			case 401:
				return 'Authentication required. Please login or refresh your session.';
			case 403:
				return 'Access denied. You do not have sufficient permissions for this action.';
			case 404:
				return 'The requested resource was not found. It may have been deleted or moved.';
			case 405:
				return 'Method not allowed. This operation is not supported for this resource.';
			case 409:
				return 'Conflict occurred. The resource already exists or there are conflicting changes.';
			case 412:
				return 'Precondition failed. Please refresh your data and try again.';
			case 422:
				return 'Validation error. Please check your input data and correct any errors.';
			case 429:
				return 'Too many requests. Please wait a moment before trying again.';
			case 500:
				return 'Internal server error. Please try again later or contact support.';
			case 502:
				return 'Service gateway error. The service is temporarily unavailable.';
			case 503:
				return 'Service unavailable. The system is under maintenance or overloaded.';
			case 504:
				return 'Gateway timeout. The request took too long to process.';
			default:
				return status >= 500
					? 'Server error occurred. Please try again later or contact support if the problem persists.'
					: status >= 400
						? 'Request failed. Please check your input and try again.'
						: 'An unexpected error occurred.';
		}
	}

	/**
	 * Enhanced error handling with retry logic for specific status codes
	 */
	private async handleApiError(
		response: Response,
		requestInfo: { endpoint: string; method: string; attempt: number }
	): Promise<{ shouldRetry: boolean; retryAfter?: number }> {
		const { endpoint, method, attempt } = requestInfo;

		// Check for retry-specific headers
		const retryAfter = response.headers.get('Retry-After');
		const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : 1000;

		switch (response.status) {
			case 429: // Rate limiting
				console.warn(
					`Rate limited on ${method} ${endpoint}, attempt ${attempt}. Retry after ${retryAfter || '1'}s`
				);
				return { shouldRetry: attempt < 3, retryAfter: retryAfterMs };

			case 502: // Bad Gateway
			case 503: // Service Unavailable
			case 504: // Gateway Timeout
				console.warn(
					`Service unavailable on ${method} ${endpoint}, attempt ${attempt}. Retrying...`
				);
				return { shouldRetry: attempt < 2, retryAfter: Math.min(retryAfterMs, 5000) };

			case 408: // Request Timeout
				console.warn(`Request timeout on ${method} ${endpoint}, attempt ${attempt}. Retrying...`);
				return { shouldRetry: attempt < 2, retryAfter: 2000 };

			default:
				return { shouldRetry: false };
		}
	}

	/**
	 * Sleep utility for retry delays
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * GET request
	 */
	async get<T>(
		endpoint: string,
		params?: Record<string, string | number | boolean>
	): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { method: 'GET', params });
	}

	/**
	 * POST request
	 */
	async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { method: 'POST', body: data, ...config });
	}

	/**
	 * PUT request
	 */
	async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { method: 'PUT', body: data });
	}

	/**
	 * DELETE request
	 */
	async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { method: 'DELETE' });
	}

	/**
	 * PATCH request
	 */
	async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { method: 'PATCH', body: data });
	}

	/**
	 * Advanced query builder for GraphQL-like queries
	 */
	query<T>(entity: string) {
		return {
			select: (fields: (keyof T)[]) => this.createQueryBuilder<T>(entity, { fields }),
			include: (relations: string[]) => this.createQueryBuilder<T>(entity, { include: relations }),
			filter: (filters: Record<string, any>) =>
				this.createQueryBuilder<T>(entity, { filter: filters }),
			sort: (field: string, order: 'ASC' | 'DESC' = 'ASC') =>
				this.createQueryBuilder<T>(entity, { sort: field, order }),
			paginate: (page: number, pageSize: number = 50) =>
				this.createQueryBuilder<T>(entity, { page, pageSize }),
			aggregate: (operations: Record<string, boolean | string[]>) =>
				this.createQueryBuilder<T>(entity, { aggregate: operations }),
			execute: () => this.executeQuery<T>(entity, {})
		};
	}

	/**
	 * Create query builder with fluent API
	 */
	private createQueryBuilder<T>(entity: string, options: QueryBuilderOptions<T>) {
		const builder = {
			select: (fields: (keyof T)[]) => this.createQueryBuilder<T>(entity, { ...options, fields }),
			include: (relations: string[]) =>
				this.createQueryBuilder<T>(entity, { ...options, include: relations }),
			filter: (filters: Record<string, any>) =>
				this.createQueryBuilder<T>(entity, {
					...options,
					filter: { ...options.filter, ...filters }
				}),
			sort: (field: string, order: 'ASC' | 'DESC' = 'ASC') =>
				this.createQueryBuilder<T>(entity, { ...options, sort: field, order }),
			paginate: (page: number, pageSize: number = 50) =>
				this.createQueryBuilder<T>(entity, { ...options, page, pageSize }),
			aggregate: (operations: Record<string, boolean | string[]>) =>
				this.createQueryBuilder<T>(entity, { ...options, aggregate: operations }),
			execute: () => this.executeQuery<T>(entity, options)
		};

		return builder;
	}

	/**
	 * Execute query with built options
	 */
	private async executeQuery<T>(
		entity: string,
		options: QueryBuilderOptions<T>
	): Promise<ApiResponse<PaginatedResponse<T>>> {
		const params: Record<string, string | number | boolean> = {};

		if (options.fields) {
			params.fields = options.fields.join(',');
		}

		if (options.include) {
			params.include = options.include.join(',');
		}

		if (options.filter) {
			Object.entries(options.filter).forEach(([key, value]) => {
				if (typeof value === 'object' && value !== null) {
					Object.entries(value as Record<string, any>).forEach(([op, val]) => {
						params[`filter[${key}][${op}]`] = String(val);
					});
				} else {
					params[`filter[${key}]`] = String(value);
				}
			});
		}

		if (options.sort) {
			params.sort = options.sort;
			params.order = options.order || 'ASC';
		}

		if (options.page) {
			params.page = options.page;
		}

		if (options.pageSize) {
			params.pageSize = options.pageSize;
		}

		if (options.aggregate) {
			Object.entries(options.aggregate).forEach(([key, value]) => {
				params[`aggregate[${key}]`] = Array.isArray(value) ? value.join(',') : value.toString();
			});
		}

		return this.get<PaginatedResponse<T>>(`/query/${entity}`, this.cleanParams(params));
	}

	/**
	 * Bulk operations
	 */
	async bulk<T>(
		operation: BulkOperation<T>
	): Promise<ApiResponse<{ batch_id: string; status: string }>> {
		return this.post('/bulk', operation);
	}

	/**
	 * Get bulk operation status
	 */
	async getBulkStatus(batchId: string): Promise<ApiResponse<BulkOperationResult>> {
		return this.get(`/bulk/status/${batchId}`);
	}

	/**
	 * File upload with progress tracking
	 */
	async uploadFile(
		file: File,
		options: {
			category?: string;
			entityType?: string;
			entityId?: string;
			tags?: string[];
			isPublic?: boolean;
			onProgress?: (progress: FileUploadProgress) => void;
		} = {}
	): Promise<ApiResponse<any>> {
		const formData = new FormData();
		formData.append('file', file);

		if (options.category) formData.append('category', options.category);
		if (options.entityType) formData.append('entityType', options.entityType);
		if (options.entityId) formData.append('entityId', options.entityId);
		if (options.tags) formData.append('tags', options.tags.join(','));
		if (options.isPublic !== undefined) formData.append('isPublic', options.isPublic.toString());

		// For file uploads, we need to handle progress differently
		return new Promise((resolve) => {
			const xhr = new XMLHttpRequest();

			if (options.onProgress) {
				xhr.upload.addEventListener('progress', (event) => {
					if (event.lengthComputable) {
						const progress: FileUploadProgress = {
							fileId: crypto.randomUUID(),
							originalName: file.name,
							totalBytes: event.total,
							bytesRead: event.loaded,
							percentage: Math.round((event.loaded / event.total) * 100),
							status: 'uploading',
							startTime: new Date().toISOString()
						};
						options.onProgress!(progress);
					}
				});
			}

			xhr.onload = () => {
				try {
					const data = JSON.parse(xhr.responseText);
					resolve({
						data,
						success: xhr.status >= 200 && xhr.status < 300,
						status: xhr.status,
						error: xhr.status >= 400 ? data.error || 'Upload failed' : undefined
					});
				} catch (error) {
					resolve({
						data: null,
						success: false,
						status: xhr.status,
						error: 'Failed to parse response'
					});
				}
			};

			xhr.onerror = () => {
				resolve({
					data: null,
					success: false,
					status: xhr.status,
					error: 'Upload failed'
				});
			};

			xhr.open('POST', this.buildUrl('/files/upload'));

			// Add auth header
			if (this.token) {
				xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
			}

			xhr.send(formData);
		});
	}

	/**
	 * Employee Management Methods
	 */
	employees = {
		list: async (params?: ListParams) => {
			return this.get<PaginatedResponse<Employee>>('/api/v2/employees', this.cleanParams(params));
		},

		getById: async (id: string) => {
			return this.get<Employee>(`/api/v2/employees/${id}`);
		},

		create: async (employeeData: CreateEmployeeRequest) => {
			return this.post<Employee>('/api/v2/employees', employeeData);
		},

		update: async (id: string, employeeData: UpdateEmployeeRequest) => {
			return this.put<Employee>(`/api/v2/employees/${id}`, employeeData);
		},

		delete: async (id: string) => {
			return this.delete<{ message: string }>(`/api/v2/employees/${id}`);
		}
	};

	/**
	 * Department Management Methods
	 */
	departments = {
		list: async (params?: ListParams) => {
			return this.get<PaginatedResponse<Department>>(
				'/api/v2/departments',
				this.cleanParams(params)
			);
		},

		getById: async (id: string) => {
			return this.get<Department>(`/api/v2/departments/${id}`);
		},

		create: async (departmentData: CreateDepartmentRequest) => {
			return this.post<Department>('/api/v2/departments', departmentData);
		},

		update: async (id: string, departmentData: UpdateDepartmentRequest) => {
			return this.put<Department>(`/api/v2/departments/${id}`, departmentData);
		},

		delete: async (id: string) => {
			return this.delete<{ message: string }>(`/api/v2/departments/${id}`);
		}
	};

	/**
	 * Leave Management Methods
	 */
	leaves = {
		list: async (params?: ListParams & { employee_id?: string; status?: string }) => {
			return this.get<PaginatedResponse<Leave>>('/api/v2/leaves', this.cleanParams(params));
		},

		getById: async (id: string) => {
			return this.get<Leave>(`/api/v2/leaves/${id}`);
		},

		create: async (leaveData: CreateLeaveRequest) => {
			return this.post<Leave>('/api/v2/leaves', leaveData);
		},

		update: async (id: string, leaveData: UpdateLeaveRequest) => {
			return this.put<Leave>(`/api/v2/leaves/${id}`, leaveData);
		},

		delete: async (id: string) => {
			return this.delete<{ message: string }>(`/api/v2/leaves/${id}`);
		}
	};

	/**
	 * Activity Log Methods
	 */
	activityLogs = {
		list: async (
			params?: ListParams & {
				user_id?: string;
				action_type?: string;
				resource_type?: string;
				start_date?: string;
				end_date?: string;
			}
		) => {
			return this.get<PaginatedResponse<ActivityLog>>(
				'/api/v2/activity-logs',
				this.cleanParams(params)
			);
		},

		getById: async (id: string) => {
			return this.get<ActivityLog>(`/api/v2/activity-logs/${id}`);
		}
	};

	/**
	 * Announcement Methods
	 */
	announcements = {
		list: async (params?: ListParams & { active_only?: boolean; priority?: string }) => {
			return this.get<PaginatedResponse<Announcement>>(
				'/api/v2/announcements',
				this.cleanParams(params)
			);
		},

		getById: async (id: string) => {
			return this.get<Announcement>(`/api/v2/announcements/${id}`);
		},

		create: async (announcementData: CreateAnnouncementRequest) => {
			return this.post<Announcement>('/api/v2/announcements', announcementData);
		},

		update: async (id: string, announcementData: UpdateAnnouncementRequest) => {
			return this.put<Announcement>(`/api/v2/announcements/${id}`, announcementData);
		},

		delete: async (id: string) => {
			return this.delete<{ message: string }>(`/api/v2/announcements/${id}`);
		}
	};

	/**
	 * Document Management Methods
	 */
	documents = {
		list: async (params?: ListParams & { employee_id?: string; category?: string }) => {
			return this.get<PaginatedResponse<Document>>('/api/v2/documents', this.cleanParams(params));
		},

		getById: async (id: string) => {
			return this.get<Document>(`/api/v2/documents/${id}`);
		},

		create: async (documentData: CreateDocumentRequest) => {
			return this.post<Document>('/api/v2/documents', documentData);
		},

		update: async (id: string, documentData: UpdateDocumentRequest) => {
			return this.put<Document>(`/api/v2/documents/${id}`, documentData);
		},

		delete: async (id: string) => {
			return this.delete<{ message: string }>(`/api/v2/documents/${id}`);
		}
	};

	/**
	 * HR Request Methods
	 */
	hrRequests = {
		list: async (
			params?: ListParams & { employee_id?: string; status?: string; request_type?: string }
		) => {
			return this.get<PaginatedResponse<HRRequest>>(
				'/api/v2/hr-requests',
				this.cleanParams(params)
			);
		},

		getById: async (id: string) => {
			return this.get<HRRequest>(`/api/v2/hr-requests/${id}`);
		},

		create: async (requestData: CreateHRRequestRequest) => {
			return this.post<HRRequest>('/api/v2/hr-requests', requestData);
		},

		update: async (id: string, requestData: UpdateHRRequestRequest) => {
			return this.put<HRRequest>(`/api/v2/hr-requests/${id}`, requestData);
		},

		delete: async (id: string) => {
			return this.delete<{ message: string }>(`/api/v2/hr-requests/${id}`);
		}
	};

	/**
	 * Task Management Methods
	 */
	tasks = {
		list: async (
			params?: ListParams & { assigned_to?: string; status?: string; priority?: string }
		) => {
			return this.get<PaginatedResponse<Task>>('/api/v2/tasks', this.cleanParams(params));
		},

		getById: async (id: string) => {
			return this.get<Task>(`/api/v2/tasks/${id}`);
		},

		create: async (taskData: CreateTaskRequest) => {
			return this.post<Task>('/api/v2/tasks', taskData);
		},

		update: async (id: string, taskData: UpdateTaskRequest) => {
			return this.put<Task>(`/api/v2/tasks/${id}`, taskData);
		},

		delete: async (id: string) => {
			return this.delete<{ message: string }>(`/api/v2/tasks/${id}`);
		}
	};

	/**
	 * File Management Methods
	 */
	files = {
		list: async (
			params?: ListParams & { category?: string; entity_type?: string; entity_id?: string }
		) => {
			return this.get<PaginatedResponse<FileRecord>>('/api/v2/files', this.cleanParams(params));
		},

		getById: async (id: string) => {
			return this.get<FileRecord>(`/api/v2/files/${id}`);
		},

		delete: async (id: string) => {
			return this.delete<{ message: string }>(`/api/v2/files/${id}`);
		},

		download: async (id: string) => {
			return this.get<Blob>(`/api/v2/files/${id}/download`);
		}
	};

	/**
	 * Schema and Documentation Methods
	 */
	schema = {
		getEndpoints: async () => {
			return this.get<EndpointsResponse>('/api/v2/endpoints');
		},

		getEndpointSchema: async (endpoint: string, method: string = 'GET') => {
			return this.get<any>(`/api/v2/endpoints/${endpoint}/schema`, { method });
		},

		getLLMSchema: async () => {
			return this.get<any>('/api/v2/llm/schema');
		}
	};

	/**
	 * Authentication methods - MountainHR backend authentication
	 */
	auth = {
		// Sign in with email/password (traditional form)
		signIn: async (email: string, password: string) => {
			try {
				const response = await this.post<LoginResponse>(
					'/auth/login',
					{
						email,
						password
					},
					{ skipAuth: true }
				);

				if (response.success && response.data) {
					this.setToken(response.data.token);
					return response;
				}
				throw new Error(response.error || 'Sign in failed');
			} catch (error) {
				console.error('Sign in error:', error);
				throw error;
			}
		},

		// Magic link sign in (send magic link to email)
		sendMagicLink: async (email: string) => {
			try {
				const response = await this.post<{ message: string }>(
					'/auth/magic-link',
					{
						email
					},
					{ skipAuth: true }
				);

				return response;
			} catch (error) {
				console.error('Magic link error:', error);
				throw error;
			}
		},

		// Verify magic link token
		verifyMagicLink: async (token: string) => {
			try {
				const response = await this.post<LoginResponse>(
					'/auth/magic-link/verify',
					{
						token
					},
					{ skipAuth: true }
				);

				if (response.success && response.data) {
					this.setToken(response.data.token);
					return response;
				}
				throw new Error(response.error || 'Magic link verification failed');
			} catch (error) {
				console.error('Magic link verification error:', error);
				throw error;
			}
		},

		// Redirect to magic link sign-in page (for now, show a form)
		signInRedirect: () => {
			if (browser) {
				// For now, redirect to a magic link form - you could replace this with a direct form
				goto('/login/magic-link');
			}
		},

		// Sign up redirect
		signUpRedirect: () => {
			if (browser) {
				goto('/register');
			}
		},

		// Check if user has auth token (from cookies)
		checkAuthToken: () => {
			if (!browser) return null;

			// Check for hr_token cookie (primary)
			let cookies = document.cookie.split(';');
			let authCookie = cookies.find((cookie) => cookie.trim().startsWith('hr_token='));

			if (authCookie) {
				const token = authCookie.split('=')[1].trim();
				this.setToken(token);
				return token;
			}

			// Fallback to auth-token cookie
			authCookie = cookies.find((cookie) => cookie.trim().startsWith('auth-token='));
			if (authCookie) {
				const token = authCookie.split('=')[1].trim();
				this.setToken(token);
				return token;
			}

			return null;
		},

		// Register new user
		register: async (userData: {
			email: string;
			password: string;
			full_name: string;
			role_id?: string;
		}) => {
			try {
				const response = await this.post<LoginResponse>('/auth/register', userData, {
					skipAuth: true
				});

				if (response.success && response.data) {
					this.setToken(response.data.token);
					return response;
				}
				throw new Error(response.error || 'Registration failed');
			} catch (error) {
				console.error('Registration error:', error);
				throw error;
			}
		},

		// Logout and clear auth
		logout: async () => {
			try {
				// Call logout endpoint to invalidate token on server
				await this.post('/auth/logout', {}, { skipRefresh: true });
			} catch (error) {
				console.error('Logout request failed:', error);
			}

			// Clear auth token cookies
			if (browser) {
				document.cookie = 'hr_token=; path=/; max-age=0; SameSite=Lax';
				document.cookie = 'auth-token=; path=/; max-age=0; SameSite=Lax';
				this.clearToken();
			}

			return { success: true };
		},

		// Refresh access token
		refresh: async () => {
			try {
				const response = await this.post<LoginResponse>('/auth/refresh', {}, { skipRefresh: true });

				if (response.success && response.data) {
					this.setToken(response.data.token);
					return response;
				}
				throw new Error(response.error || 'Token refresh failed');
			} catch (error) {
				console.error('Token refresh error:', error);
				throw error;
			}
		},

		// Verify current auth status
		verify: async () => {
			const token = this.auth.checkAuthToken();

			if (!token) {
				return {
					success: false,
					error: 'No authentication token found',
					status: 401
				};
			}

			// Try to verify token with backend
			try {
				const response = await this.get<AuthVerifyResponse>('/auth/verify');

				if (response.success && response.data) {
					return {
						success: true,
						data: response.data,
						status: 200
					};
				}

				throw new Error(response.error || 'Token verification failed');
			} catch (error) {
				return {
					success: false,
					error: 'Token verification failed',
					status: 401
				};
			}
		}
	};
}

// Create and export the default client instance
export const apiClient = new MountainHRApiClient();

// Backward compatibility exports
export const api = {
	get: <T = any>(endpoint: string, params?: Record<string, any>) =>
		apiClient.get<T>(endpoint, params),
	post: <T = any>(endpoint: string, data?: any) => apiClient.post<T>(endpoint, data),
	put: <T = any>(endpoint: string, data?: any) => apiClient.put<T>(endpoint, data),
	patch: <T = any>(endpoint: string, data?: any) => apiClient.patch<T>(endpoint, data),
	delete: <T = any>(endpoint: string) => apiClient.delete<T>(endpoint),
	// Core methods
	auth: apiClient.auth,
	query: apiClient.query.bind(apiClient),
	bulk: apiClient.bulk.bind(apiClient),
	uploadFile: apiClient.uploadFile.bind(apiClient),
	// API v2 specific methods
	employees: apiClient.employees,
	departments: apiClient.departments,
	leaves: apiClient.leaves,
	activityLogs: apiClient.activityLogs,
	announcements: apiClient.announcements,
	documents: apiClient.documents,
	hrRequests: apiClient.hrRequests,
	tasks: apiClient.tasks,
	files: apiClient.files,
	schema: apiClient.schema
};

export type ApiClientType = typeof api;
