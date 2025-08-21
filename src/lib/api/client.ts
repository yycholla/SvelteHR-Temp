import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { PUBLIC_API_URL } from '$env/static/public';
import type { 
  ApiResponse, 
  PaginatedResponse, 
  QueryParams, 
  BulkOperation,
  FileUploadProgress 
} from './types';

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
 * Modern Svelte 5 API Client with comprehensive MountainHR backend integration
 * Features: JWT auth, GraphQL-like queries, real-time WebSocket, bulk operations, file upload
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
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
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
   * Core request method with error handling and token refresh
   */
  private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const { params, skipAuth = false, skipRefresh = false, ...fetchConfig } = config;
    
    const requestConfig: RequestInit = {
      method: 'GET',
      headers: {
        ...(skipAuth ? {} : this.getAuthHeaders()),
        ...fetchConfig.headers,
      },
      ...fetchConfig,
    };

    if (requestConfig.body && typeof requestConfig.body === 'object' && !(requestConfig.body instanceof FormData)) {
      requestConfig.body = JSON.stringify(requestConfig.body);
    }

    try {
      const response = await fetch(this.buildUrl(endpoint, params), requestConfig);
      
      // Handle authentication errors with token refresh
      if (response.status === 401 && !skipAuth && !skipRefresh && this.token) {
        try {
          // Attempt token refresh
          const refreshResponse = await this.request<{ token: string }>('/api/v2/auth/rbac/refresh', { 
            method: 'POST',
            skipRefresh: true 
          });
          
          if (refreshResponse.success && refreshResponse.data?.token) {
            this.setToken(refreshResponse.data.token);
            // Retry original request
            return this.request<T>(endpoint, { ...config, skipRefresh: true });
          }
        } catch (refreshError) {
          // Refresh failed, clear token and redirect
          this.clearToken();
          if (browser) {
            await goto('/login');
          }
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
          details: data
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
      
      return {
        data: null,
        success: false,
        error: isNetworkError 
          ? 'Network error. Please check your internet connection and try again.' 
          : error instanceof Error ? error.message : 'An unexpected error occurred',
        status: isNetworkError ? 0 : 500,
        details: { originalError: error }
      };
    }
  }

  /**
   * Get user-friendly error message for HTTP status codes
   */
  private getStatusMessage(status: number): string {
    switch (status) {
      case 400: return 'Invalid request. Please check your input and try again.';
      case 401: return 'Authentication required. Please login.';
      case 403: return 'You do not have permission to perform this action.';
      case 404: return 'The requested resource was not found.';
      case 409: return 'A conflict occurred. The resource may already exist.';
      case 422: return 'Please check your input and try again.';
      case 429: return 'Too many requests. Please slow down and try again later.';
      case 500: return 'Server error. Please try again later.';
      case 502: return 'Service temporarily unavailable. Please try again.';
      case 503: return 'Service is currently under maintenance. Please try again later.';
      default: return status >= 500 
        ? 'Server error. Please try again later.'
        : 'Request failed. Please try again.';
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body: data });
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
      filter: (filters: Record<string, any>) => this.createQueryBuilder<T>(entity, { filter: filters }),
      sort: (field: string, order: 'ASC' | 'DESC' = 'ASC') => this.createQueryBuilder<T>(entity, { sort: field, order }),
      paginate: (page: number, pageSize: number = 50) => this.createQueryBuilder<T>(entity, { page, pageSize }),
      aggregate: (operations: Record<string, boolean | string[]>) => this.createQueryBuilder<T>(entity, { aggregate: operations }),
      execute: () => this.executeQuery<T>(entity, {}),
    };
  }

  /**
   * Create query builder with fluent API
   */
  private createQueryBuilder<T>(entity: string, options: QueryBuilderOptions<T>) {
    const builder = {
      select: (fields: (keyof T)[]) => this.createQueryBuilder<T>(entity, { ...options, fields }),
      include: (relations: string[]) => this.createQueryBuilder<T>(entity, { ...options, include: relations }),
      filter: (filters: Record<string, any>) => this.createQueryBuilder<T>(entity, { ...options, filter: { ...options.filter, ...filters } }),
      sort: (field: string, order: 'ASC' | 'DESC' = 'ASC') => this.createQueryBuilder<T>(entity, { ...options, sort: field, order }),
      paginate: (page: number, pageSize: number = 50) => this.createQueryBuilder<T>(entity, { ...options, page, pageSize }),
      aggregate: (operations: Record<string, boolean | string[]>) => this.createQueryBuilder<T>(entity, { ...options, aggregate: operations }),
      execute: () => this.executeQuery<T>(entity, options),
    };

    return builder;
  }

  /**
   * Execute query with built options
   */
  private async executeQuery<T>(entity: string, options: QueryBuilderOptions<T>): Promise<ApiResponse<PaginatedResponse<T>>> {
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
          Object.entries(value).forEach(([op, val]) => {
            params[`filter[${key}][${op}]`] = val;
          });
        } else {
          params[`filter[${key}]`] = value;
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

    return this.get<PaginatedResponse<T>>(`/query/${entity}`, params);
  }

  /**
   * Bulk operations
   */
  async bulk<T>(operation: BulkOperation<T>): Promise<ApiResponse<{ batch_id: string; status: string }>> {
    return this.post('/bulk', operation);
  }

  /**
   * Get bulk operation status
   */
  async getBulkStatus(batchId: string): Promise<ApiResponse<{ status: string; progress: number; errors?: any[] }>> {
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
              startTime: new Date().toISOString(),
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
   * Authentication methods
   */
  auth = {
    login: async (username: string, password: string) => {
      const response = await this.post<any>('/api/v2/auth/rbac/login', {
        username,
        password
      });

      if (response.success && response.data) {
        // Validate and transform the response using Zod
        try {
          const { v2LoginResponseSchema } = await import('$lib/schemas/auth');
          const validatedData = v2LoginResponseSchema.parse(response.data);
          
          // Set token and return properly structured response
          this.setToken(validatedData.token);
          
          return {
            ...response,
            data: validatedData
          };
        } catch (validationError) {
          console.error('Login response validation failed:', validationError);
          return {
            ...response,
            success: false,
            error: 'Invalid response format from server'
          };
        }
      }

      return response;
    },

    register: async (userData: { email: string; password: string; full_name: string; role_id?: string }) => {
      return this.post<{ user: any; message: string }>('/auth/v2/register', userData);
    },

    logout: async () => {
      const response = await this.post('/auth/v2/logout');
      this.clearToken();
      if (browser) {
        await goto('/login');
      }
      return response;
    },

    verify: async () => {
      return this.get<{ user: any; roles: any[]; permissions: string[] }>('/api/v2/auth/rbac/verify');
    },

    refresh: async () => {
      return this.post<{ token: string }>('/api/v2/auth/rbac/refresh');
    }
  };
}

// Create and export the default client instance
export const apiClient = new MountainHRApiClient();

// Backward compatibility exports
export const api = {
  get: <T = any>(endpoint: string, params?: Record<string, any>) => 
    apiClient.get<T>(endpoint, params),
  post: <T = any>(endpoint: string, data?: any) => 
    apiClient.post<T>(endpoint, data),
  put: <T = any>(endpoint: string, data?: any) => 
    apiClient.put<T>(endpoint, data),
  patch: <T = any>(endpoint: string, data?: any) => 
    apiClient.patch<T>(endpoint, data),
  delete: <T = any>(endpoint: string) => 
    apiClient.delete<T>(endpoint),
  auth: apiClient.auth,
  query: apiClient.query.bind(apiClient),
  bulk: apiClient.bulk.bind(apiClient),
  uploadFile: apiClient.uploadFile.bind(apiClient)
};

export type ApiClientType = typeof api;