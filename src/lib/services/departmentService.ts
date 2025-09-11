import { writable, derived, get } from 'svelte/store';
import { client } from '$lib/graphql/client';
import type { 
  Department, 
  User, 
  PaginationInput, 
  SortInput, 
  FilterInput, 
  Connection,
  DepartmentBudgetInfo,
  DepartmentStatistics 
} from '$lib/types';
import {
  GET_DEPARTMENTS_QUERY,
  GET_DEPARTMENT_DETAILS_QUERY,
  CREATE_DEPARTMENT_MUTATION,
  UPDATE_DEPARTMENT_MUTATION,
  ARCHIVE_DEPARTMENT_MUTATION,
  ASSIGN_DEPARTMENT_HEAD_MUTATION,
  TRANSFER_EMPLOYEE_MUTATION,
  GET_DEPARTMENT_BUDGET_QUERY,
  UPDATE_DEPARTMENT_BUDGET_MUTATION,
  GET_DEPARTMENT_ANALYTICS_QUERY,
  buildPaginationVariables,
  buildSortVariables,
  buildFilterVariables,
  extractEdges,
  extractPageInfo
} from '$lib/graphql/operations';

/**
 * Department Management Service for MountainHR
 * 
 * Provides comprehensive department management including:
 * - Department CRUD operations
 * - Employee transfers and assignments
 * - Budget management and tracking
 * - Department hierarchy management
 * - Analytics and reporting
 * - Organizational structure visualization
 */

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface DepartmentFilter {
  isActive?: boolean;
  parentDepartmentId?: string;
  budgetRange?: {
    min?: number;
    max?: number;
  };
  employeeCountRange?: {
    min?: number;
    max?: number;
  };
  searchQuery?: string;
  hasManager?: boolean;
}

export interface CreateDepartmentInput {
  name: string;
  code: string;
  description?: string;
  parentDepartmentId?: string;
  managerId?: string;
  budgetLimit?: number;
  costCenter?: string;
  location?: string;
  isRemoteEnabled?: boolean;
}

export interface UpdateDepartmentInput {
  name?: string;
  code?: string;
  description?: string;
  parentDepartmentId?: string;
  managerId?: string;
  budgetLimit?: number;
  costCenter?: string;
  location?: string;
  isActive?: boolean;
  isRemoteEnabled?: boolean;
}

export interface EmployeeTransferInput {
  employeeId: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  effectiveDate: string;
  reason?: string;
  newRoleId?: string;
  newSalary?: number;
}

