// GraphQL Operations: Leave Management (Manager Department-Scoped)
// Feature: 016-repair-management-pages - Task T014
// Purpose: Manager CRUD operations for leave requests with department-scoped RLS

import { gql } from '@urql/svelte';
import type { DataRequest, UserCredentials } from '$lib/models/data-request';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query: Get pending leave requests for manager's department only
 * RLS Policy: manager_view_department_leave_requests
 * Covers: FR-001, FR-008
 */
export const GET_PENDING_LEAVE_REQUESTS = gql`
	query GetPendingLeaveRequests(
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [LeaveRequestsOrderBy!] = [CREATED_AT_DESC]
		$filter: LeaveRequestFilter
	) {
		leaveRequests(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				employeeId
				employee {
					id
					displayName
					email
					jobTitle
					department {
						id
						name
					}
				}
				leaveType
				startDate
				endDate
				totalDays
				reason
				status
				reviewedBy
				reviewer {
					id
					displayName
					email
				}
				reviewNotes
				reviewedAt
				createdAt
				updatedAt
			}
			totalCount
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
 * Query: Get leave request by ID (department-scoped)
 * RLS Policy: manager_view_department_leave_requests
 */
export const GET_LEAVE_REQUEST_BY_ID = gql`
	query GetLeaveRequestById($id: UUID!) {
		leaveRequest(id: $id) {
			id
			employeeId
			employee {
				id
				displayName
				email
				jobTitle
				department {
					id
					name
				}
			}
			leaveType
			startDate
			endDate
			totalDays
			reason
			status
			reviewedBy
			reviewer {
				id
				displayName
				email
			}
			reviewNotes
			reviewedAt
			createdAt
			updatedAt
		}
	}
`;

/**
 * Query: Get leave statistics for manager's department
 * Covers: FR-009
 */
export const GET_LEAVE_STATISTICS = gql`
	query GetLeaveStatistics($departmentId: UUID!) {
		pendingLeaveRequests: leaveRequests(
			filter: { status: { equalTo: "pending" }, employee: { departmentId: { equalTo: $departmentId } } }
		) {
			totalCount
		}
		approvedLeaveRequests: leaveRequests(
			filter: { status: { equalTo: "approved" }, employee: { departmentId: { equalTo: $departmentId } } }
		) {
			totalCount
		}
		rejectedLeaveRequests: leaveRequests(
			filter: { status: { equalTo: "rejected" }, employee: { departmentId: { equalTo: $departmentId } } }
		) {
			totalCount
		}
		allLeaveRequests: leaveRequests(
			filter: { employee: { departmentId: { equalTo: $departmentId } } }
		) {
			totalCount
			nodes {
				totalDays
			}
		}
	}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mutation: Approve leave request
 * RLS Policy: manager_update_department_leave_requests
 * Covers: FR-001, FR-002
 */
export const APPROVE_LEAVE_REQUEST = gql`
	mutation ApproveLeaveRequest($input: UpdateLeaveRequestInput!) {
		updateLeaveRequest(input: $input) {
			leaveRequest {
				id
				employeeId
				employee {
					id
					displayName
					email
				}
				leaveType
				startDate
				endDate
				totalDays
				status
				reviewedBy
				reviewer {
					id
					displayName
					email
				}
				reviewNotes
				reviewedAt
				updatedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Reject leave request
 * RLS Policy: manager_update_department_leave_requests
 * Covers: FR-001, FR-002
 * Note: reviewNotes is REQUIRED when rejecting (enforced in UI)
 */
export const REJECT_LEAVE_REQUEST = gql`
	mutation RejectLeaveRequest($input: UpdateLeaveRequestInput!) {
		updateLeaveRequest(input: $input) {
			leaveRequest {
				id
				employeeId
				employee {
					id
					displayName
					email
				}
				leaveType
				startDate
				endDate
				totalDays
				status
				reviewedBy
				reviewer {
					id
					displayName
					email
				}
				reviewNotes
				reviewedAt
				updatedAt
			}
			clientMutationId
		}
	}
