/**
 * Centralized server-side API client helper for HR pages
 * Provides consistent authentication, error handling, and data loading patterns
 */

import { redirect, error } from '@sveltejs/kit';
import { MountainHRApiClient } from './client';
import type { Cookies } from '@sveltejs/kit';
import type { 
  Employee,
  Department,
  Leave,
  Task,
  Document,
  Announcement,
  HRRequest,
  ActivityLog,
  PaginatedResponse,
  ListParams 
} from './types-v2';

/**
 * Initialize authenticated API client for server-side use
 */
export function createAuthenticatedApiClient(cookies: Cookies): MountainHRApiClient {
  const apiClient = new MountainHRApiClient();
  const token = cookies.get('hr_token');

  if (!token) {
    throw redirect(302, '/login');
  }

  apiClient.setToken(token);
  return apiClient;
}

/**
 * Verify authentication and get user context
 * Used by layout and pages that need user information
 */
export async function getAuthenticatedUser(cookies: Cookies) {
  const apiClient = createAuthenticatedApiClient(cookies);

  try {
    const authResult = await apiClient.auth.verify();
    
    if (!authResult.success || !authResult.data) {
      console.error('❌ Auth verification failed:', authResult.error);
      cookies.delete('hr_token', { path: '/' });
      throw redirect(302, '/login');
    }

    return {
      user: authResult.data.user,
      roles: authResult.data.roles,
      permissions: authResult.data.permissions
    };
  } catch (err) {
    console.error('❌ Authentication error:', err);
    cookies.delete('hr_token', { path: '/' });
    throw redirect(302, '/login');
  }
}

/**
 * Common data loader for employee-related pages
 */
export async function loadEmployeeData(
  cookies: Cookies,
  params: ListParams & { department?: string; status?: string } = {}
) {
  const apiClient = createAuthenticatedApiClient(cookies);

  try {
    // Load employees, departments, and auth context (for role info) in parallel
    const [employeesResult, departmentsResult, authResult] = await Promise.allSettled([
      apiClient.employees.list(params),
      apiClient.departments.list(),
      apiClient.auth.verify() // Get current user context with roles
    ]);

    // Debug: Log any API failures
    if (employeesResult.status === 'rejected') {
      console.log('❌ Employees API Failed:', employeesResult.reason);
    }

    // Process employees
    let employees = employeesResult.status === 'fulfilled' && employeesResult.value.success
      ? employeesResult.value.data?.employees || []
      : [];

    // Process departments  
    const departments = departmentsResult.status === 'fulfilled' && departmentsResult.value.success
      ? departmentsResult.value.data?.data || []
      : [];

    // Get current user context for role enrichment
    const currentUserRoles = authResult.status === 'fulfilled' && authResult.value.success
      ? authResult.value.data?.roles || []
      : [];

    const currentUserId = authResult.status === 'fulfilled' && authResult.value.success
      ? authResult.value.data?.user?.id
      : null;

    // Enrich current user's employee data with role information
    if (currentUserId && currentUserRoles.length > 0) {
      employees = employees.map((emp: any) => {
        if (emp.id === currentUserId) {
          // Add role information to current user's employee record
          return {
            ...emp,
            roles: currentUserRoles,
            job_title: (emp.job_title && emp.job_title.trim() !== '') ? emp.job_title : (currentUserRoles[0]?.display_name || currentUserRoles[0]?.name),
            role_name: currentUserRoles[0]?.display_name || currentUserRoles[0]?.name,
            role_description: currentUserRoles[0]?.description
          };
        }
        return emp;
      });
    }

    // Create roles array from auth context for backward compatibility
    const roles = currentUserRoles;

    // Calculate pagination info
    const totalCount = employeesResult.status === 'fulfilled' && employeesResult.value.success
      ? employeesResult.value.data?.count || 0
      : 0;

    const pageSize = params.limit || 50;
    const currentPage = params.page || 1;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      employees,
      departments,
      roles,
      pagination: {
        currentPage,
        pageSize,
        totalCount,
        totalPages
      }
    };
  } catch (err) {
    console.error('❌ Error loading employee data:', err);
    throw error(500, 'Failed to load employee data');
  }
}

/**
 * Common data loader for leave management pages
 */
export async function loadLeaveData(
  cookies: Cookies, 
  params: ListParams & { employee_id?: string; status?: string } = {}
) {
  const apiClient = createAuthenticatedApiClient(cookies);

  try {
    const [leavesResult, employeesResult] = await Promise.allSettled([
      apiClient.leaves.list(params),
      apiClient.employees.list({ limit: 100 }) // Get employees for leave assignment
    ]);

    const leaves = leavesResult.status === 'fulfilled' && leavesResult.value.success
      ? leavesResult.value.data?.data || []
      : [];

    const employees = employeesResult.status === 'fulfilled' && employeesResult.value.success
      ? employeesResult.value.data?.data || []
      : [];

    const totalCount = leavesResult.status === 'fulfilled' && leavesResult.value.success
      ? leavesResult.value.data?.total || 0
      : 0;

    return {
      leaves,
      employees,
      totalCount
    };
  } catch (err) {
    console.error('❌ Error loading leave data:', err);
    throw error(500, 'Failed to load leave data');
  }
}

/**
 * Common data loader for task management pages
 */
