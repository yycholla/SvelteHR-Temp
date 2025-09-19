/**
 * GraphQL Operations for Leave Management
 * Generated for PostGraphile schema introspection
 */

import { gql } from '@urql/svelte';

// Fragments for reusable field sets
export const LEAVE_POLICY_FIELDS = gql`
	fragment LeavePolicyFields on LeavePolicy {
		id
		name
		leaveType
		allowancePerYear
		carryoverLimit
		maxConsecutiveDays
		requiresApproval
		isActive
		createdAt
		updatedAt
	}
`;

export const LEAVE_BALANCE_FIELDS = gql`
	fragment LeaveBalanceFields on LeaveBalance {
		id
		employeeId
		leavePolicyId
		year
		allowance
		used
		remaining
		carryover
		createdAt
		updatedAt
	}
`;

export const LEAVE_REQUEST_BASIC_FIELDS = gql`
	fragment LeaveRequestBasicFields on LeaveRequest {
		id
		employeeId
		leavePolicyId
		startDate
		endDate
		days
		reason
		status
		requestedAt
		createdAt
		updatedAt
	}
`;

export const LEAVE_REQUEST_FULL_FIELDS = gql`
	fragment LeaveRequestFullFields on LeaveRequest {
		...LeaveRequestBasicFields
		approvedBy
		approvedAt
		rejectedBy
		rejectedAt
		rejectionReason
		metadata
	}
	${LEAVE_REQUEST_BASIC_FIELDS}
`;

export const USER_BASIC_FIELDS = gql`
	fragment UserBasicFields on User {
		id
		email
		displayName
		isActive
	}
`;

// Query: Get all leave policies
export const GET_LEAVE_POLICIES_QUERY = gql`
	query GetLeavePolicies(
		$first: Int
		$offset: Int
		$orderBy: [LeavePoliciesOrderBy!]
		$condition: LeavePolicyCondition
	) {
		allLeavePolicies(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
			nodes {
				...LeavePolicyFields
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
	${LEAVE_POLICY_FIELDS}
`;

// Query: Get active leave policies
export const GET_ACTIVE_LEAVE_POLICIES_QUERY = gql`
	query GetActiveLeavePolicies {
		allLeavePolicies(condition: { isActive: true }, orderBy: LEAVE_TYPE_ASC) {
			nodes {
				...LeavePolicyFields
			}
		}
	}
	${LEAVE_POLICY_FIELDS}
`;

// Query: Get leave policy by ID
export const GET_LEAVE_POLICY_BY_ID_QUERY = gql`
	query GetLeavePolicyById($id: UUID!) {
		leavePolicyById(id: $id) {
			...LeavePolicyFields
		}
	}
	${LEAVE_POLICY_FIELDS}
`;

// Query: Get employee leave balances
export const GET_EMPLOYEE_LEAVE_BALANCES_QUERY = gql`
	query GetEmployeeLeaveBalances($employeeId: UUID!, $year: Int) {
		allLeaveBalances(
			condition: { employeeId: $employeeId, year: $year }
			orderBy: LEAVE_POLICY_ID_ASC
		) {
			nodes {
				...LeaveBalanceFields
				leavePolicyByLeavePolicyId {
					...LeavePolicyFields
				}
			}
		}
	}
	${LEAVE_BALANCE_FIELDS}
	${LEAVE_POLICY_FIELDS}
`;

// Query: Get current year leave balances for employee
export const GET_CURRENT_LEAVE_BALANCES_QUERY = gql`
	query GetCurrentLeaveBalances($employeeId: UUID!) {
		allLeaveBalances(
			condition: { employeeId: $employeeId, year: 2025 }
			orderBy: LEAVE_POLICY_ID_ASC
		) {
			nodes {
				...LeaveBalanceFields
				leavePolicyByLeavePolicyId {
					...LeavePolicyFields
				}
			}
		}
	}
	${LEAVE_BALANCE_FIELDS}
	${LEAVE_POLICY_FIELDS}
`;

// Query: Get leave requests for employee
export const GET_EMPLOYEE_LEAVE_REQUESTS_QUERY = gql`
	query GetEmployeeLeaveRequests(
		$employeeId: UUID!
		$first: Int
		$offset: Int
		$status: LeaveStatusEnum
	) {
		allLeaveRequests(
			first: $first
			offset: $offset
			condition: { employeeId: $employeeId, status: $status }
			orderBy: REQUESTED_AT_DESC
		) {
			nodes {
				...LeaveRequestFullFields
				leavePolicyByLeavePolicyId {
					...LeavePolicyFields
				}
				userByEmployeeId {
					...UserBasicFields
				}
				approverByApprovedBy: userByApprovedBy {
					...UserBasicFields
				}
				rejectorByRejectedBy: userByRejectedBy {
					...UserBasicFields
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
	${LEAVE_REQUEST_FULL_FIELDS}
	${LEAVE_POLICY_FIELDS}
	${USER_BASIC_FIELDS}
`;