`;

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

export interface LeaveRequestFilter {
	status?: {
		equalTo?: 'pending' | 'approved' | 'rejected';
		in?: Array<'pending' | 'approved' | 'rejected'>;
	};
	leaveType?: {
		equalTo?: string;
		in?: string[];
	};
	employeeId?: {
		equalTo?: string;
	};
	startDate?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	endDate?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	createdAt?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	employee?: {
		departmentId?: {
			equalTo?: string;
		};
		displayName?: {
			includesInsensitive?: string;
		};
	};
}

export interface UpdateLeaveRequestInput {
	clientMutationId?: string;
	id: string;
	patch: {
		status?: 'pending' | 'approved' | 'rejected';
		reviewedBy?: string;
		reviewNotes?: string;
		reviewedAt?: string;
	};
}

export interface LeaveRequest {
	id: string;
	employeeId: string;
	employee: {
		id: string;
		displayName: string;
		email: string;
		jobTitle?: string;
		department: {
			id: string;
			name: string;
		};
	};
	leaveType: string;
	startDate: string;
	endDate: string;
	totalDays: number;
	reason?: string;
	status: 'pending' | 'approved' | 'rejected';
	reviewedBy?: string;
	reviewer?: {
		id: string;
		displayName: string;
		email: string;
	};
	reviewNotes?: string;
	reviewedAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface LeaveStatistics {
	pendingCount: number;
	approvedCount: number;
	rejectedCount: number;
	totalCount: number;
	totalDaysRequested: number;
	averageRequestDays: number;
	approvalRate: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper: Build leave request filter safely
 */
export function buildLeaveRequestFilter({
	status,
	leaveType,
	employeeId,
	employeeName,
	startDate,
	endDate,
	departmentId
}: {
	status?: 'pending' | 'approved' | 'rejected';
	leaveType?: string;
	employeeId?: string;
	employeeName?: string;
	startDate?: string;
	endDate?: string;
	departmentId?: string;
}): LeaveRequestFilter {
	const filter: LeaveRequestFilter = {};

	if (status) {
		filter.status = { equalTo: status };
	}

	if (leaveType) {
		filter.leaveType = { equalTo: leaveType };
	}

	if (employeeId) {
		filter.employeeId = { equalTo: employeeId };
	}

	if (employeeName) {
		filter.employee = {
			displayName: { includesInsensitive: employeeName }
		};
	}

	if (departmentId) {
		filter.employee = {
			...filter.employee,
			departmentId: { equalTo: departmentId }
		};
	}

	if (startDate) {
		filter.startDate = { greaterThanOrEqualTo: startDate };
	}

	if (endDate) {
		filter.endDate = { lessThanOrEqualTo: endDate };
	}

	return filter;
}

/**
 * Helper: Calculate leave statistics from raw data
 */
export function calculateLeaveStatistics(data: {
	pendingLeaveRequests: { totalCount: number };
	approvedLeaveRequests: { totalCount: number };
	rejectedLeaveRequests: { totalCount: number };
	allLeaveRequests: { totalCount: number; nodes: Array<{ totalDays: number }> };
}): LeaveStatistics {
	const totalDaysRequested = data.allLeaveRequests.nodes.reduce(
		(sum, request) => sum + request.totalDays,
		0
	);
	const averageRequestDays =
		data.allLeaveRequests.totalCount > 0
			? Math.round(totalDaysRequested / data.allLeaveRequests.totalCount)
			: 0;

	const totalReviewed =
		data.approvedLeaveRequests.totalCount + data.rejectedLeaveRequests.totalCount;
	const approvalRate =
		totalReviewed > 0
			? Math.round((data.approvedLeaveRequests.totalCount / totalReviewed) * 100)
			: 0;

	return {
		pendingCount: data.pendingLeaveRequests.totalCount,
		approvedCount: data.approvedLeaveRequests.totalCount,
		rejectedCount: data.rejectedLeaveRequests.totalCount,
		totalCount: data.allLeaveRequests.totalCount,
		totalDaysRequested,
		averageRequestDays,
		approvalRate
	};
}

/**
 * Helper: Validate approval/rejection input
 */
export function validateLeaveReview(
	action: 'approve' | 'reject',
	reviewNotes?: string
): { valid: boolean; error?: string } {
	if (action === 'reject' && (!reviewNotes || reviewNotes.trim().length === 0)) {
		return {
			valid: false,
			error: 'Review notes are required when rejecting a leave request'
		};
	}

	if (reviewNotes && reviewNotes.length > 1000) {
		return {
			valid: false,
			error: 'Review notes must be less than 1000 characters'
		};
	}

	return { valid: true };
}

/**
 * Helper: Format leave date range
 */
export function formatLeaveDateRange(startDate: string, endDate: string): string {
	const start = new Date(startDate);
	const end = new Date(endDate);

	const formatOptions: Intl.DateTimeFormatOptions = {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	};

	if (start.getFullYear() === end.getFullYear()) {
		if (start.getMonth() === end.getMonth()) {
			// Same month: "Jan 15-20, 2025"
			return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${end.getDate()}, ${end.getFullYear()}`;
		}
		// Same year: "Jan 15 - Feb 20, 2025"
		return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${end.getFullYear()}`;
	}

	// Different years: "Dec 15, 2024 - Jan 5, 2025"
	return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
}

/**
 * Helper: Get leave type badge color
 */
export function getLeaveTypeBadgeColor(leaveType: string): string {
	const leaveTypeColors: Record<string, string> = {
		vacation: 'blue',
		sick: 'red',
		personal: 'purple',
		bereavement: 'gray',
		parental: 'green',
		unpaid: 'orange'
	};

	return leaveTypeColors[leaveType.toLowerCase()] || 'gray';
}

/**
 * Helper: Get status badge color
 */
export function getStatusBadgeColor(status: string): string {
	const statusColors: Record<string, string> = {
		pending: 'yellow',
		approved: 'green',
		rejected: 'red'
	};

	return statusColors[status.toLowerCase()] || 'gray';
}

// ============================================================================
// OPERATIONS CLASS (Standardized Error Handling)
// ============================================================================

/**
 * T014: Manager Leave Management Operations with Department-Scoped RLS
 * This class follows TDD principles - tests are written first in
 * tests/contract/manager-leave-operations.test.ts
 */
export class LeaveManagementOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Get pending leave requests for manager's department
	 * RLS automatically filters to department only via JWT claims
	 */
	async getPendingLeaveRequests(params: {
		first?: number;
		offset?: number;
		filter?: LeaveRequestFilter;
		userCredentials: UserCredentials;
	}): Promise<{
		requests: LeaveRequest[];
		totalCount: number;
		hasNextPage: boolean;
	}> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetPendingLeaveRequests',
			variables: {
				first: params.first || 20,
				offset: params.offset || 0,
				filter: params.filter || {}
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_PENDING_LEAVE_REQUESTS, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load leave requests. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No leave requests data returned. Please try again.'
				});
			}

			return {
				requests: result.data.leaveRequests.nodes,
				totalCount: result.data.leaveRequests.totalCount,
				hasNextPage: result.data.leaveRequests.pageInfo.hasNextPage
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load leave requests. Please try again.'
			});
		}
	}

	/**
	 * Get leave statistics for manager's department
	 */
	async getLeaveStatistics(params: {
		departmentId: string;
		userCredentials: UserCredentials;
	}): Promise<LeaveStatistics> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetLeaveStatistics',
			variables: { departmentId: params.departmentId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_LEAVE_STATISTICS, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load statistics. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No statistics data returned. Please try again.'
				});
			}

			const stats = calculateLeaveStatistics(result.data);
			return stats;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load leave statistics. Please try again.'
			});
		}
	}

	/**
	 * Approve leave request (manager department-scoped)
	 * RLS policy enforces department membership
	 */
	async approveLeaveRequest(params: {
		leaveRequestId: string;
		managerId: string;
		reviewNotes?: string;
		userCredentials: UserCredentials;
	}): Promise<LeaveRequest> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Validate input
		const validation = validateLeaveReview('approve', params.reviewNotes);
		if (!validation.valid) {
			throw createErrorResponse(new Error(validation.error), {
				type: 'validation',
				userMessage: validation.error!
			});
		}

		const input: UpdateLeaveRequestInput = {
			id: params.leaveRequestId,
			patch: {
				status: 'approved',
				reviewedBy: params.managerId,
				reviewNotes: params.reviewNotes,
				reviewedAt: new Date().toISOString()
			}
		};

		const dataRequest = createDataRequest({
			operationName: 'ApproveLeaveRequest',
			variables: { input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(APPROVE_LEAVE_REQUEST, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to approve leave request. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No leave request data returned. Please try again.'
				});
			}

			return result.data.updateLeaveRequest.leaveRequest;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to approve leave request. Please try again.'
			});
		}
	}

	/**
	 * Reject leave request (manager department-scoped)
	 * RLS policy enforces department membership
	 * Review notes are REQUIRED
	 */
	async rejectLeaveRequest(params: {
		leaveRequestId: string;
		managerId: string;
		reviewNotes: string;
		userCredentials: UserCredentials;
	}): Promise<LeaveRequest> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Validate input - review notes REQUIRED for rejection
		const validation = validateLeaveReview('reject', params.reviewNotes);
		if (!validation.valid) {
			throw createErrorResponse(new Error(validation.error), {
				type: 'validation',
				userMessage: validation.error!
			});
		}

		const input: UpdateLeaveRequestInput = {
			id: params.leaveRequestId,
			patch: {
				status: 'rejected',
				reviewedBy: params.managerId,
				reviewNotes: params.reviewNotes,
				reviewedAt: new Date().toISOString()
			}
		};

		const dataRequest = createDataRequest({
			operationName: 'RejectLeaveRequest',
			variables: { input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(REJECT_LEAVE_REQUEST, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to reject leave request. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No leave request data returned. Please try again.'
				});
			}

			return result.data.updateLeaveRequest.leaveRequest;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to reject leave request. Please try again.'
			});
		}
	}
}

/**
 * Factory function to create LeaveManagementOperations instance
 */
export function createLeaveManagementOperations(client: Client): LeaveManagementOperations {
	return new LeaveManagementOperations(client);
}
