/**
 * T028: Department Operations - GraphQL Integration
 *
 * Standardized department management operations with comprehensive error handling,
 * timeout enforcement, and retry logic following the T021-T024 entity model patterns.
 */

import { gql } from '@urql/svelte';
import type { OperationStore } from '@urql/svelte';
import type { DataRequest, UserCredentials } from '$lib/models/data-request';
import type { ErrorResponse } from '$lib/models/error-response';

/**
 * GraphQL Department Queries
 */
export const GET_DEPARTMENTS_QUERY = gql`
  query GetDepartments($first: Int, $after: Cursor, $filter: DepartmentFilter, $orderBy: [DepartmentsOrderBy!]) {
    departments(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
      nodes {
        id
        name
        description
        code
        isActive
        createdAt
        updatedAt
        manager {
          id
          displayName
          email
        }
        parentDepartment {
          id
          name
        }
        childDepartments {
          nodes {
            id
            name
            employeeCount
          }
        }
        employees {
          totalCount
        }
        budget {
          annual
          allocated
          spent
          remaining
        }
        location {
          building
          floor
          address
        }
        metrics {
          employeeCount
          activeProjects
          averageSalary
          turnoverRate
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_DEPARTMENT_BY_ID_QUERY = gql`
  query GetDepartmentById($id: UUID!) {
    department(id: $id) {
      id
      name
      description
      code
      isActive
      createdAt
      updatedAt
      manager {
        id
        displayName
        email
        profile {
          firstName
          lastName
          avatarUrl
        }
      }
      parentDepartment {
        id
        name
        manager {
          displayName
        }
      }
      childDepartments {
        nodes {
          id
          name
          description
          manager {
            displayName
          }
          employees {
            totalCount
          }
        }
      }
      employees(first: 50) {
        nodes {
          id
          displayName
          email
          profile {
            firstName
            lastName
            avatarUrl
            jobTitle
            hireDate
          }
          roles {
            nodes {
              name
            }
          }
        }
        totalCount
      }
      budget {
        annual
        allocated
        spent
        remaining
        currency
        lastUpdated
      }
      location {
        building
        floor
        address
        city
        state
        zipCode
      }
      metrics {
        employeeCount
        activeProjects
        averageSalary
        turnoverRate
        performanceScore
        satisfaction
      }
    }
  }
`;

export const GET_DEPARTMENT_HIERARCHY_QUERY = gql`
  query GetDepartmentHierarchy {
    departments(filter: { isActive: true }, orderBy: [NAME_ASC]) {
      nodes {
        id
        name
        description
        code
        parentDepartment {
          id
          name
        }
        childDepartments {
          nodes {
            id
            name
            childDepartments {
              nodes {
                id
                name
              }
            }
          }
        }
        manager {
          id
          displayName
        }
        employees {
          totalCount
        }
      }
    }
  }
`;

/**
 * GraphQL Department Mutations
 */
export const CREATE_DEPARTMENT_MUTATION = gql`
  mutation CreateDepartment($input: CreateDepartmentInput!) {
    createDepartment(input: $input) {
      department {
        id
        name
        description
        code
        isActive
        manager {
          id
          displayName
        }
        parentDepartment {
          id
          name
        }
        budget {
          annual
          allocated
        }
        location {
          building
          floor
          address
        }
      }
      clientMutationId
    }
  }
`;

export const UPDATE_DEPARTMENT_MUTATION = gql`
  mutation UpdateDepartment($input: UpdateDepartmentInput!) {
    updateDepartment(input: $input) {
      department {
        id
        name
        description
        code
        isActive
        updatedAt
        manager {
          id
          displayName
        }
        parentDepartment {
          id
          name
        }
        budget {
          annual
          allocated
          spent
          remaining
        }
        location {
          building
          floor
          address
        }
      }
      clientMutationId
    }
  }
`;

export const DELETE_DEPARTMENT_MUTATION = gql`
  mutation DeleteDepartment($input: DeleteDepartmentInput!) {
    deleteDepartment(input: $input) {
      deletedDepartmentId
      clientMutationId
    }
  }