export async function loadTaskData(
  cookies: Cookies,
  params: ListParams & { assigned_to?: string; status?: string; priority?: string } = {}
) {
  const apiClient = createAuthenticatedApiClient(cookies);

  try {
    const [tasksResult, employeesResult] = await Promise.allSettled([
      apiClient.tasks.list(params),
      apiClient.employees.list({ limit: 100 }) // Get employees for task assignment
    ]);

    const tasks = tasksResult.status === 'fulfilled' && tasksResult.value.success
      ? tasksResult.value.data?.data || []
      : [];

    const employees = employeesResult.status === 'fulfilled' && employeesResult.value.success
      ? employeesResult.value.data?.data || []
      : [];
      
    console.log('👥 Employee API result:', {
      status: employeesResult.status,
      success: employeesResult.status === 'fulfilled' ? employeesResult.value.success : false,
      dataLength: employeesResult.status === 'fulfilled' && employeesResult.value.success ? employeesResult.value.data?.data?.length || 0 : 0,
      error: employeesResult.status === 'rejected' ? employeesResult.reason : employeesResult.status === 'fulfilled' ? employeesResult.value.error : 'none'
    });

    const totalCount = tasksResult.status === 'fulfilled' && tasksResult.value.success
      ? tasksResult.value.data?.total || 0
      : 0;

    return {
      tasks,
      employees,
      totalCount
    };
  } catch (err) {
    console.error('❌ Error loading task data:', err);
    throw error(500, 'Failed to load task data');
  }
}

/**
 * Common data loader for document management pages
 */
export async function loadDocumentData(
  cookies: Cookies,
  params: ListParams & { employee_id?: string; category?: string } = {}
) {
  const apiClient = createAuthenticatedApiClient(cookies);

  try {
    const [documentsResult, employeesResult] = await Promise.allSettled([
      apiClient.documents.list(params),
      apiClient.employees.list({ limit: 100 }) // Get employees for document ownership
    ]);

    const documents = documentsResult.status === 'fulfilled' && documentsResult.value.success
      ? documentsResult.value.data?.data || []
      : [];

    const employees = employeesResult.status === 'fulfilled' && employeesResult.value.success
      ? employeesResult.value.data?.data || []
      : [];

    const totalCount = documentsResult.status === 'fulfilled' && documentsResult.value.success
      ? documentsResult.value.data?.total || 0
      : 0;

    return {
      documents,
      employees,
      totalCount
    };
  } catch (err) {
    console.error('❌ Error loading document data:', err);
    throw error(500, 'Failed to load document data');
  }
}

/**
 * Common data loader for announcement pages
 */
export async function loadAnnouncementData(
  cookies: Cookies,
  params: ListParams & { active_only?: boolean; priority?: string } = {}
) {
  const apiClient = createAuthenticatedApiClient(cookies);

  try {
    const announcementsResult = await apiClient.announcements.list(params);

    const announcements = announcementsResult.success 
      ? announcementsResult.data?.data || []
      : [];

    const totalCount = announcementsResult.success
      ? announcementsResult.data?.total || 0
      : 0;

    return {
      announcements,
      totalCount
    };
  } catch (err) {
    console.error('❌ Error loading announcement data:', err);
    throw error(500, 'Failed to load announcement data');
  }
}

/**
 * Common data loader for HR requests
 */
export async function loadHRRequestData(
  cookies: Cookies,
  params: ListParams & { employee_id?: string; status?: string; request_type?: string } = {}
) {
  const apiClient = createAuthenticatedApiClient(cookies);

  try {
    const [requestsResult, employeesResult] = await Promise.allSettled([
      apiClient.hrRequests.list(params),
      apiClient.employees.list({ limit: 100 })
    ]);

    const hrRequests = requestsResult.status === 'fulfilled' && requestsResult.value.success
      ? requestsResult.value.data?.data || []
      : [];

    const employees = employeesResult.status === 'fulfilled' && employeesResult.value.success
      ? employeesResult.value.data?.data || []
      : [];

    const totalCount = requestsResult.status === 'fulfilled' && requestsResult.value.success
      ? requestsResult.value.data?.total || 0
      : 0;

    return {
      hrRequests,
      employees,
      totalCount
    };
  } catch (err) {
    console.error('❌ Error loading HR request data:', err);
    throw error(500, 'Failed to load HR request data');
  }
}

/**
 * Get activity logs for audit purposes
 */
export async function loadActivityLogData(
  cookies: Cookies,
  params: ListParams & { user_id?: string; action_type?: string; resource_type?: string } = {}
) {
  const apiClient = createAuthenticatedApiClient(cookies);

  try {
    const logsResult = await apiClient.activityLogs.list(params);

    const activityLogs = logsResult.success 
      ? logsResult.data?.data || []
      : [];

    const totalCount = logsResult.success
      ? logsResult.data?.total || 0
      : 0;

    return {
      activityLogs,
      totalCount
    };
  } catch (err) {
    console.error('❌ Error loading activity logs:', err);
    throw error(500, 'Failed to load activity logs');
  }
}

/**
 * Utility to parse URL search parameters for consistent filtering
 */
export function parseSearchParams(url: URL): {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  category?: string;
  priority?: string;
  employee_id?: string;
  department?: string;
} {
  const params = url.searchParams;
  
  return {
    page: parseInt(params.get('page') || '1', 10),
    limit: parseInt(params.get('limit') || '20', 10),
    search: params.get('search') || undefined,
    status: params.get('status') || undefined,
    category: params.get('category') || undefined,
    priority: params.get('priority') || undefined,
    employee_id: params.get('employee_id') || undefined,
    department: params.get('department') || undefined,
  };
}

/**
 * Handle common API errors with user-friendly messages
 */
export function handleApiError(err: any, context: string): never {
  console.error(`❌ ${context}:`, err);
  
  if (err?.status === 401) {
    throw redirect(302, '/login');
  } else if (err?.status === 403) {
    throw error(403, 'You do not have permission to access this resource');
  } else if (err?.status === 404) {
    throw error(404, 'Resource not found');
  } else {
    throw error(500, `Failed to ${context.toLowerCase()}`);
  }
}