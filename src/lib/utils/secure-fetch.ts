import { PUBLIC_API_URL } from '$env/static/public';
import { PRIVATE_API_URL } from '$env/static/private';

interface SecureFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

interface QueryParams {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Production-ready secure fetch utility for server-side API calls
 * Implements security best practices including timeout, validation, and error handling
 */
export class SecureApiClient {
  private readonly baseURL: string;
  private readonly defaultTimeout = 10000; // 10 seconds
  private readonly maxRetries = 3;

  constructor() {
    // Use private env var for server-side calls, fallback to public for development
    this.baseURL = PRIVATE_API_URL || PUBLIC_API_URL || 'http://localhost:8080';
    
    // Validate URL format
    if (!this.isValidUrl(this.baseURL)) {
      throw new Error('Invalid API base URL configuration');
    }
  }

  /**
   * Validate URL format and security
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      
      // Only allow HTTP in development, HTTPS in production
      const isSecure = parsedUrl.protocol === 'https:';
      const isDevelopment = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
      
      if (!isSecure && !isDevelopment) {
        console.error('🔒 Production API calls must use HTTPS');
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sanitize and validate query parameters
   */
  private sanitizeQueryParams(params: QueryParams): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(params)) {
      // Skip undefined/null values
      if (value === undefined || value === null) continue;
      
      // Validate key format (alphanumeric + underscore only)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        console.warn(`🚨 Invalid query parameter key: ${key}`);
        continue;
      }
      
      // Convert to string and sanitize
      const stringValue = String(value);
      
      // Basic length limit (prevent excessively long parameters)
      if (stringValue.length > 1000) {
        console.warn(`🚨 Query parameter too long: ${key}`);
        continue;
      }
      
      // URL encode the value
      sanitized[key] = encodeURIComponent(stringValue);
    }
    
    return sanitized;
  }

  /**
   * Build secure URL with validated query parameters
   */
  private buildSecureUrl(endpoint: string, params?: QueryParams): string {
    // Validate endpoint format
    if (!endpoint.startsWith('/')) {
      throw new Error('Endpoint must start with /');
    }
    
    // Prevent path traversal
    if (endpoint.includes('..') || endpoint.includes('//')) {
      throw new Error('Invalid endpoint path');
    }
    
    const url = new URL(endpoint, this.baseURL);
    
    if (params) {
      const sanitizedParams = this.sanitizeQueryParams(params);
      Object.entries(sanitizedParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    
    return url.toString();
  }

  /**
   * Create AbortController for timeout handling
   */
  private createTimeoutController(timeout: number): AbortController {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);
    
    // Clean up timeout when request completes
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });
    
    return controller;
  }

  /**
   * Secure fetch with comprehensive error handling and security measures
   */
  async secureFetch<T>(
    endpoint: string, 
    token: string,
    params?: QueryParams,
    options: SecureFetchOptions = {}
  ): Promise<{ success: boolean; data: T | null; error?: string; status?: number }> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.maxRetries
    } = options;

    // Validate inputs
    if (!token || typeof token !== 'string') {
      return { success: false, data: null, error: 'Invalid authentication token' };
    }
    
    if (token.length < 10) {
      return { success: false, data: null, error: 'Authentication token too short' };
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = this.createTimeoutController(timeout);
      
      try {
        const url = this.buildSecureUrl(endpoint, params);
        
        const requestConfig: RequestInit = {
          method,
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'SvelteHR-Server/1.0',
            // Security headers
            'X-Requested-With': 'SvelteHR',
            ...headers
          }
        };

        if (body && method !== 'GET') {
          if (typeof body === 'object') {
            requestConfig.body = JSON.stringify(body);
          } else {
            requestConfig.body = body;
          }
        }

        console.log(`🔒 Secure API call [attempt ${attempt + 1}]: ${method} ${endpoint}`);
        
        const response = await fetch(url, requestConfig);
        
        // Handle response
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          
          // Don't retry client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            return {
              success: false,
              data: null,
              error: `Client error: ${response.status} ${response.statusText}`,
              status: response.status
            };
          }
          
          // Retry server errors (5xx)
          if (attempt < retries) {
            lastError = new Error(`Server error: ${response.status} ${response.statusText}`);
            await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
            continue;
          }
          
          return {
            success: false,
            data: null,
            error: `Server error: ${response.status} ${response.statusText}`,
            status: response.status
          };
        }

        // Parse response
        const contentType = response.headers.get('content-type');
        let data: T;
        
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text() as T;
        }

        console.log(`✅ Secure API call successful: ${method} ${endpoint}`);
        
        return {
          success: true,
          data,
          status: response.status
        };

      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof Error) {
          // Don't retry timeout or network errors on last attempt
          if (attempt === retries) {
            if (error.name === 'AbortError') {
              return {
                success: false,
                data: null,
                error: 'Request timeout - server may be unavailable'
              };
            }
            
            return {
              success: false,
              data: null,
              error: `Network error: ${error.message}`
            };
          }
          
          // Wait before retry
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      } finally {
        controller.abort(); // Clean up
      }
    }

    return {
      success: false,
      data: null,
      error: lastError?.message || 'Request failed after retries'
    };
  }

  /**
   * Delay utility for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Convenience methods for common HTTP operations
   */
  async get<T>(endpoint: string, token: string, params?: QueryParams): Promise<{ success: boolean; data: T | null; error?: string; status?: number }> {
    return this.secureFetch<T>(endpoint, token, params, { method: 'GET' });
  }

  async post<T>(endpoint: string, token: string, body?: any): Promise<{ success: boolean; data: T | null; error?: string; status?: number }> {
    return this.secureFetch<T>(endpoint, token, undefined, { method: 'POST', body });
  }

  async put<T>(endpoint: string, token: string, body?: any): Promise<{ success: boolean; data: T | null; error?: string; status?: number }> {
    return this.secureFetch<T>(endpoint, token, undefined, { method: 'PUT', body });
  }

  async delete<T>(endpoint: string, token: string): Promise<{ success: boolean; data: T | null; error?: string; status?: number }> {
    return this.secureFetch<T>(endpoint, token, undefined, { method: 'DELETE' });
  }
}

// Export singleton instance
export const secureApiClient = new SecureApiClient();