`;

/**
 * Department interfaces
 */
export interface Department {
  id: string;
  name: string;
  description?: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  manager?: {
    id: string;
    displayName: string;
    email?: string;
    profile?: {
      firstName: string;
      lastName: string;
      avatarUrl?: string;
    };
  };
  parentDepartment?: {
    id: string;
    name: string;
    manager?: {
      displayName: string;
    };
  };
  childDepartments: Array<{
    id: string;
    name: string;
    description?: string;
    manager?: {
      displayName: string;
    };
    employeeCount?: number;
  }>;
  employees: {
    nodes?: Array<{
      id: string;
      displayName: string;
      email: string;
      profile?: {
        firstName: string;
        lastName: string;
        avatarUrl?: string;
        jobTitle: string;
        hireDate: string;
      };
      roles: Array<{
        name: string;
      }>;
    }>;
    totalCount: number;
  };
  budget?: {
    annual: number;
    allocated: number;
    spent: number;
    remaining: number;
    currency?: string;
    lastUpdated?: string;
  };
  location?: {
    building?: string;
    floor?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  metrics?: {
    employeeCount: number;
    activeProjects: number;
    averageSalary?: number;
    turnoverRate?: number;
    performanceScore?: number;
    satisfaction?: number;
  };
}

export interface DepartmentFilter {
  isActive?: boolean;
  parentId?: string;
  managerId?: string;
  search?: string;
}

export interface PaginatedDepartments {
  nodes: Department[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  totalCount: number;
}

/**
 * Standardized department operations with error handling and retry logic
 */
export class DepartmentOperations {
  private client: OperationStore;

  constructor(client: OperationStore) {
    this.client = client;
  }

  /**
   * Get paginated list of departments with filtering and sorting
   */
  async getDepartments(params: {
    first?: number;
    after?: string;
    filter?: DepartmentFilter;
    orderBy?: string[];
    userCredentials: UserCredentials;
  }): Promise<PaginatedDepartments> {
    // Import required models for standardized error handling
    const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
    const { createErrorResponse } = await import('$lib/models/error-response');

    // Create data request with standard timeout and retry configuration
    const dataRequest = createDataRequest({
      operationName: 'GetDepartments',
      variables: {
        first: params.first || 20,
        after: params.after,
        filter: params.filter,
        orderBy: params.orderBy
      },
      userCredentials: params.userCredentials,
      timeoutMs: 5000,
      retryAttempts: 0,
      maxRetries: 3
    });

    // Retry handler with exponential backoff
    class DepartmentRetryHandler {
      private attempts = 0;

      async execute<T>(
        fn: () => Promise<T>,
        request: DataRequest
      ): Promise<T> {
        while (this.attempts <= request.maxRetries) {
          try {
            // Update request status
            (request as any).status = 'pending';

            // Execute with timeout
            const result = await Promise.race([
              fn(),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Department query timeout')), request.timeoutMs)
              )
            ]);

            (request as any).status = 'completed';
            return result;
          } catch (error) {
            this.attempts++;
            (request as any).retryAttempts = this.attempts;

            if (this.attempts > request.maxRetries) {
              (request as any).status = 'failed';

              // Create structured error response
              const errorResponse = createErrorResponse(error, {
                type: error.message.includes('timeout') ? 'TIMEOUT_ERROR' : 'GRAPHQL_ERROR',
                userMessage: 'Unable to load department data. Please try again or contact support.'
              });

              console.error('Department query error:', errorResponse.toLogEntry());
              throw errorResponse;
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.min(1000 * Math.pow(2, this.attempts - 1), 4000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        throw new Error('Max retries exceeded');
      }
    }

    const retryHandler = new DepartmentRetryHandler();

    return retryHandler.execute(async () => {
      return new Promise<PaginatedDepartments>((resolve, reject) => {
        // Subscribe to the departments query
        const unsubscribe = this.client.subscribe(
          {
            query: GET_DEPARTMENTS_QUERY,
            variables: {
              first: params.first || 20,
              after: params.after,
              filter: params.filter,
              orderBy: params.orderBy
            }
          },
          (result) => {
            if (result.error) {
              console.error('Departments GraphQL error:', result.error);
              const errorResponse = createErrorResponse(result.error, {
                type: 'GRAPHQL_ERROR',
                userMessage: 'Unable to load department list. Please check your permissions and try again.'
              });
              reject(errorResponse);
              unsubscribe();
            } else if (result.data?.departments) {
              console.log(`Loaded ${result.data.departments.nodes.length} departments`);
              resolve(result.data.departments);
              unsubscribe();
            }
          }
        );
      });
    }, dataRequest);
  }

  /**
   * Get single department by ID with full details
   */
  async getDepartmentById(params: {
    id: string;
    userCredentials: UserCredentials;
  }): Promise<Department> {
    const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
    const { createErrorResponse } = await import('$lib/models/error-response');

    const dataRequest = createDataRequest({
      operationName: 'GetDepartmentById',
      variables: { id: params.id },
      userCredentials: params.userCredentials,
      timeoutMs: 4000, // Slightly longer timeout for detailed data
      retryAttempts: 0,
      maxRetries: 2
    });

    return new Promise<Department>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const errorResponse = createErrorResponse(
          new Error('Department fetch timeout'),
          {
            type: 'TIMEOUT_ERROR',
            userMessage: 'Department data is taking longer than expected. Please try again.'
          }
        );
        reject(errorResponse);
        unsubscribe();
      }, dataRequest.timeoutMs);

      const unsubscribe = this.client.subscribe(
        {
          query: GET_DEPARTMENT_BY_ID_QUERY,
          variables: { id: params.id }
        },
        (result) => {
          clearTimeout(timeoutId);

          if (result.error) {
            console.error('Department by ID error:', result.error);
            const errorResponse = createErrorResponse(result.error, {
              type: 'GRAPHQL_ERROR',
              userMessage: 'Unable to load department details. Please check the department ID and try again.'
            });
            reject(errorResponse);
            unsubscribe();
          } else if (result.data?.department) {
            console.log(`Loaded department: ${result.data.department.name}`);
            resolve(result.data.department);
            unsubscribe();
          } else {
            const errorResponse = createErrorResponse(
              new Error('Department not found'),
              {
                type: 'VALIDATION_ERROR',
                userMessage: 'Department not found. Please check the department ID.'
              }
            );
            reject(errorResponse);
            unsubscribe();
          }
        }
      );
    });
  }

  /**
   * Get department hierarchy for organizational chart
   */
  async getDepartmentHierarchy(params: {
    userCredentials: UserCredentials;
  }): Promise<Department[]> {
    const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
    const { createErrorResponse } = await import('$lib/models/error-response');

    const dataRequest = createDataRequest({
      operationName: 'GetDepartmentHierarchy',
      variables: {},
      userCredentials: params.userCredentials,
      timeoutMs: 6000, // Longer timeout for hierarchy data
      retryAttempts: 0,
      maxRetries: 2
    });

    return new Promise<Department[]>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const errorResponse = createErrorResponse(
          new Error('Department hierarchy timeout'),
          {
            type: 'TIMEOUT_ERROR',
            userMessage: 'Organization chart is taking longer than expected. Please try again.'
          }
        );
        reject(errorResponse);
        unsubscribe();
      }, dataRequest.timeoutMs);

      const unsubscribe = this.client.subscribe(
        {
          query: GET_DEPARTMENT_HIERARCHY_QUERY
        },
        (result) => {
          clearTimeout(timeoutId);

          if (result.error) {
            console.error('Department hierarchy error:', result.error);
            const errorResponse = createErrorResponse(result.error, {
              type: 'GRAPHQL_ERROR',
              userMessage: 'Unable to load organization chart. Please try refreshing the page.'
            });
            reject(errorResponse);
            unsubscribe();
          } else if (result.data?.departments) {
            console.log(`Loaded hierarchy with ${result.data.departments.nodes.length} departments`);
            resolve(result.data.departments.nodes);
            unsubscribe();
          }
        }
      );
    });
  }

  /**
   * Create new department
   */
  async createDepartment(params: {
    input: {
      name: string;
      description?: string;
      code: string;
      managerId?: string;
      parentId?: string;
      budget?: {
        annual: number;
        allocated: number;
      };
      location?: {
        building?: string;
        floor?: string;
        address?: string;
        city?: string;
        state?: string;
        zipCode?: string;
      };
    };
    userCredentials: UserCredentials;
  }): Promise<Department> {
    const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
    const { createErrorResponse } = await import('$lib/models/error-response');

    const dataRequest = createDataRequest({
      operationName: 'CreateDepartment',
      variables: { input: params.input },
      userCredentials: params.userCredentials,
      timeoutMs: 8000, // Longer timeout for mutations
      retryAttempts: 0,
      maxRetries: 1 // Single retry for mutations
    });

    return new Promise<Department>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const errorResponse = createErrorResponse(
          new Error('Department creation timeout'),
          {
            type: 'TIMEOUT_ERROR',
            userMessage: 'Department creation is taking longer than expected. Please check if the department was created.'
          }
        );
        reject(errorResponse);
        unsubscribe();
      }, dataRequest.timeoutMs);

      const unsubscribe = this.client.subscribe(
        {
          query: CREATE_DEPARTMENT_MUTATION,
          variables: { input: params.input }
        },
        (result) => {
          clearTimeout(timeoutId);

          if (result.error) {
            console.error('Create department error:', result.error);
            const errorResponse = createErrorResponse(result.error, {
              type: 'VALIDATION_ERROR',
              userMessage: 'Unable to create department. Please check the information and try again.'
            });
            reject(errorResponse);
            unsubscribe();
          } else if (result.data?.createDepartment?.department) {
            console.log(`Created department: ${result.data.createDepartment.department.name}`);
            resolve(result.data.createDepartment.department);
            unsubscribe();
          }
        }
      );
    });
  }

  /**
   * Update existing department
   */
  async updateDepartment(params: {
    input: {
      id: string;
      patch: {
        name?: string;
        description?: string;
        code?: string;
        isActive?: boolean;
        managerId?: string;
        parentId?: string;
        budget?: {
          annual?: number;
          allocated?: number;
        };
        location?: {
          building?: string;
          floor?: string;
          address?: string;
          city?: string;
          state?: string;
          zipCode?: string;
        };
      };
    };
    userCredentials: UserCredentials;
  }): Promise<Department> {
    const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
    const { createErrorResponse } = await import('$lib/models/error-response');

    const dataRequest = createDataRequest({
      operationName: 'UpdateDepartment',
      variables: { input: params.input },
      userCredentials: params.userCredentials,
      timeoutMs: 6000,
      retryAttempts: 0,
      maxRetries: 1
    });

    return new Promise<Department>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const errorResponse = createErrorResponse(
          new Error('Department update timeout'),
          {
            type: 'TIMEOUT_ERROR',
            userMessage: 'Department update is taking longer than expected. Please verify the changes were saved.'
          }
        );
        reject(errorResponse);
        unsubscribe();
      }, dataRequest.timeoutMs);

      const unsubscribe = this.client.subscribe(
        {
          query: UPDATE_DEPARTMENT_MUTATION,
          variables: { input: params.input }
        },
        (result) => {
          clearTimeout(timeoutId);

          if (result.error) {
            console.error('Update department error:', result.error);
            const errorResponse = createErrorResponse(result.error, {
              type: 'VALIDATION_ERROR',
              userMessage: 'Unable to update department. Please check the information and try again.'
            });
            reject(errorResponse);
            unsubscribe();
          } else if (result.data?.updateDepartment?.department) {
            console.log(`Updated department: ${result.data.updateDepartment.department.name}`);
            resolve(result.data.updateDepartment.department);
            unsubscribe();
          }
        }
      );
    });
  }

  /**
   * Delete department (hard delete - use with caution)
   */
  async deleteDepartment(params: {
    input: {
      id: string;
      transferEmployeesToId?: string; // Optional department to transfer employees to
    };
    userCredentials: UserCredentials;
  }): Promise<{ deletedDepartmentId: string }> {
    const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
    const { createErrorResponse } = await import('$lib/models/error-response');

    const dataRequest = createDataRequest({
      operationName: 'DeleteDepartment',
      variables: { input: params.input },
      userCredentials: params.userCredentials,
      timeoutMs: 10000, // Longer timeout for deletion (might need to transfer employees)
      retryAttempts: 0,
      maxRetries: 0 // No retries for deletion
    });

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const errorResponse = createErrorResponse(
          new Error('Department deletion timeout'),
          {
            type: 'TIMEOUT_ERROR',
            userMessage: 'Department deletion is taking longer than expected. Please verify if the operation completed.'
          }
        );
        reject(errorResponse);
        unsubscribe();
      }, dataRequest.timeoutMs);

      const unsubscribe = this.client.subscribe(
        {
          query: DELETE_DEPARTMENT_MUTATION,
          variables: { input: params.input }
        },
        (result) => {
          clearTimeout(timeoutId);

          if (result.error) {
            console.error('Delete department error:', result.error);
            const errorResponse = createErrorResponse(result.error, {
              type: 'PERMISSION_ERROR',
              userMessage: 'Unable to delete department. Please check your permissions and ensure all employees are reassigned.'
            });
            reject(errorResponse);
            unsubscribe();
          } else if (result.data?.deleteDepartment) {
            console.log(`Deleted department: ${params.input.id}`);
            resolve(result.data.deleteDepartment);
            unsubscribe();
          }
        }
      );
    });
  }
}

/**
 * Factory function to create DepartmentOperations instance
 */
export function createDepartmentOperations(client: OperationStore): DepartmentOperations {
  return new DepartmentOperations(client);
}

/**
 * Helper function to build department hierarchy tree
 */
export function buildDepartmentTree(departments: Department[]): Department[] {
  const departmentMap = new Map<string, Department>();
  const rootDepartments: Department[] = [];

  // First pass: create map of all departments
  for (const dept of departments) {
    departmentMap.set(dept.id, { ...dept, childDepartments: [] });
  }

  // Second pass: build tree structure
  for (const dept of departments) {
    const currentDept = departmentMap.get(dept.id)!;

    if (dept.parentDepartment) {
      const parent = departmentMap.get(dept.parentDepartment.id);
      if (parent) {
        parent.childDepartments.push(currentDept);
      }
    } else {
      rootDepartments.push(currentDept);
    }
  }

  return rootDepartments;
}

/**
 * Helper function to check if user can manage department
 */
export function canManageDepartment(department: Department, userCredentials: UserCredentials): boolean {
  // Admin can manage all departments
  if (userCredentials.permissions.includes('*') || userCredentials.permissions.includes('departments:write')) {
    return true;
  }

  // Department managers can manage their own department
  if (department.manager?.id === userCredentials.userId) {
    return true;
  }

  return false;
}