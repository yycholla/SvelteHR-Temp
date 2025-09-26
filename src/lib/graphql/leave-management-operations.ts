// GraphQL Operations: Leave Management
// Created: 2025-09-24
// Task: T011 - Leave requests GraphQL operations

import { gql } from '@urql/svelte';
import type {
	LeaveRequest,
	LeaveRequestStatus,
	LeaveType,
	PaginationInput,
	SortInput
} from '$lib/types/graphql';

// Constants for type safety
export const LEAVE_REQUEST_STATUS = {
	PENDING: 'pending',
	APPROVED: 'approved',
	REJECTED: 'rejected',
	CANCELLED: 'cancelled'
} as const;

// Query: Get all leave requests for manager approval
export const GET_PENDING_LEAVE_REQUESTS = gql`
	query GetPendingLeaveRequests(
		$managerId: UUID!
		$status: String = "pending"
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [LeaveRequestsOrderBy!] = [CREATED_AT_ASC]
		$filter: LeaveRequestFilter
	) {
		leaveRequests(
			condition: { managerId: $managerId, status: $status }
			first: $first
			offset: $offset
			orderBy: $orderBy
			filter: $filter
		) {
			nodes {
				id
				employee {
					id
					displayName
					email
					department {
						id
						name
					}
				}
				leaveType
				startDate
				endDate
				daysRequested
				reason
				status
				managerComments
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

// Query: Get all leave requests (with flexible filtering)
export const GET_LEAVE_REQUESTS = gql`
	query GetLeaveRequests(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [LeaveRequestsOrderBy!] = [CREATED_AT_DESC]
		$filter: LeaveRequestFilter
	) {
		leaveRequests(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				employee {
					id
					displayName
					email
					department {
						id
						name
					}
				}
				manager {
					id
					displayName
					email
				}
				leaveType
				startDate
				endDate
				daysRequested
				reason
				status
				managerComments
				approvedAt
				approvedBy {
					id
					displayName
				}
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

// Query: Get single leave request by ID
export const GET_LEAVE_REQUEST = gql`
	query GetLeaveRequest($id: UUID!) {
		leaveRequest(id: $id) {
			id
			employee {
				id
				displayName
				email
				department {
					id
					name
				}
			}
			manager {
				id
				displayName
				email
			}
			leaveType
			startDate
			endDate
			daysRequested
			reason
			status
			managerComments
			approvedAt
			approvedBy {
				id
				displayName
			}
			createdAt
			updatedAt
		}
	}
`;

// Mutation: Approve leave request
export const APPROVE_LEAVE_REQUEST = gql`
	mutation ApproveLeaveRequest($input: ApproveLeaveRequestInput!) {
		approveLeaveRequest(input: $input) {
			leaveRequest {
				id
				status
				approvedAt
				managerComments
				approvedBy {
					id
					displayName
				}
			}
			clientMutationId
		}
	}
`;

// Mutation: Deny leave request
export const DENY_LEAVE_REQUEST = gql`
	mutation DenyLeaveRequest($input: DenyLeaveRequestInput!) {
		denyLeaveRequest(input: $input) {
			leaveRequest {
				id
				status
				deniedAt
				managerComments
			}
			clientMutationId
		}
	}
`;

// Mutation: Create leave request (employee self-service)
export const CREATE_LEAVE_REQUEST = gql`
	mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
		createLeaveRequest(input: $input) {
			leaveRequest {
				id
				employee {
					id
					displayName
				}
				leaveType
				startDate
				endDate
				daysRequested
				reason
				status
				createdAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Update leave request
export const UPDATE_LEAVE_REQUEST = gql`
	mutation UpdateLeaveRequest($input: UpdateLeaveRequestInput!) {
		updateLeaveRequest(input: $input) {
			leaveRequest {
				id
				leaveType
				startDate
				endDate
				daysRequested
				reason
				status
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Cancel leave request
export const CANCEL_LEAVE_REQUEST = gql`
	mutation CancelLeaveRequest($input: CancelLeaveRequestInput!) {
		cancelLeaveRequest(input: $input) {
			leaveRequest {
				id
				status
				updatedAt
			}
			clientMutationId
		}
	}
`;

// TypeScript interfaces for inputs
export interface ApproveLeaveRequestInput {
	clientMutationId?: string;
	leaveRequestId: string;
	managerComments?: string;
}

export interface DenyLeaveRequestInput {
	clientMutationId?: string;
	leaveRequestId: string;
	managerComments: string; // Required for denial
}

export interface CreateLeaveRequestInput {
	clientMutationId?: string;
	leaveRequest: {
		employeeId: string;
		managerId?: string;
		leaveType: LeaveType;
		startDate: string;
		endDate: string;
		daysRequested: number;
		reason?: string;
	};
}

export interface UpdateLeaveRequestInput {
	clientMutationId?: string;
	id: string;
	patch: {
		leaveType?: LeaveType;
		startDate?: string;
		endDate?: string;
		daysRequested?: number;
		reason?: string;
	};
}

export interface CancelLeaveRequestInput {
	clientMutationId?: string;
	leaveRequestId: string;
}

export interface LeaveRequestFilter {
	employeeId?: string;
	managerId?: string;
	leaveType?: LeaveType;
	status?: LeaveRequestStatus;
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
}

// Utility functions for leave management
export const leaveTypeOptions = [
	{ value: 'annual', label: 'Annual Leave' },
	{ value: 'sick', label: 'Sick Leave' },
	{ value: 'personal', label: 'Personal Leave' },
	{ value: 'maternity', label: 'Maternity Leave' },
	{ value: 'paternity', label: 'Paternity Leave' },
	{ value: 'emergency', label: 'Emergency Leave' },
	{ value: 'unpaid', label: 'Unpaid Leave' }
];

export const leaveStatusOptions = [
	{ value: 'pending', label: 'Pending', color: 'yellow' },
	{ value: 'approved', label: 'Approved', color: 'green' },
	{ value: 'rejected', label: 'Rejected', color: 'red' },
	{ value: 'cancelled', label: 'Cancelled', color: 'gray' }
];

// Helper function to calculate business days between dates
export function calculateBusinessDays(startDate: string, endDate: string): number {
	const start = new Date(startDate);
	const end = new Date(endDate);

	let businessDays = 0;
	const currentDate = new Date(start);

	while (currentDate <= end) {
		const dayOfWeek = currentDate.getDay();
		if (dayOfWeek !== 0 && dayOfWeek !== 6) {
			// Not Sunday (0) or Saturday (6)
			businessDays++;
		}
		currentDate.setDate(currentDate.getDate() + 1);
	}

	return businessDays;
}

// Helper function to format date range for display
export function formatDateRange(startDate: string, endDate: string): string {
	const start = new Date(startDate).toLocaleDateString();
	const end = new Date(endDate).toLocaleDateString();
	return `${start} - ${end}`;
}

// Helper function to get leave type display color
export function getLeaveTypeColor(leaveType: LeaveType): string {
	const colorMap: Record<LeaveType, string> = {
		annual: 'blue',
		sick: 'red',
		personal: 'purple',
		maternity: 'pink',
		paternity: 'cyan',
		emergency: 'orange',
		unpaid: 'gray'
	};
	return colorMap[leaveType] || 'gray';
}

/**
 * T032: Standardized Leave Management Operations with Error Handling
 */
import type { OperationStore } from '@urql/svelte';
import type { DataRequest, UserCredentials } from '$lib/models/data-request';

export class LeaveManagementOperations {
	private client: OperationStore;

	constructor(client: OperationStore) {
		this.client = client;
	}

	async getLeaveRequests(params: { filter?: any; userCredentials: UserCredentials }): Promise<any> {
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetLeaveRequests',
			variables: { filter: params.filter },
			userCredentials: params.userCredentials,
			timeoutMs: 5000,
			retryAttempts: 0,
			maxRetries: 3
		});

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Leave requests timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage: 'Leave requests are loading slowly. Please try again.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: GET_LEAVE_REQUESTS,
					variables: { filter: params.filter }
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						const errorResponse = createErrorResponse(result.error, {
							type: 'GRAPHQL_ERROR',
							userMessage: 'Unable to load leave requests. Please try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data) {
						resolve(result.data);
						unsubscribe();
					}
				}
			);
		});
	}

	async getPendingLeaveRequests(params: {
		filter?: any;
		pagination?: { page: number; limit: number };
		userCredentials: UserCredentials;
	}): Promise<any> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetPendingLeaveRequests',
			variables: {
				managerId: params.filter?.managerId,
				status: params.filter?.status || 'pending',
				first: params.pagination?.limit || 20,
				offset: ((params.pagination?.page || 1) - 1) * (params.pagination?.limit || 20),
				filter: params.filter
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000,
			retryAttempts: 0,
			maxRetries: 3
		});

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Pending leave requests timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage: 'Leave requests are loading slowly. Please try again.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: GET_PENDING_LEAVE_REQUESTS,
					variables: {
						managerId: params.filter?.managerId,
						status: params.filter?.status || 'pending',
						first: params.pagination?.limit || 20,
						offset: ((params.pagination?.page || 1) - 1) * (params.pagination?.limit || 20),
						filter: params.filter
					}
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						const errorResponse = createErrorResponse(result.error, {
							type: 'GRAPHQL_ERROR',
							userMessage: 'Unable to load pending leave requests. Please try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data) {
						resolve({
							requests: result.data.leaveRequests?.nodes || [],
							totalCount: result.data.leaveRequests?.totalCount || 0
						});
						unsubscribe();
					}
				}
			);
		});
	}

	async getLeaveStatistics(params: {
		managerId?: string;
		userCredentials: UserCredentials;
	}): Promise<any> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetLeaveStatistics',
			variables: { managerId: params.managerId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000,
			retryAttempts: 0,
			maxRetries: 3
		});

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Leave statistics timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage: 'Leave statistics are loading slowly. Please try again.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			// For now, we'll get all requests and calculate stats manually
			// In a real app, this would be a dedicated stats query
			const unsubscribe = this.client.subscribe(
				{
					query: GET_LEAVE_REQUESTS,
					variables: {
						filter: { managerId: params.managerId },
						first: 1000, // Get all for stats calculation
						offset: 0
					}
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						const errorResponse = createErrorResponse(result.error, {
							type: 'GRAPHQL_ERROR',
							userMessage: 'Unable to load leave statistics. Please try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data) {
						const requests = result.data.leaveRequests?.nodes || [];
						const stats = this.calculateLeaveStats(requests);
						resolve({ stats });
						unsubscribe();
					}
				}
			);
		});
	}

	private calculateLeaveStats(requests: any[]): any {
		const pendingCount = requests.filter((r) => r.status === 'pending').length;
		const approvedCount = requests.filter((r) => r.status === 'approved').length;
		const rejectedCount = requests.filter((r) => r.status === 'rejected').length;
		const totalDaysRequested = requests.reduce((sum, r) => sum + (r.daysRequested || 0), 0);
		const averageRequestDays = requests.length > 0 ? totalDaysRequested / requests.length : 0;
		const approvalRate =
			approvedCount + rejectedCount > 0
				? (approvedCount / (approvedCount + rejectedCount)) * 100
				: 0;

		return {
			pendingCount,
			approvedCount,
			rejectedCount,
			totalDaysRequested,
			averageRequestDays: Math.round(averageRequestDays * 10) / 10,
			approvalRate: Math.round(approvalRate * 10) / 10
		};
	}

	async approveLeaveRequest(params: {
		id: string;
		notes?: string;
		userCredentials: UserCredentials;
	}): Promise<any> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'ApproveLeaveRequest',
			variables: {
				input: {
					leaveRequestId: params.id,
					managerComments: params.notes
				}
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000,
			retryAttempts: 0,
			maxRetries: 2
		});

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Leave approval timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage:
						'Leave approval is taking longer than expected. Please verify the action completed.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: APPROVE_LEAVE_REQUEST,
					variables: {
						input: {
							leaveRequestId: params.id,
							managerComments: params.notes
						}
					}
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						const errorResponse = createErrorResponse(result.error, {
							type: 'PERMISSION_ERROR',
							userMessage:
								'Unable to approve leave request. Please check your permissions and try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data) {
						resolve(result.data);
						unsubscribe();
					}
				}
			);
		});
	}

	async denyLeaveRequest(params: {
		id: string;
		notes: string;
		userCredentials: UserCredentials;
	}): Promise<any> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'DenyLeaveRequest',
			variables: {
				input: {
					leaveRequestId: params.id,
					managerComments: params.notes
				}
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000,
			retryAttempts: 0,
			maxRetries: 2
		});

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Leave denial timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage:
						'Leave denial is taking longer than expected. Please verify the action completed.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: DENY_LEAVE_REQUEST,
					variables: {
						input: {
							leaveRequestId: params.id,
							managerComments: params.notes
						}
					}
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						const errorResponse = createErrorResponse(result.error, {
							type: 'PERMISSION_ERROR',
							userMessage:
								'Unable to deny leave request. Please check your permissions and try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data) {
						resolve(result.data);
						unsubscribe();
					}
				}
			);
		});
	}
}

export function createLeaveManagementOperations(client: OperationStore): LeaveManagementOperations {
	return new LeaveManagementOperations(client);
}