export interface DepartmentServiceState {
  departments: Department[];
  currentDepartment: Department | null;
  departmentHierarchy: Department[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  filters: DepartmentFilter;
  pagination: {
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  sorting: {
    field: string;
    direction: 'ASC' | 'DESC';
  };
}

// =============================================================================
// Store Implementation
// =============================================================================

const createDepartmentService = () => {
  const initialState: DepartmentServiceState = {
    departments: [],
    currentDepartment: null,
    departmentHierarchy: [],
    totalCount: 0,
    isLoading: false,
    error: null,
    filters: {},
    pagination: {
      currentPage: 1,
      pageSize: 20,
      hasNextPage: false,
      hasPreviousPage: false
    },
    sorting: {
      field: 'name',
      direction: 'ASC'
    }
  };

  const { subscribe, set, update } = writable(initialState);

  return {
    subscribe,

    // =============================================================================
    // Department Listing and Search
    // =============================================================================

    async loadDepartments(options?: {
      filters?: DepartmentFilter;
      pagination?: { page?: number; pageSize?: number };
      sorting?: { field?: string; direction?: 'ASC' | 'DESC' };
      reset?: boolean;
    }) {
      const { filters = {}, pagination = {}, sorting = {}, reset = false } = options || {};

      update(state => ({
        ...state,
        isLoading: true,
        error: null,
        ...(reset && { departments: [], currentPage: 1 })
      }));

      try {
        const currentState = get({ subscribe });
        
        const variables = {
          ...buildFilterVariables(filters),
          ...buildPaginationVariables(
            pagination.page || currentState.pagination.currentPage,
            pagination.pageSize || currentState.pagination.pageSize
          ),
          ...buildSortVariables(
            sorting.field || currentState.sorting.field,
            sorting.direction || currentState.sorting.direction
          )
        };

        const result = await client.query(GET_DEPARTMENTS_QUERY, variables).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load departments');
        }

        const departments = extractEdges<Department>(result.data.departments);
        const pageInfo = extractPageInfo(result.data.departments);

        update(state => ({
          ...state,
          departments: reset ? departments : [...state.departments, ...departments],
          totalCount: result.data.departments.totalCount,
          isLoading: false,
          filters: { ...state.filters, ...filters },
          pagination: {
            ...state.pagination,
            currentPage: pagination.page || state.pagination.currentPage,
            pageSize: pagination.pageSize || state.pagination.pageSize,
            hasNextPage: pageInfo.hasNextPage,
            hasPreviousPage: pageInfo.hasPreviousPage
          },
          sorting: {
            field: sorting.field || state.sorting.field,
            direction: sorting.direction || state.sorting.direction
          }
        }));

        return { departments, totalCount: result.data.departments.totalCount };
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to load departments';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async loadDepartmentHierarchy() {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.query(GET_DEPARTMENTS_QUERY, {
          includeHierarchy: true,
          sortBy: 'hierarchyOrder'
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load department hierarchy');
        }

        const hierarchy = extractEdges<Department>(result.data.departments);

        update(state => ({
          ...state,
          departmentHierarchy: hierarchy,
          isLoading: false
        }));

        return hierarchy;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to load department hierarchy';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async searchDepartments(query: string) {
      return this.loadDepartments({
        filters: { searchQuery: query },
        reset: true
      });
    },

    async filterDepartments(filters: DepartmentFilter) {
      return this.loadDepartments({
        filters,
        pagination: { page: 1 },
        reset: true
      });
    },

    // =============================================================================
    // Individual Department Management
    // =============================================================================

    async getDepartmentDetails(departmentId: string): Promise<Department> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.query(GET_DEPARTMENT_DETAILS_QUERY, { 
          id: departmentId 
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load department details');
        }

        const department = result.data.department;

        update(state => ({
          ...state,
          currentDepartment: department,
          isLoading: false
        }));

        return department;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to load department details';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async createDepartment(input: CreateDepartmentInput): Promise<Department> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(CREATE_DEPARTMENT_MUTATION, { input }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to create department');
        }

        const newDepartment = result.data.createDepartment;

        update(state => ({
          ...state,
          departments: [newDepartment, ...state.departments],
          totalCount: state.totalCount + 1,
          isLoading: false
        }));

        // Refresh hierarchy if needed
        if (input.parentDepartmentId) {
          this.loadDepartmentHierarchy();
        }

        return newDepartment;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to create department';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async updateDepartment(departmentId: string, input: UpdateDepartmentInput): Promise<Department> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(UPDATE_DEPARTMENT_MUTATION, {
          id: departmentId,
          input
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to update department');
        }

        const updatedDepartment = result.data.updateDepartment;

        update(state => ({
          ...state,
          departments: state.departments.map(dept => 
            dept.id === departmentId ? { ...dept, ...updatedDepartment } : dept
          ),
          currentDepartment: state.currentDepartment?.id === departmentId 
            ? { ...state.currentDepartment, ...updatedDepartment } 
            : state.currentDepartment,
          isLoading: false
        }));

        // Refresh hierarchy if parent changed
        if (input.parentDepartmentId !== undefined) {
          this.loadDepartmentHierarchy();
        }

