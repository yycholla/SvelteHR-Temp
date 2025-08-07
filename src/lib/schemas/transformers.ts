import { z } from 'zod';

/**
 * Schema transformation utilities for handling different API response formats
 * This handles the mixed case fields (uppercase vs lowercase) across different endpoints
 */

// Generic field mapper type
type FieldMapper<T> = {
  [K in keyof T]: string | ((data: any) => T[K]);
};

/**
 * Creates a flexible schema that can handle multiple field name formats
 * @param baseFields - The normalized field definitions
 * @param fieldMappings - Array of possible field mappings from API responses
 */
export function createFlexibleSchema<T>(
  baseFields: z.ZodRawShape,
  fieldMappings: FieldMapper<any>[]
) {
  // Create union of all possible formats
  const schemas = fieldMappings.map(mapping => {
    const mappedFields: z.ZodRawShape = {};
    
    Object.entries(mapping).forEach(([normalizedKey, apiKey]) => {
      if (typeof apiKey === 'string') {
        mappedFields[apiKey] = baseFields[normalizedKey];
      } else {
        // For computed fields, we'll handle them in transform
        mappedFields[normalizedKey] = baseFields[normalizedKey];
      }
    });
    
    return z.object(mappedFields);
  });

  // Return union schema with transformation
  return z.union(schemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
}

/**
 * Normalizes API response data to a consistent format
 * @param data - Raw API response data
 * @param fieldMapping - Mapping from normalized names to API field names
 */
export function normalizeApiResponse<T>(
  data: any,
  fieldMapping: FieldMapper<T>
): Partial<T> {
  const normalized: any = {};
  
  Object.entries(fieldMapping).forEach(([normalizedKey, apiKeyOrFunc]) => {
    if (typeof apiKeyOrFunc === 'string') {
      // Direct field mapping
      if (data.hasOwnProperty(apiKeyOrFunc)) {
        normalized[normalizedKey] = data[apiKeyOrFunc];
      }
    } else {
      // Computed field
      normalized[normalizedKey] = apiKeyOrFunc(data);
    }
  });
  
  return normalized;
}

/**
 * Common field mappings for different API formats
 */
export const FieldMappings = {
  // Format 1: Lowercase fields (direct API endpoints)
  lowercase: {
    id: 'id',
    name: 'name',
    description: 'description',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  
  // Format 2: Uppercase fields (nested in other responses)
  uppercase: {
    id: 'ID',
    name: 'Name', 
    description: 'Description',
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  }
};

/**
 * Department field mappings
 */
export const DepartmentMappings = {
  lowercase: {
    id: 'id',
    name: 'name',
    description: 'description',
    managerId: 'managerId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  uppercase: {
    id: 'ID',
    name: 'Name',
    description: 'Description', 
    managerId: 'ManagerID',
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  }
};

/**
 * Role field mappings
 */
export const RoleMappings = {
  lowercase: {
    id: 'id',
    name: 'name',
    description: 'description',
    workosRoleSlug: 'workosRoleSlug',
    isWorkosManaged: 'isWorkosManaged',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  uppercase: {
    id: 'ID',
    name: 'Name',
    description: 'Description',
    workosRoleSlug: 'workosRoleSlug',
    isWorkosManaged: 'isWorkosManaged', 
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  }
};

/**
 * Employee field mappings (simplified format)
 */
export const EmployeeMappings = {
  standard: {
    id: 'id',
    username: 'username',
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    phoneNumber: 'phoneNumber',
    roleId: 'roleId',
    departmentId: 'departmentId',
    managerId: 'managerId',
    jobTitle: 'jobTitle',
    hireDate: 'hireDate',
    employmentType: 'employmentType',
    onboardingStatus: 'onboardingStatus',
    isManager: 'isManager',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
};

/**
 * Paginated response transformer
 */
export function transformPaginatedResponse<T>(
  response: any,
  dataTransformer?: (item: any) => T
) {
  return {
    data: dataTransformer ? response.data.map(dataTransformer) : response.data,
    totalCount: response.total,
    page: response.page,
    limit: response.pageSize,
    totalPages: response.totalPages,
    hasMore: response.hasMore
  };
}

/**
 * Error response transformer
 */
export function transformErrorResponse(error: any) {
  return {
    success: false,
    message: error.message || 'An error occurred',
    error: error.error || error.code,
    details: error.details,
    timestamp: new Date().toISOString()
  };
}

/**
 * Success response transformer
 */
export function transformSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message: message || 'Operation completed successfully',
    timestamp: new Date().toISOString()
  };
}

/**
 * Query parameter builder for consistent API requests
 */
export function buildQueryParams(params: Record<string, any>): URLSearchParams {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, v.toString()));
      } else {
        searchParams.set(key, value.toString());
      }
    }
  });
  
  return searchParams;
}

/**
 * Type-safe field validator
 */
export function validateRequiredFields<T>(
  data: any, 
  requiredFields: (keyof T)[]
): data is T {
  return requiredFields.every(field => 
    data.hasOwnProperty(field) && data[field] !== undefined && data[field] !== null
  );
}

/**
 * Date field normalizer (handles various date formats)
 */
export function normalizeDateField(dateValue: any): string | null {
  if (!dateValue) return null;
  
  try {
    const date = new Date(dateValue);
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * ID field normalizer (ensures consistent string format for UI)
 */
export function normalizeIdField(idValue: any): string {
  if (typeof idValue === 'string') return idValue;
  if (typeof idValue === 'number') return idValue.toString();
  return '0';
}

/**
 * Boolean field normalizer (handles various boolean representations)
 */
export function normalizeBooleanField(boolValue: any): boolean {
  if (typeof boolValue === 'boolean') return boolValue;
  if (typeof boolValue === 'string') {
    return boolValue.toLowerCase() === 'true' || boolValue === '1';
  }
  if (typeof boolValue === 'number') return boolValue === 1;
  return false;
}