// Query: Get all leave requests (for managers/HR)
export const GET_ALL_LEAVE_REQUESTS_QUERY = gql`
	query GetAllLeaveRequests(
		$first: Int
		$offset: Int
		$status: LeaveStatusEnum
		$orderBy: [LeaveRequestsOrderBy!]
	) {
		allLeaveRequests(
			first: $first
			offset: $offset
			condition: { status: $status }
			orderBy: $orderBy
		) {
			nodes {
				...LeaveRequestFullFields
				leavePolicyByLeavePolicyId {
					...LeavePolicyFields
				}
				userByEmployeeId {
					...UserBasicFields
				}
				approverByApprovedBy: userByApprovedBy {
					...UserBasicFields
				}
				rejectorByRejectedBy: userByRejectedBy {
					...UserBasicFields
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
	${LEAVE_REQUEST_FULL_FIELDS}
	${LEAVE_POLICY_FIELDS}
	${USER_BASIC_FIELDS}
`;

// Query: Get pending leave requests for approval
export const GET_PENDING_LEAVE_REQUESTS_QUERY = gql`
	query GetPendingLeaveRequests($first: Int, $offset: Int) {
		allLeaveRequests(
			first: $first
			offset: $offset
			condition: { status: PENDING }
			orderBy: REQUESTED_AT_ASC
		) {
			nodes {
				...LeaveRequestFullFields
				leavePolicyByLeavePolicyId {
					...LeavePolicyFields
				}
				userByEmployeeId {
					...UserBasicFields
				}
			}
			totalCount
		}
	}
	${LEAVE_REQUEST_FULL_FIELDS}
	${LEAVE_POLICY_FIELDS}
	${USER_BASIC_FIELDS}
`;

// Query: Get leave request by ID
export const GET_LEAVE_REQUEST_BY_ID_QUERY = gql`
	query GetLeaveRequestById($id: UUID!) {
		leaveRequestById(id: $id) {
			...LeaveRequestFullFields
			leavePolicyByLeavePolicyId {
				...LeavePolicyFields
			}
			userByEmployeeId {
				...UserBasicFields
			}
			approverByApprovedBy: userByApprovedBy {
				...UserBasicFields
			}
			rejectorByRejectedBy: userByRejectedBy {
				...UserBasicFields
			}
		}
	}
	${LEAVE_REQUEST_FULL_FIELDS}
	${LEAVE_POLICY_FIELDS}
	${USER_BASIC_FIELDS}
`;

// Query: Get leave statistics for employee
export const GET_EMPLOYEE_LEAVE_STATS_QUERY = gql`
  query GetEmployeeLeaveStats($employeeId: UUID!, $year: Int!) {
    totalRequests: allLeaveRequests(
      condition: { employeeId: $employeeId }
      filter: { requestedAt: { greaterThanOrEqualTo: "${year}-01-01", lessThan: "${year + 1}-01-01" } }
    ) {
      totalCount
    }
    approvedRequests: allLeaveRequests(
      condition: { employeeId: $employeeId, status: APPROVED }
      filter: { requestedAt: { greaterThanOrEqualTo: "${year}-01-01", lessThan: "${year + 1}-01-01" } }
    ) {
      totalCount
    }
    pendingRequests: allLeaveRequests(
      condition: { employeeId: $employeeId, status: PENDING }
      filter: { requestedAt: { greaterThanOrEqualTo: "${year}-01-01", lessThan: "${year + 1}-01-01" } }
    ) {
      totalCount
    }
    rejectedRequests: allLeaveRequests(
      condition: { employeeId: $employeeId, status: REJECTED }
      filter: { requestedAt: { greaterThanOrEqualTo: "${year}-01-01", lessThan: "${year + 1}-01-01" } }
    ) {
      totalCount
    }
  }
`;