        return updatedDepartment;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to update department';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async archiveDepartment(departmentId: string, reason?: string): Promise<void> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(ARCHIVE_DEPARTMENT_MUTATION, {
          id: departmentId,
          reason
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to archive department');
        }

        update(state => ({
          ...state,
          departments: state.departments.map(dept => 
            dept.id === departmentId ? { ...dept, isActive: false } : dept
          ),
          currentDepartment: state.currentDepartment?.id === departmentId 
            ? { ...state.currentDepartment, isActive: false } 
            : state.currentDepartment,
          isLoading: false
        }));

        this.loadDepartmentHierarchy();
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to archive department';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    // =============================================================================
    // Employee Management
    // =============================================================================

    async assignDepartmentHead(departmentId: string, managerId: string): Promise<void> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(ASSIGN_DEPARTMENT_HEAD_MUTATION, {
          departmentId,
          managerId
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to assign department head');
        }

        update(state => ({
          ...state,
          departments: state.departments.map(dept => 
            dept.id === departmentId 
              ? { ...dept, manager: result.data.assignDepartmentHead.manager } 
              : dept
          ),
          currentDepartment: state.currentDepartment?.id === departmentId 
            ? { ...state.currentDepartment, manager: result.data.assignDepartmentHead.manager } 
            : state.currentDepartment,
          isLoading: false
        }));
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to assign department head';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async transferEmployee(transfer: EmployeeTransferInput): Promise<void> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(TRANSFER_EMPLOYEE_MUTATION, {
          transfer
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to transfer employee');
        }

        // Refresh department details if we're viewing affected departments
        const currentState = get({ subscribe });
        if (currentState.currentDepartment?.id === transfer.fromDepartmentId ||
            currentState.currentDepartment?.id === transfer.toDepartmentId) {
          await this.getDepartmentDetails(currentState.currentDepartment.id);
        }

        update(state => ({ ...state, isLoading: false }));
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to transfer employee';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    // =============================================================================
    // Budget Management
    // =============================================================================

    async getDepartmentBudget(departmentId: string): Promise<DepartmentBudgetInfo> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.query(GET_DEPARTMENT_BUDGET_QUERY, {
          departmentId
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load department budget');
        }

        update(state => ({ ...state, isLoading: false }));

        return result.data.departmentBudget;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to load department budget';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async updateDepartmentBudget(
      departmentId: string, 
      budgetUpdates: {
        budgetLimit?: number;
        budgetAllocations?: { category: string; amount: number }[];
      }
    ): Promise<DepartmentBudgetInfo> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(UPDATE_DEPARTMENT_BUDGET_MUTATION, {
          departmentId,
          ...budgetUpdates
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to update department budget');
        }

        update(state => ({
          ...state,
          departments: state.departments.map(dept => 
            dept.id === departmentId 
              ? { ...dept, budgetLimit: budgetUpdates.budgetLimit || dept.budgetLimit } 
              : dept
          ),
          isLoading: false
        }));

        return result.data.updateDepartmentBudget;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to update department budget';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    // =============================================================================
    // Analytics and Reporting
    // =============================================================================

    async getDepartmentAnalytics(departmentId: string, timeRange?: {
      startDate: string;
      endDate: string;
    }): Promise<DepartmentStatistics> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.query(GET_DEPARTMENT_ANALYTICS_QUERY, {
          departmentId,
          ...timeRange
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load department analytics');
        }

        update(state => ({ ...state, isLoading: false }));

        return result.data.departmentAnalytics;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to load department analytics';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    // =============================================================================
    // State Management
    // =============================================================================

    clearCurrentDepartment() {
      update(state => ({ ...state, currentDepartment: null }));
    },

    clearError() {
      update(state => ({ ...state, error: null }));
    },

    resetFilters() {
      update(state => ({
        ...state,
        filters: {},
        pagination: { ...initialState.pagination },
        sorting: { ...initialState.sorting }
      }));
    },

    setPageSize(pageSize: number) {
      update(state => ({
        ...state,
        pagination: { ...state.pagination, pageSize, currentPage: 1 }
      }));
    },

    // =============================================================================
    // Utility Methods
    // =============================================================================

    getDepartmentById(departmentId: string): Department | undefined {
      const currentState = get({ subscribe });
      return currentState.departments.find(dept => dept.id === departmentId);
    },

    getChildDepartments(parentId: string): Department[] {
      const currentState = get({ subscribe });
      return currentState.departmentHierarchy.filter(dept => dept.parentDepartment?.id === parentId);
    },

    getDepartmentPath(departmentId: string): Department[] {
      const currentState = get({ subscribe });
      const path: Department[] = [];
      let currentDept = currentState.departmentHierarchy.find(d => d.id === departmentId);
      
      while (currentDept) {
        path.unshift(currentDept);
        currentDept = currentDept.parentDepartment 
          ? currentState.departmentHierarchy.find(d => d.id === currentDept!.parentDepartment!.id)
          : undefined;
      }
      
      return path;
    },

    getActiveDepartments(): Department[] {
      const currentState = get({ subscribe });
      return currentState.departments.filter(dept => dept.isActive);
    },

    getDepartmentsByManager(managerId: string): Department[] {
      const currentState = get({ subscribe });
      return currentState.departments.filter(dept => dept.manager?.id === managerId);
    },

    // Statistics
    getTotalDepartments(): number {
      const currentState = get({ subscribe });
      return currentState.totalCount;
    },

    getActiveDepartmentCount(): number {
      const currentState = get({ subscribe });
      return currentState.departments.filter(dept => dept.isActive).length;
    },

    getTotalEmployeesInDepartment(departmentId: string): number {
      const currentState = get({ subscribe });
      const dept = currentState.departments.find(d => d.id === departmentId);
      return dept?.employeeCount || 0;
    }
  };
};

