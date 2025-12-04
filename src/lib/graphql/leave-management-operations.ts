/**
 * Leave Management Operations - Migrated to Rust Idiomatic GraphQL
 *
 * Simplified to use only backend-supported features.
 * Backend: Rust async-graphql with SeaORM
 */

import { gql } from '@urql/svelte';
import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query: Get leave requests with pagination
 * Backend: Rust idiomatic - leaveRequests(employeeId, limit, offset) returns direct array
 */
export const GET_LEAVE_REQUESTS_QUERY = gql`
	query GetLeaveRequests($employeeId: UUID, $limit: Int = 100, $offset: Int = 0) {
		leaveRequests(employeeId: $employeeId, limit: $limit, offset: $offset) {
			id
			employeeId
			leaveTypeId
			startDate
			endDate
			daysRequested
			reason
			status
			managerId
			approvedAt
			managerComments
			createdAt
			updatedAt
			employee {
				id
				displayName
				fullName
				email
				department {
					id
					name
				}
			}
			manager {
				id
				displayName
				fullName
				email
			}
			leaveType {
				id
				name
				color
			}
		}
	}
`;

/**
 * Query: Get single leave request by ID
 * Backend: Rust idiomatic - leaveRequest(id) not leaveRequestById
 */
export const GET_LEAVE_REQUEST_BY_ID_QUERY = gql`
	query GetLeaveRequestById($id: UUID!) {
		leaveRequest(id: $id) {
			id
			employeeId
			leaveTypeId
			startDate
			endDate
			daysRequested
			reason
			status
			managerId
			approvedAt
			managerComments
			createdAt
			updatedAt
			employee {
				id
				displayName
				fullName
				email
				department {
					id
					name
				}
			}
			manager {
				id
				displayName
				fullName
				email
			}
			leaveType {
				id
				name
				color
			}
		}
	}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mutation: Approve leave request
 * Backend: Rust idiomatic - approveLeaveRequest(input) returns LeaveRequest directly
 * Note: Approver ID comes from JWT context automatically
 */
export const APPROVE_LEAVE_REQUEST_MUTATION = gql`
	mutation ApproveLeaveRequest($input: ApproveLeaveRequestInput!) {
		approveLeaveRequest(input: $input) {
			id
			employeeId
			status
			managerId
			approvedAt
			managerComments
			updatedAt
			employee {
				id
				displayName
				email
			}
		}
	}
`;

/**
 * Mutation: Reject leave request
 * Backend: Rust idiomatic - rejectLeaveRequest(input) returns LeaveRequest directly
 * Note: Approver ID comes from JWT context, rejectionReason is REQUIRED
 */
export const REJECT_LEAVE_REQUEST_MUTATION = gql`
	mutation RejectLeaveRequest($input: RejectLeaveRequestInput!) {
		rejectLeaveRequest(input: $input) {
			id
			employeeId
			status
			managerId
			approvedAt
			managerComments
			updatedAt
			employee {
				id
				displayName
				email
			}
		}
	}
`;

/**
 * Mutation: Create leave request
 * Backend: Rust idiomatic - createLeaveRequest(input) returns LeaveRequest directly
 */
export const CREATE_LEAVE_REQUEST_MUTATION = gql`
	mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
		createLeaveRequest(input: $input) {
			id
			employeeId
			leaveTypeId
			startDate
			endDate
			daysRequested
			reason
			status
			createdAt
		}
	}
`;

/**
 * Mutation: Update leave request
 * Backend: Rust idiomatic - updateLeaveRequest(id, input) returns LeaveRequest directly
 */
export const UPDATE_LEAVE_REQUEST_MUTATION = gql`
	mutation UpdateLeaveRequest($id: UUID!, $input: UpdateLeaveRequestInput!) {
		updateLeaveRequest(id: $id, input: $input) {
			id
			startDate
			endDate
			daysRequested
			reason
			updatedAt
		}
	}
`;

/**
 * Mutation: Delete leave request
 * Backend: Rust idiomatic - deleteLeaveRequest(id) returns Boolean
 */
export const DELETE_LEAVE_REQUEST_MUTATION = gql`
	mutation DeleteLeaveRequest($id: UUID!) {
		deleteLeaveRequest(id: $id)
	}
