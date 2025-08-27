import type { PageServerLoad } from './$types';
import { loadEmployeeData, parseSearchParams } from '$lib/api/server-client';

export const load: PageServerLoad = async ({ cookies, url }) => {
  console.log('👥 Loading employees page with new API client');
  
  try {
    // Parse URL parameters for filtering and pagination
    const urlParams = parseSearchParams(url);
    const search = url.searchParams.get('search') || undefined;
    const status = url.searchParams.get('status') || 'all';
    const department = url.searchParams.get('department') || 'all';

    // Build API parameters
    const apiParams = {
      page: urlParams.page,
      limit: urlParams.limit,
      search,
      status: status !== 'all' ? status : undefined,
      department: department !== 'all' ? department : undefined,
      // Remove order_by for now due to database schema issues
      // order_by: 'full_name' // Default sort by name
    };

    // Load employee data using the centralized helper
    const employeeData = await loadEmployeeData(cookies, apiParams);
    
    console.log('✅ Employees page loaded with', employeeData.employees.length, 'employees');
    
    return {
      employees: employeeData.employees,
      departments: employeeData.departments,
      roles: employeeData.roles, // This might be empty if roles endpoint doesn't exist
      pagination: {
        currentPage: urlParams.page,
        pageSize: urlParams.limit,
        totalCount: employeeData.pagination.totalCount,
        totalPages: employeeData.pagination.totalPages
      },
      filters: {
        search: search || '',
        status,
        department
      }
    };
    
  } catch (error) {
    console.error('❌ Error loading employees data:', error);
    
    // Return empty data with error state
    return {
      employees: [],
      departments: [],
      roles: [],
      pagination: {
        currentPage: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 1
      },
      filters: {
        search: '',
        status: 'all',
        department: 'all'
      },
      error: 'Failed to load employees data'
    };
  }
};