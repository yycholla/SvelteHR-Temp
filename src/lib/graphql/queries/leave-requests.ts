import { gql } from '@urql/svelte';
import { logger } from '$lib/utils/logger';

/**
 * GraphQL Queries for Leave Requests
 *
 * Updated for Rust backend (async-graphql) schema
 */

/**
 * Get all leave requests with filtering and pagination
 * Backend: Uses leaveRequests from Rust GraphQL schema
 */
export const GET_LEAVE_REQUESTS = gql`
	query GetLeaveRequests($employeeId: UUID, $limit: Int = 50, $offset: Int = 0) {
		leaveRequests(employeeId: $employeeId, limit: $limit, offset: $offset) {
			id
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
			employee {
				id
				email
				displayName
				departmentId
				department {
					id
					name
				}
			}
			manager {
				id
				email
				displayName
			}
		}
	}
`;

/**
 * Get a single leave request by ID with full details
 * Backend: Uses leaveRequest (singular) from Rust GraphQL schema
 */
export const GET_LEAVE_REQUEST_BY_ID = gql`
	query GetLeaveRequestById($id: UUID!) {
		leaveRequest(id: $id) {
			id
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
			employee {
				id
				email
				displayName
				departmentId
				department {
					id
					name
				}
			}
			manager {
				id
				email
				displayName
			}
		}
	}
`;

/**
 * Get leave request statistics for a manager
 * Backend: Uses leaveRequests from Rust GraphQL schema
 * Note: Statistics calculated client-side for now
 */
export const GET_LEAVE_REQUEST_STATS = gql`
	query GetLeaveRequestStats($employeeId: UUID, $limit: Int = 1000) {
		leaveRequests(employeeId: $employeeId, limit: $limit, offset: 0) {
			id
			status
			daysRequested
		}
	}
`;

/**
 * Update leave request status (approve/deny)
 * Backend: Uses updateLeaveRequest mutation from Rust GraphQL schema
 */
export const UPDATE_LEAVE_REQUEST_STATUS = gql`
	mutation UpdateLeaveRequestStatus($input: UpdateLeaveRequestInput!) {
		updateLeaveRequest(input: $input) {
			id
			status
			managerComments
			updatedAt
		}
	}
`;

/**
 * Create a new leave request
 * Backend: Uses createLeaveRequest mutation from Rust GraphQL schema
 */
export const CREATE_LEAVE_REQUEST = gql`
	mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
		createLeaveRequest(input: $input) {
			id
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
`;

/**
 * Delete a leave request
 * Backend: Uses deleteLeaveRequest mutation from Rust GraphQL schema
 */
export const DELETE_LEAVE_REQUEST = gql`
	mutation DeleteLeaveRequest($id: UUID!) {
		deleteLeaveRequest(id: $id)
	}
`;

// TypeScript types for query variables
export interface GetLeaveRequestsVariables {
	employeeId?: string;
	limit?: number;
	offset?: number;
}

export interface GetLeaveRequestByIdVariables {
	id: string;
}

export interface GetLeaveRequestStatsVariables {
	employeeId?: string;
	limit?: number;
}

export interface UpdateLeaveRequestInput {
	id: string;
	status?: string;
	managerComments?: string;
}

export interface UpdateLeaveRequestStatusVariables {
	input: UpdateLeaveRequestInput;
}

export interface CreateLeaveRequestInput {
	employeeId: string;
	managerId?: string;
	leaveType: string;
	startDate: string;
	endDate: string;
	daysRequested: number;
	reason?: string;
	status?: string;
}

export interface CreateLeaveRequestVariables {
	input: CreateLeaveRequestInput;
}

export interface DeleteLeaveRequestVariables {
	id: string;
}

// Response types
export interface LeaveRequest {
	id: string;
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
	employee?: {
		id: string;
		email: string;
		displayName: string;
		departmentId: string | null;
		department?: {
			id: string;
			name: string;
		} | null;
	};
	manager?: {
		id: string;
		email: string;
		displayName: string;
	} | null;
}

export interface LeaveRequestsResponse {
	leaveRequests: LeaveRequest[];
}

