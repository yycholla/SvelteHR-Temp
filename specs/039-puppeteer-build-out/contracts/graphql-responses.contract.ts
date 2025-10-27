// GraphQL Response Contract
// Defines expected GraphQL response structures for validation in Puppeteer tests
// Status: Template - Requires Implementation

/**
 * Expected GraphQL response structures for runtime validation.
 *
 * Purpose: Validate that GraphQL responses match expected schema and detect
 * placeholder data vs real data programmatically.
 */

// User response structure
export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Employee response structure
export interface EmployeeResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  hireDate: string;
  departmentId: string;
  position: string;
  status: 'active' | 'inactive';
  department?: {
    id: string;
    name: string;
  };
}

// Event response structure
export interface EventResponse {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  attendees: UserResponse[];
  userRsvpStatus?: 'yes' | 'no' | 'maybe';
  createdAt: string;
  updatedAt: string;
}

// Task response structure
export interface TaskResponse {
  id: string;
  title: string;
  description: string;
  assignee: UserResponse;
  createdBy: UserResponse;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// Leave request response structure
export interface LeaveRequestResponse {
  id: string;
  employee: EmployeeResponse;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: UserResponse;
  createdAt: string;
  updatedAt: string;
}

// Paginated response structure
export interface PaginatedResponse<T> {
  edges: Array<{
    node: T;
    cursor: string;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
  totalCount: number;
}

/**
 * Validators for GraphQL responses
 */
export class GraphQLResponseValidator {
  /**
   * Validate user response structure
   */
  static validateUser(data: unknown): data is UserResponse {
    if (typeof data !== 'object' || data === null) return false;

    const user = data as any;
    return (
      typeof user.id === 'string' &&
      typeof user.email === 'string' &&
      typeof user.firstName === 'string' &&
      typeof user.lastName === 'string' &&
      typeof user.fullName === 'string' &&
      typeof user.role === 'string' &&
      typeof user.isActive === 'boolean' &&
      typeof user.createdAt === 'string' &&
      typeof user.updatedAt === 'string'
    );
  }

  /**
   * Validate employee response structure
   */
  static validateEmployee(data: unknown): data is EmployeeResponse {
    if (typeof data !== 'object' || data === null) return false;

    const employee = data as any;
    return (
      typeof employee.id === 'string' &&
      typeof employee.firstName === 'string' &&
      typeof employee.lastName === 'string' &&
      typeof employee.email === 'string' &&
      typeof employee.hireDate === 'string' &&
      typeof employee.departmentId === 'string' &&
      typeof employee.position === 'string' &&
      ['active', 'inactive'].includes(employee.status)
    );
  }

  /**
   * Validate event response structure
   */
  static validateEvent(data: unknown): data is EventResponse {
    if (typeof data !== 'object' || data === null) return false;

    const event = data as any;
    return (
      typeof event.id === 'string' &&
      typeof event.title === 'string' &&
      typeof event.startTime === 'string' &&
      typeof event.endTime === 'string' &&
      typeof event.allDay === 'boolean' &&
      Array.isArray(event.attendees) &&
      typeof event.createdAt === 'string' &&
      typeof event.updatedAt === 'string'
    );
  }

  /**
   * Validate task response structure
   */
  static validateTask(data: unknown): data is TaskResponse {
    if (typeof data !== 'object' || data === null) return false;

    const task = data as any;
    return (
      typeof task.id === 'string' &&
      typeof task.title === 'string' &&
      typeof task.description === 'string' &&
      typeof task.assignee === 'object' &&
      typeof task.createdBy === 'object' &&
      typeof task.dueDate === 'string' &&
      ['low', 'medium', 'high'].includes(task.priority) &&
      ['pending', 'in_progress', 'completed'].includes(task.status) &&
      typeof task.createdAt === 'string' &&
      typeof task.updatedAt === 'string'
    );
  }

  /**
   * Validate leave request response structure
   */
  static validateLeaveRequest(data: unknown): data is LeaveRequestResponse {
    if (typeof data !== 'object' || data === null) return false;

    const leaveRequest = data as any;
    return (
      typeof leaveRequest.id === 'string' &&
      typeof leaveRequest.employee === 'object' &&
      typeof leaveRequest.startDate === 'string' &&
      typeof leaveRequest.endDate === 'string' &&
      typeof leaveRequest.reason === 'string' &&
      ['pending', 'approved', 'rejected'].includes(leaveRequest.status) &&
      typeof leaveRequest.createdAt === 'string' &&
      typeof leaveRequest.updatedAt === 'string'
    );
  }

  /**
   * Validate paginated response structure
   */
  static validatePaginatedResponse<T>(
    data: unknown,
    nodeValidator: (node: unknown) => boolean
  ): data is PaginatedResponse<T> {
    if (typeof data !== 'object' || data === null) return false;

    const paginated = data as any;
    return (
      Array.isArray(paginated.edges) &&
      paginated.edges.every(
        (edge: any) =>
          typeof edge === 'object' &&
          nodeValidator(edge.node) &&
          typeof edge.cursor === 'string'
      ) &&
      typeof paginated.pageInfo === 'object' &&
      typeof paginated.pageInfo.hasNextPage === 'boolean' &&
      typeof paginated.pageInfo.hasPreviousPage === 'boolean' &&
      typeof paginated.pageInfo.startCursor === 'string' &&
      typeof paginated.pageInfo.endCursor === 'string' &&
      typeof paginated.totalCount === 'number'
    );
  }

  /**
   * Detect placeholder data vs real data
   */
  static isPlaceholderData(data: any): boolean {
    // Check for common placeholder patterns
    const placeholderPatterns = [
      /^placeholder/i,
      /^test/i,
      /^sample/i,
      /^dummy/i,
      /^N\/A$/,
      /^0$/,
      /^null$/,
      /^undefined$/,
    ];

    // Check string fields
    if (typeof data === 'string') {
      return placeholderPatterns.some((pattern) => pattern.test(data));
    }

    // Check object fields
    if (typeof data === 'object' && data !== null) {
      return Object.values(data).some((value) =>
        this.isPlaceholderData(value)
      );
    }

    return false;
  }

  /**
   * Validate timestamp is recent (within last 30 days)
   */
  static isRecentTimestamp(timestamp: string): boolean {
    const date = new Date(timestamp);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return date >= thirtyDaysAgo && date <= new Date();
  }
}