// Query: Get team leave calendar (for managers)
export const GET_TEAM_LEAVE_CALENDAR_QUERY = gql`
	query GetTeamLeaveCalendar($startDate: Date!, $endDate: Date!, $employeeIds: [UUID!]) {
		allLeaveRequests(
			condition: { status: APPROVED }
			filter: {
				and: [
					{ employeeId: { in: $employeeIds } }
					{ startDate: { lessThanOrEqualTo: $endDate } }
					{ endDate: { greaterThanOrEqualTo: $startDate } }
				]
			}
			orderBy: START_DATE_ASC
		) {
			nodes {
				...LeaveRequestBasicFields
				userByEmployeeId {
					...UserBasicFields
				}
				leavePolicyByLeavePolicyId {
					name
					leaveType
				}
			}
		}
	}
	${LEAVE_REQUEST_BASIC_FIELDS}
	${USER_BASIC_FIELDS}
`;

// Mutation: Create leave policy
export const CREATE_LEAVE_POLICY_MUTATION = gql`
	mutation CreateLeavePolicy($input: CreateLeavePolicyInput!) {
		createLeavePolicy(input: $input) {
			leavePolicy {
				...LeavePolicyFields
			}
			clientMutationId
		}
	}
	${LEAVE_POLICY_FIELDS}
`;

// Mutation: Update leave policy
export const UPDATE_LEAVE_POLICY_MUTATION = gql`
	mutation UpdateLeavePolicy($input: UpdateLeavePolicyByIdInput!) {
		updateLeavePolicyById(input: $input) {
			leavePolicy {
				...LeavePolicyFields
			}
			clientMutationId
		}
	}
	${LEAVE_POLICY_FIELDS}
`;

// Mutation: Create leave balance
export const CREATE_LEAVE_BALANCE_MUTATION = gql`
	mutation CreateLeaveBalance($input: CreateLeaveBalanceInput!) {
		createLeaveBalance(input: $input) {
			leaveBalance {
				...LeaveBalanceFields
			}
			clientMutationId
		}
	}
	${LEAVE_BALANCE_FIELDS}
`;

// Mutation: Update leave balance
export const UPDATE_LEAVE_BALANCE_MUTATION = gql`
	mutation UpdateLeaveBalance($input: UpdateLeaveBalanceByIdInput!) {
		updateLeaveBalanceById(input: $input) {
			leaveBalance {
				...LeaveBalanceFields
			}
			clientMutationId
		}
	}
	${LEAVE_BALANCE_FIELDS}
`;

// Mutation: Submit leave request
export const SUBMIT_LEAVE_REQUEST_MUTATION = gql`
	mutation SubmitLeaveRequest($input: CreateLeaveRequestInput!) {
		createLeaveRequest(input: $input) {
			leaveRequest {
				...LeaveRequestFullFields
			}
			clientMutationId
		}
	}
	${LEAVE_REQUEST_FULL_FIELDS}
`;

// Mutation: Update leave request
export const UPDATE_LEAVE_REQUEST_MUTATION = gql`
	mutation UpdateLeaveRequest($input: UpdateLeaveRequestByIdInput!) {
		updateLeaveRequestById(input: $input) {
			leaveRequest {
				...LeaveRequestFullFields
			}
			clientMutationId
		}
	}
	${LEAVE_REQUEST_FULL_FIELDS}
`;

// Mutation: Approve leave request
export const APPROVE_LEAVE_REQUEST_MUTATION = gql`
	mutation ApproveLeaveRequest($id: UUID!, $approverId: UUID!) {
		updateLeaveRequestById(
			input: {
				id: $id
				leaveRequestPatch: { status: APPROVED, approvedBy: $approverId, approvedAt: "now()" }
			}
		) {
			leaveRequest {
				...LeaveRequestFullFields
			}
			clientMutationId
		}
	}
	${LEAVE_REQUEST_FULL_FIELDS}
`;

// Mutation: Reject leave request
export const REJECT_LEAVE_REQUEST_MUTATION = gql`
	mutation RejectLeaveRequest($id: UUID!, $rejectorId: UUID!, $rejectionReason: String!) {
		updateLeaveRequestById(
			input: {
				id: $id
				leaveRequestPatch: {
					status: REJECTED
					rejectedBy: $rejectorId
					rejectedAt: "now()"
					rejectionReason: $rejectionReason
				}
			}
		) {
			leaveRequest {
				...LeaveRequestFullFields
			}
			clientMutationId
		}
	}
	${LEAVE_REQUEST_FULL_FIELDS}
`;

// Mutation: Cancel leave request
export const CANCEL_LEAVE_REQUEST_MUTATION = gql`
	mutation CancelLeaveRequest($id: UUID!) {
		updateLeaveRequestById(input: { id: $id, leaveRequestPatch: { status: CANCELLED } }) {
			leaveRequest {
				...LeaveRequestFullFields
			}
			clientMutationId
		}
	}
	${LEAVE_REQUEST_FULL_FIELDS}
`;

