/**
 * PostGraphile GraphQL Queries for Leave Requests
 *
 * This file contains all GraphQL queries for leave request management
 * using PostGraphile's auto-generated schema.
 */

/**
 * Get all leave requests with filtering, pagination, and user relationships
 */
export const GET_LEAVE_REQUESTS = `
  query GetLeaveRequests(
    $first: Int
    $offset: Int
    $orderBy: [LeaveRequestsOrderBy!]
    $condition: LeaveRequestCondition
  ) {
    allLeaveRequests(
      first: $first
      offset: $offset
      orderBy: $orderBy
      condition: $condition
    ) {
      totalCount
      nodes {
        id
        nodeId
        employeeId
        managerId
        leaveType
        startDate
        endDate
        daysRequested
        status
        reason
        managerComments
        createdAt
        updatedAt
        userByEmployeeId {
          id
          email
          displayName
          departmentId
          departmentByDepartmentId {
            id
            name
          }
        }
        userByManagerId {
          id
          email
          displayName
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Get a single leave request by ID with full details
 */
export const GET_LEAVE_REQUEST_BY_ID = `
  query GetLeaveRequestById($id: UUID!) {
    leaveRequestById(id: $id) {
      id
      nodeId
      employeeId
      managerId
      leaveType
      startDate
      endDate
      daysRequested
      status
      reason
      managerComments
      createdAt
      updatedAt
      userByEmployeeId {
        id
        email
        displayName
        departmentId
        departmentByDepartmentId {
          id
          name
        }
      }
      userByManagerId {
        id
        email
        displayName
      }
    }
  }
`;

/**
 * Get leave request statistics for a manager
 * Note: PostGraphile uses UPPERCASE enum values for status
 */
export const GET_LEAVE_REQUEST_STATS = `
  query GetLeaveRequestStats(
    $managerId: UUID
    $startDate: Date
    $endDate: Date
  ) {
    pending: allLeaveRequests(
      condition: { status: PENDING, managerId: $managerId }
    ) {
      totalCount
    }
    approved: allLeaveRequests(
      condition: { status: APPROVED, managerId: $managerId }
    ) {
      totalCount
    }
    rejected: allLeaveRequests(
      condition: { status: REJECTED, managerId: $managerId }
    ) {
      totalCount
    }
    allRequests: allLeaveRequests(
      condition: { managerId: $managerId }
    ) {
      totalCount
      nodes {
        daysRequested
        status
      }
    }
  }
`;

/**
 * Update leave request status (approve/deny)
 * Note: Status must be uppercase ENUM value (PENDING, APPROVED, REJECTED, CANCELLED)
 */
export const UPDATE_LEAVE_REQUEST_STATUS = `
  mutation UpdateLeaveRequestStatus(
    $id: UUID!
    $status: LeaveStatus!
    $managerComments: String
  ) {
    updateLeaveRequestById(
      input: {
        id: $id
        leaveRequestPatch: {
          status: $status
          managerComments: $managerComments
          updatedAt: "now()"
        }
      }
    ) {
      leaveRequest {
        id
        status
        managerComments
        updatedAt
      }
    }
  }
`;

/**
 * Create a new leave request
 * Note: Status is set to PENDING (uppercase) by default
 */
export const CREATE_LEAVE_REQUEST = `
  mutation CreateLeaveRequest(
    $employeeId: UUID!
    $managerId: UUID
    $leaveType: String!
    $startDate: Date!
    $endDate: Date!
    $daysRequested: Float!
    $reason: String
  ) {
    createLeaveRequest(
      input: {
        leaveRequest: {
          employeeId: $employeeId
          managerId: $managerId
          leaveType: $leaveType
          startDate: $startDate
          endDate: $endDate
          daysRequested: $daysRequested
          status: PENDING
          reason: $reason
        }
      }
    ) {
      leaveRequest {
        id
        nodeId
        employeeId
        managerId
        leaveType
        startDate
        endDate
        daysRequested
        status
        reason
        createdAt
      }
    }
  }
`;

/**
 * Delete a leave request
 */
export const DELETE_LEAVE_REQUEST = `
  mutation DeleteLeaveRequest($id: UUID!) {
    deleteLeaveRequestById(input: { id: $id }) {
      leaveRequest {
        id
      }
    }
  }
`;

// TypeScript types for query variables
export interface GetLeaveRequestsVariables {
	first?: number;
	offset?: number;
	orderBy?: string[];
	condition?: LeaveRequestCondition;
}

export interface LeaveRequestCondition {
	employeeId?: string;
	managerId?: string;
	leaveType?: string;
	status?: string;
	startDate?: string;
	endDate?: string;
}

export interface GetLeaveRequestByIdVariables {
	id: string;
}

export interface GetLeaveRequestStatsVariables {
	managerId?: string;
	startDate?: string;
	endDate?: string;
}

export interface UpdateLeaveRequestStatusVariables {
	id: string;
	status: string;
	managerComments?: string;
}

export interface CreateLeaveRequestVariables {
	employeeId: string;
	managerId?: string;
	leaveType: string;
	startDate: string;
	endDate: string;
	daysRequested: number;
	reason?: string;
}

export interface DeleteLeaveRequestVariables {
	id: string;
}

// Response types
export interface LeaveRequest {
	id: string;
	nodeId: string;
	employeeId: string;
	managerId: string | null;
	leaveType: string;
	startDate: string;
	endDate: string;
	daysRequested: number;
	status: string;
	reason: string | null;
	managerComments: string | null;
	createdAt: string;
	updatedAt: string;
	userByEmployeeId?: {
		id: string;
		email: string;
		displayName: string;
		departmentId: string | null;
		departmentByDepartmentId?: {
			id: string;
			name: string;
		} | null;
	};
	userByManagerId?: {
		id: string;
		email: string;
		displayName: string;
	} | null;
}

export interface LeaveRequestsResponse {
	allLeaveRequests: {
		totalCount: number;
		nodes: LeaveRequest[];
		pageInfo: {
			hasNextPage: boolean;
			hasPreviousPage: boolean;
			startCursor: string | null;
			endCursor: string | null;
		};
	};
}

export interface LeaveRequestStatsResponse {
	pending: { totalCount: number };
	approved: { totalCount: number };
	rejected: { totalCount: number };
	allRequests: {
		totalCount: number;
		nodes: Array<{
			daysRequested: number;
			status: string;
		}>;
	};
}

// Helper functions for status conversion between UI (lowercase) and PostGraphile (uppercase)

/**
 * Convert UI status (lowercase) to PostGraphile enum (uppercase)
 * @param status - Status from UI ('pending', 'approved', 'rejected', 'cancelled')
 * @returns Uppercase status for PostGraphile ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
 */
export function toPostGraphileStatus(status: string): string {
	return status.toUpperCase();
}

/**
 * Convert PostGraphile enum status (uppercase) to UI format (lowercase)
 * @param status - Status from PostGraphile ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
 * @returns Lowercase status for UI ('pending', 'approved', 'rejected', 'cancelled')
 */
export function fromPostGraphileStatus(status: string): string {
	return status.toLowerCase();
}