// =============================================================================
// Create Service Instance
// =============================================================================

export const departmentService = createDepartmentService();

// =============================================================================
// Derived Stores
// =============================================================================

export const departments = derived(departmentService, $departmentService => $departmentService.departments);

export const currentDepartment = derived(departmentService, $departmentService => $departmentService.currentDepartment);

export const departmentHierarchy = derived(departmentService, $departmentService => $departmentService.departmentHierarchy);

export const isLoadingDepartments = derived(departmentService, $departmentService => $departmentService.isLoading);

export const departmentError = derived(departmentService, $departmentService => $departmentService.error);

export const activeDepartments = derived(departments, $departments => 
  $departments.filter(dept => dept.isActive)
);

export const rootDepartments = derived(departmentHierarchy, $hierarchy => 
  $hierarchy.filter(dept => !dept.parentDepartment)
);

export const departmentsPagination = derived(departmentService, $departmentService => $departmentService.pagination);

export const departmentsFilters = derived(departmentService, $departmentService => $departmentService.filters);

export const departmentsSorting = derived(departmentService, $departmentService => $departmentService.sorting);

// =============================================================================
// Reactive Search and Filters
// =============================================================================

export const createDepartmentSearch = () => {
  const searchQuery = writable('');
  const debounceTimeout = writable<NodeJS.Timeout | null>(null);

  return {
    searchQuery: { subscribe: searchQuery.subscribe },
    
    search: (query: string) => {
      searchQuery.set(query);
      
      const timeout = get(debounceTimeout);
      if (timeout) clearTimeout(timeout);

      const newTimeout = setTimeout(() => {
        if (query.trim()) {
          departmentService.searchDepartments(query.trim());
        } else {
          departmentService.loadDepartments({ reset: true });
        }
      }, 300);

      debounceTimeout.set(newTimeout);
    },

    clear: () => {
      searchQuery.set('');
      departmentService.resetFilters();
      departmentService.loadDepartments({ reset: true });
    }
  };
};

// =============================================================================
// Export Service as Default
// =============================================================================

export default departmentService;