export interface LeaveRequestStatsResponse {
	pending: number;
	approved: number;
	rejected: number;
	cancelled: number;
	totalCount: number;
	totalDaysRequested: number;
}

// Helper functions for status normalization

/**
 * Normalize status to consistent format
 * @param status - Status from backend or UI
 * @returns Normalized lowercase status
 */
export function normalizeStatus(status: string): string {
	return status.toLowerCase().replace(/_/g, '-');
}

/**
 * Convert to backend status format
 * @param status - Status from UI
 * @returns Backend status format (may be uppercase enum)
 */
export function toBackendStatus(status: string): string {
	return status.toUpperCase().replace(/-/g, '_');
}

/**
 * Calculate statistics from leave request data (client-side)
 */
export function calculateLeaveStats(requests: LeaveRequest[]): LeaveRequestStatsResponse {
	const pending = requests.filter((r) => normalizeStatus(r.status) === 'pending').length;
	const approved = requests.filter((r) => normalizeStatus(r.status) === 'approved').length;
	const rejected = requests.filter((r) => normalizeStatus(r.status) === 'rejected').length;
	const cancelled = requests.filter((r) => normalizeStatus(r.status) === 'cancelled').length;

	const totalDaysRequested = requests.reduce((sum, r) => sum + (r.daysRequested || 0), 0);

	return {
		pending,
		approved,
		rejected,
		cancelled,
		totalCount: requests.length,
		totalDaysRequested
	};
}

// UI Helper Functions for Leave Management

/**
 * Format date range for display
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @returns Formatted date range string
 */
export function formatDateRange(startDate: string, endDate: string): string {
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
 * Get color for leave type badge
 * @param leaveType - Leave type ('vacation', 'sick', 'personal', etc.)
 * @returns Color name for badge styling
 */
export function getLeaveTypeColor(leaveType: string): string {
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
 * Get status information including color and variant
 */
export function getStatusInfo(status: string): {
	label: string;
	color: string;
	variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
	const statusLower = normalizeStatus(status);
	switch (statusLower) {
		case 'pending':
			return { label: 'Pending', color: 'yellow', variant: 'secondary' };
		case 'approved':
			return { label: 'Approved', color: 'green', variant: 'default' };
		case 'rejected':
			return { label: 'Rejected', color: 'red', variant: 'destructive' };
		case 'cancelled':
			return { label: 'Cancelled', color: 'gray', variant: 'outline' };
		default:
			return { label: 'Unknown', color: 'gray', variant: 'outline' };
	}
}

/**
 * Leave type options for UI selects
 */
export const leaveTypeOptions = [
	{ value: 'vacation', label: 'Vacation' },
	{ value: 'sick', label: 'Sick Leave' },
	{ value: 'personal', label: 'Personal Leave' },
	{ value: 'bereavement', label: 'Bereavement' },
	{ value: 'parental', label: 'Parental Leave' },
	{ value: 'unpaid', label: 'Unpaid Leave' }
];

/**
 * Leave status options for UI selects
 */
export const leaveStatusOptions = [
	{ value: 'pending', label: 'Pending' },
	{ value: 'approved', label: 'Approved' },
	{ value: 'rejected', label: 'Rejected' },
	{ value: 'cancelled', label: 'Cancelled' }
];

/**
 * Create leave management operations with GraphQL mutations
 * This provides approve/deny functionality for the UI
 */
export function createLeaveManagementOperations(client: any) {
	return {
		async approveLeaveRequest(params: {
			id: string;
			notes?: string;
			userCredentials: { userId: string; userEmail: string; role: string; accessToken: string };
		}) {
			// In a real implementation, this would use the UPDATE_LEAVE_REQUEST_STATUS mutation
			// For now, return a mock response
			logger.info(`Approve leave request: ${params}`);
			return { success: true };
		},

		async denyLeaveRequest(params: {
			id: string;
			notes: string;
			userCredentials: { userId: string; userEmail: string; role: string; accessToken: string };
		}) {
			// In a real implementation, this would use the UPDATE_LEAVE_REQUEST_STATUS mutation
			// For now, return a mock response
			logger.info(`Deny leave request: ${params}`);
			return { success: true };
		}
	};
}