// TypeScript interfaces for type safety
export interface LeavePolicy {
	id: string;
	name: string;
	leaveType: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'PATERNITY' | 'BEREAVEMENT' | 'OTHER';
	allowancePerYear: number;
	carryoverLimit: number;
	maxConsecutiveDays?: number;
	requiresApproval: boolean;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface LeaveBalance {
	id: string;
	employeeId: string;
	leavePolicyId: string;
	year: number;
	allowance: number;
	used: number;
	remaining: number;
	carryover: number;
	createdAt: string;
	updatedAt: string;
	leavePolicyByLeavePolicyId?: LeavePolicy;
}

export interface LeaveRequest {
	id: string;
	employeeId: string;
	leavePolicyId: string;
	startDate: string;
	endDate: string;
	days: number;
	reason?: string;
	status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
	requestedAt: string;
	approvedBy?: string;
	approvedAt?: string;
	rejectedBy?: string;
	rejectedAt?: string;
	rejectionReason?: string;
	metadata?: Record<string, any>;
	createdAt: string;
	updatedAt: string;
	leavePolicyByLeavePolicyId?: LeavePolicy;
	userByEmployeeId?: {
		id: string;
		email: string;
		displayName: string;
		isActive: boolean;
	};
	approverByApprovedBy?: {
		id: string;
		email: string;
		displayName: string;
		isActive: boolean;
	};
	rejectorByRejectedBy?: {
		id: string;
		email: string;
		displayName: string;
		isActive: boolean;
	};
}

export interface LeaveRequestsConnection {
	nodes: LeaveRequest[];
	totalCount: number;
	pageInfo: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
}

export interface LeaveStats {
	totalRequests: { totalCount: number };
	approvedRequests: { totalCount: number };
	pendingRequests: { totalCount: number };
	rejectedRequests: { totalCount: number };
}

export interface CreateLeavePolicyInput {
	leavePolicy: {
		name: string;
		leaveType: string;
		allowancePerYear: number;
		carryoverLimit: number;
		maxConsecutiveDays?: number;
		requiresApproval?: boolean;
		isActive?: boolean;
	};
	clientMutationId?: string;
}

export interface CreateLeaveBalanceInput {
	leaveBalance: {
		employeeId: string;
		leavePolicyId: string;
		year: number;
		allowance: number;
		carryover?: number;
	};
	clientMutationId?: string;
}

export interface SubmitLeaveRequestInput {
	leaveRequest: {
		employeeId: string;
		leavePolicyId: string;
		startDate: string;
		endDate: string;
		days: number;
		reason?: string;
	};
	clientMutationId?: string;
}

export interface UpdateLeaveRequestInput {
	id: string;
	leaveRequestPatch: {
		startDate?: string;
		endDate?: string;
		days?: number;
		reason?: string;
		status?: string;
		approvedBy?: string;
		approvedAt?: string;
		rejectedBy?: string;
		rejectedAt?: string;
		rejectionReason?: string;
	};
	clientMutationId?: string;
}

// Utility functions for leave management
export const LeaveUtils = {
	/**
	 * Calculate working days between two dates
	 */
	calculateWorkingDays: (startDate: Date, endDate: Date): number => {
		let count = 0;
		const current = new Date(startDate);
		while (current <= endDate) {
			const dayOfWeek = current.getDay();
			if (dayOfWeek !== 0 && dayOfWeek !== 6) {
				// Exclude weekends
				count++;
			}
			current.setDate(current.getDate() + 1);
		}
		return count;
	},

	/**
	 * Format leave status for display
	 */
	formatLeaveStatus: (status: string): string => {
		switch (status) {
			case 'PENDING':
				return 'Pending Approval';
			case 'APPROVED':
				return 'Approved';
			case 'REJECTED':
				return 'Rejected';
			case 'CANCELLED':
				return 'Cancelled';
			default:
				return status;
		}
	},

	/**
	 * Get status color for UI
	 */
	getStatusColor: (status: string): string => {
		switch (status) {
			case 'PENDING':
				return 'warning';
			case 'APPROVED':
				return 'success';
			case 'REJECTED':
				return 'error';
			case 'CANCELLED':
				return 'secondary';
			default:
				return 'default';
		}
	},

	/**
	 * Check if leave request can be edited
	 */
	canEditRequest: (status: string): boolean => {
		return status === 'PENDING';
	},

	/**
	 * Check if leave request can be cancelled
	 */
	canCancelRequest: (status: string, startDate: string): boolean => {
		const start = new Date(startDate);
		const now = new Date();
		return status === 'PENDING' || (status === 'APPROVED' && start > now);
	}
};