`;

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

export interface LeaveRequest {
	id: string;
	employeeId: string;
	leaveTypeId: string;
	startDate: string;
	endDate: string;
	daysRequested: string; // Decimal as string
	reason?: string;
	status: 'pending' | 'approved' | 'rejected' | 'cancelled';
	managerId?: string;
	approvedAt?: string;
	managerComments?: string;
	createdAt: string;
	updatedAt: string;
	employee?: {
		id: string;
		displayName: string;
		fullName: string;
		email: string;
		department?: {
			id: string;
			name: string;
		};
	};
	manager?: {
		id: string;
		displayName: string;
		fullName: string;
		email: string;
	};
	leaveType?: {
		id: string;
		name: string;
		color?: string;
	};
}

export interface LeaveRequestFilter {
	status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
	employeeId?: string;
	startDate?: string;
	endDate?: string;
	employeeName?: string;
}

export interface CreateLeaveRequestInput {
	leaveTypeId: string;
	startDate: string; // ISO date string
	endDate: string; // ISO date string
	daysRequested: string; // Decimal as string
	reason?: string;
}

export interface UpdateLeaveRequestInput {
	startDate?: string;
	endDate?: string;
	daysRequested?: string;
	reason?: string;
}

export interface ApproveLeaveRequestInput {
	requestId: string;
}

export interface RejectLeaveRequestInput {
	requestId: string;
	rejectionReason: string; // REQUIRED
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
// OPERATIONS CLASS
// ============================================================================

/**
 * Leave Management Operations with Idiomatic Rust GraphQL Patterns
 */
export class LeaveManagementOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Get leave requests with optional employee filtering
	 * Backend filters are limited - additional filtering done client-side
	 */
	async getLeaveRequests(params: {
		employeeId?: string;
		limit?: number;
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

		const limit = params.limit || 100;
		const dataRequest = createDataRequest({
			operationName: 'GetLeaveRequests',
			variables: {
				employeeId: params.employeeId,
				limit,
				offset: params.offset || 0
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client
				.query(GET_LEAVE_REQUESTS_QUERY, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load leave requests. Please check your permissions and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.leaveRequests) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No leave request data returned. Please try again.'
				});
			}

			const requests = result.data.leaveRequests;

			// Apply client-side filtering if needed
			let filteredRequests = requests;
			if (params.filter) {
				filteredRequests = this.applyClientFilter(requests, params.filter);
			}

			return {
				requests: filteredRequests,
				totalCount: filteredRequests.length,
				hasNextPage: requests.length === limit
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load leave requests. Please try again.'
			});
		}
	}

	/**
	 * Get single leave request by ID
	 */
	async getLeaveRequestById(params: {
		id: string;
		userCredentials: UserCredentials;
	}): Promise<LeaveRequest> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetLeaveRequestById',
			variables: { id: params.id },
			userCredentials: params.userCredentials,
			timeoutMs: 4000
		});

		try {
			const result = await this.client
				.query(GET_LEAVE_REQUEST_BY_ID_QUERY, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load leave request details. Please check the ID and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.leaveRequest) {
				throw createErrorResponse(new Error('Leave request not found'), {
					type: 'validation',
					userMessage: 'Leave request not found. Please check the ID.'
				});
			}

			return result.data.leaveRequest;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load leave request details. Please try again.'
			});
		}
	}

	/**
	 * Approve leave request
	 * Note: Approver ID is automatically set from JWT context by backend
	 */
	async approveLeaveRequest(params: {
		requestId: string;
		userCredentials: UserCredentials;
	}): Promise<LeaveRequest> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const input: ApproveLeaveRequestInput = {
			requestId: params.requestId
		};

		const dataRequest = createDataRequest({
			operationName: 'ApproveLeaveRequest',
			variables: { input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client
				.mutation(APPROVE_LEAVE_REQUEST_MUTATION, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'validation',
					userMessage: 'Unable to approve leave request. Please check permissions and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.approveLeaveRequest) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No leave request data returned. Please try again.'
				});
			}

			return result.data.approveLeaveRequest;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to approve leave request. Please try again.'
			});
		}
	}

	/**
	 * Reject leave request
	 * Note: Approver ID is automatically set from JWT context by backend
	 * rejectionReason is REQUIRED
	 */
	async rejectLeaveRequest(params: {
		requestId: string;
		rejectionReason: string;
		userCredentials: UserCredentials;
	}): Promise<LeaveRequest> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Validate rejection reason
		if (!params.rejectionReason || params.rejectionReason.trim().length === 0) {
			throw createErrorResponse(new Error('Rejection reason is required'), {
				type: 'validation',
				userMessage: 'Rejection reason is required when rejecting a leave request'
			});
		}

		const input: RejectLeaveRequestInput = {
			requestId: params.requestId,
			rejectionReason: params.rejectionReason
		};

		const dataRequest = createDataRequest({
			operationName: 'RejectLeaveRequest',
			variables: { input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client
				.mutation(REJECT_LEAVE_REQUEST_MUTATION, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'validation',
					userMessage: 'Unable to reject leave request. Please check permissions and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.rejectLeaveRequest) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No leave request data returned. Please try again.'
				});
			}

			return result.data.rejectLeaveRequest;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to reject leave request. Please try again.'
			});
		}
	}

	/**
	 * Create new leave request
	 */
	async createLeaveRequest(params: {
		input: CreateLeaveRequestInput;
		userCredentials: UserCredentials;
	}): Promise<LeaveRequest> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'CreateLeaveRequest',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 8000
		});

		try {
			const result = await this.client
				.mutation(CREATE_LEAVE_REQUEST_MUTATION, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'validation',
					userMessage: 'Unable to create leave request. Please check the information and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.createLeaveRequest) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No leave request data returned. Please try again.'
				});
			}

			return result.data.createLeaveRequest;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to create leave request. Please try again.'
			});
		}
	}

	/**
	 * Update existing leave request
	 */
	async updateLeaveRequest(params: {
		id: string;
		input: UpdateLeaveRequestInput;
		userCredentials: UserCredentials;
	}): Promise<LeaveRequest> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdateLeaveRequest',
			variables: { id: params.id, input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 6000
		});

		try {
			const result = await this.client
				.mutation(UPDATE_LEAVE_REQUEST_MUTATION, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'validation',
					userMessage: 'Unable to update leave request. Please check the information and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.updateLeaveRequest) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No leave request data returned. Please try again.'
				});
			}

			return result.data.updateLeaveRequest;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to update leave request. Please try again.'
			});
		}
	}

	/**
	 * Delete leave request
	 * Returns: Boolean indicating success
	 */
	async deleteLeaveRequest(params: {
		id: string;
		userCredentials: UserCredentials;
	}): Promise<boolean> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'DeleteLeaveRequest',
			variables: { id: params.id },
			userCredentials: params.userCredentials,
			timeoutMs: 10000
		});

		try {
			const result = await this.client
				.mutation(DELETE_LEAVE_REQUEST_MUTATION, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'permission',
					userMessage: 'Unable to delete leave request. Please check your permissions.'
				});
				throw errorResponse;
			}

			return result.data?.deleteLeaveRequest || false;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to delete leave request. Please try again.'
			});
		}
	}

	/**
	 * Get leave statistics
	 * Note: Backend doesn't support complex filters - all filtering done client-side
	 */
	async getLeaveStatistics(params: {
		departmentId?: string;
		userCredentials: UserCredentials;
	}): Promise<LeaveStatistics> {
		// Fetch all leave requests and calculate statistics client-side
		const { requests } = await this.getLeaveRequests({
			limit: 1000,
			offset: 0,
			userCredentials: params.userCredentials
		});

		// Filter by department if specified
		let filteredRequests = requests;
		if (params.departmentId) {
			filteredRequests = requests.filter(
				(req) => req.employee?.department?.id === params.departmentId
			);
		}

		const pendingCount = filteredRequests.filter((req) => req.status === 'pending').length;
		const approvedCount = filteredRequests.filter((req) => req.status === 'approved').length;
		const rejectedCount = filteredRequests.filter((req) => req.status === 'rejected').length;
		const totalCount = filteredRequests.length;

		const totalDaysRequested = filteredRequests.reduce(
			(sum, req) => sum + parseFloat(req.daysRequested),
			0
		);

		const averageRequestDays = totalCount > 0 ? Math.round(totalDaysRequested / totalCount) : 0;

		const totalReviewed = approvedCount + rejectedCount;
		const approvalRate = totalReviewed > 0 ? Math.round((approvedCount / totalReviewed) * 100) : 0;

		return {
			pendingCount,
			approvedCount,
			rejectedCount,
			totalCount,
			totalDaysRequested: Math.round(totalDaysRequested),
			averageRequestDays,
			approvalRate
		};
	}

	/**
	 * Apply client-side filtering (temporary until backend supports filters)
	 */
	private applyClientFilter(requests: LeaveRequest[], filter: LeaveRequestFilter): LeaveRequest[] {
		return requests.filter((req) => {
			// Filter by status
			if (filter.status && req.status !== filter.status) {
				return false;
			}

			// Filter by employee ID
			if (filter.employeeId && req.employeeId !== filter.employeeId) {
				return false;
			}

			// Filter by employee name
			if (filter.employeeName) {
				const searchLower = filter.employeeName.toLowerCase();
				const matchesName =
					req.employee?.displayName?.toLowerCase().includes(searchLower) ||
					req.employee?.fullName?.toLowerCase().includes(searchLower);

				if (!matchesName) {
					return false;
				}
			}

			// Filter by date range
			if (filter.startDate && req.startDate < filter.startDate) {
				return false;
			}

			if (filter.endDate && req.endDate > filter.endDate) {
				return false;
			}

			return true;
		});
	}
}

/**
 * Factory function to create LeaveManagementOperations instance
 */
export function createLeaveManagementOperations(client: Client): LeaveManagementOperations {
	return new LeaveManagementOperations(client);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
 * Helper: Get status badge color
 */
export function getStatusBadgeColor(
	status: 'pending' | 'approved' | 'rejected' | 'cancelled'
): string {
	const statusColors: Record<string, string> = {
		pending: 'yellow',
		approved: 'green',
		rejected: 'red',
		cancelled: 'gray'
	};

	return statusColors[status.toLowerCase()] || 'gray';
}

/**
 * Helper: Validate rejection reason
 */
export function validateRejectionReason(reason?: string): { valid: boolean; error?: string } {
	if (!reason || reason.trim().length === 0) {
		return {
			valid: false,
			error: 'Rejection reason is required when rejecting a leave request'
		};
	}

	if (reason.length > 1000) {
		return {
			valid: false,
			error: 'Rejection reason must be less than 1000 characters'
		};
	}

	return { valid: true };
}
