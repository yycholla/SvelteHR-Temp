import type { Employee, Task } from '$lib/stores/hr/employees';

const API_BASE = 'http://localhost:8080/api/v1';

// API response types
export interface ApiResponse<T> {
	data: T;
	message?: string;
	success: boolean;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
	total_pages: number;
}

export interface ApiError {
	message: string;
	code?: string;
	details?: any;
}

// Generic API request function
async function apiRequest<T>(
	endpoint: string,
	options: RequestInit = {}
): Promise<ApiResponse<T>> {
	const url = `${API_BASE}${endpoint}`;
	
	const defaultHeaders = {
		'Content-Type': 'application/json',
		...options.headers
	};

	// Add auth token if available
	const token = localStorage.getItem('auth_token');
	if (token) {
		defaultHeaders['Authorization'] = `Bearer ${token}`;
	}

	try {
		const response = await fetch(url, {
			...options,
			headers: defaultHeaders
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: 'Network error' }));
			throw new Error(errorData.message || `HTTP ${response.status}`);
		}

		const data = await response.json();
		return data;
	} catch (error) {
		console.error(`API Error [${endpoint}]:`, error);
		throw error;
	}
}

// Employee API functions
export const employeeApi = {
	getAll: async (params: Record<string, any> = {}) => {
		const searchParams = new URLSearchParams();
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== '') {
				searchParams.append(key, String(value));
			}
		});
		
		const endpoint = `/employees${searchParams.toString() ? `?${searchParams}` : ''}`;
		return apiRequest<PaginatedResponse<Employee>>(endpoint);
	},

	getById: async (id: string) => {
		return apiRequest<Employee>(`/employees/${id}`);
	},

	create: async (employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
		return apiRequest<Employee>('/employees', {
			method: 'POST',
			body: JSON.stringify(employeeData)
		});
	},

	update: async (id: string, employeeData: Partial<Employee>) => {
		return apiRequest<Employee>(`/employees/${id}`, {
			method: 'PUT',
			body: JSON.stringify(employeeData)
		});
	},

	delete: async (id: string) => {
		return apiRequest<void>(`/employees/${id}`, {
			method: 'DELETE'
		});
	}
};

// Task API functions
export const taskApi = {
	getAll: async (params: Record<string, any> = {}) => {
		const searchParams = new URLSearchParams();
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== '') {
				searchParams.append(key, String(value));
			}
		});
		
		const endpoint = `/tasks${searchParams.toString() ? `?${searchParams}` : ''}`;
		return apiRequest<PaginatedResponse<Task>>(endpoint);
	},

	getById: async (id: string) => {
		return apiRequest<Task>(`/tasks/${id}`);
	},

	create: async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
		return apiRequest<Task>('/tasks', {
			method: 'POST',
			body: JSON.stringify(taskData)
		});
	},

	update: async (id: string, taskData: Partial<Task>) => {
		return apiRequest<Task>(`/tasks/${id}`, {
			method: 'PUT',
			body: JSON.stringify(taskData)
		});
	},

	delete: async (id: string) => {
		return apiRequest<void>(`/tasks/${id}`, {
			method: 'DELETE'
		});
	},

	assign: async (taskId: string, employeeId: string) => {
		return apiRequest<Task>(`/tasks/${taskId}/assign`, {
			method: 'POST',
			body: JSON.stringify({ assigned_to: employeeId })
		});
	},

	updateStatus: async (taskId: string, status: Task['status']) => {
		return apiRequest<Task>(`/tasks/${taskId}/status`, {
			method: 'PUT',
			body: JSON.stringify({ status })
		});
	}
};

// Leave request API functions
export const leaveApi = {
	getAll: async (params: Record<string, any> = {}) => {
		const searchParams = new URLSearchParams();
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== '') {
				searchParams.append(key, String(value));
			}
		});
		
		const endpoint = `/leave${searchParams.toString() ? `?${searchParams}` : ''}`;
		return apiRequest<PaginatedResponse<any>>(endpoint);
	},

	create: async (leaveData: any) => {
		return apiRequest<any>('/leave', {
			method: 'POST',
			body: JSON.stringify(leaveData)
		});
	},

	approve: async (leaveId: string) => {
		return apiRequest<any>(`/leave/${leaveId}/approve`, {
			method: 'POST'
		});
	},

	deny: async (leaveId: string, reason: string) => {
		return apiRequest<any>(`/leave/${leaveId}/deny`, {
			method: 'POST',
			body: JSON.stringify({ reason })
		});
	}
};

// Document API functions
export const documentApi = {
	upload: async (file: File, metadata: any) => {
		const formData = new FormData();
		formData.append('file', file);
		formData.append('metadata', JSON.stringify(metadata));

		return apiRequest<any>('/documents/upload', {
			method: 'POST',
			body: formData,
			headers: {} // Let browser set Content-Type for FormData
		});
	},

	getAll: async (params: Record<string, any> = {}) => {
		const searchParams = new URLSearchParams();
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== '') {
				searchParams.append(key, String(value));
			}
		});
		
		const endpoint = `/documents${searchParams.toString() ? `?${searchParams}` : ''}`;
		return apiRequest<PaginatedResponse<any>>(endpoint);
	},

	getById: async (id: string) => {
		return apiRequest<any>(`/documents/${id}`);
	},

	delete: async (id: string) => {
		return apiRequest<void>(`/documents/${id}`, {
			method: 'DELETE'
		});
	}
};

// Utility functions
export function handleApiError(error: any): string {
	if (error instanceof Error) {
		return error.message;
	}
	return 'An unexpected error occurred';
}

export function isApiError(error: any): error is ApiError {
	return error && typeof error.message === 'string';
}

export async function withRetry<T>(
	fn: () => Promise<T>,
	retries: number = 3,
	delay: number = 1000
): Promise<T> {
	try {
		return await fn();
	} catch (error) {
		if (retries > 0) {
			await new Promise(resolve => setTimeout(resolve, delay));
			return withRetry(fn, retries - 1, delay * 2);
		}
		throw error;
	}
}

// Cache utilities
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function getCachedData<T>(key: string): T | null {
	const cached = cache.get(key);
	if (!cached) return null;
	
	if (Date.now() - cached.timestamp > CACHE_DURATION) {
		cache.delete(key);
		return null;
	}
	
	return cached.data;
}

export function setCachedData<T>(key: string, data: T): void {
	cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(pattern?: string): void {
	if (!pattern) {
		cache.clear();
		return;
	}
	
	for (const key of cache.keys()) {
		if (key.includes(pattern)) {
			cache.delete(key);
		}
	}
}