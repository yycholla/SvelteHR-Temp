import { gql } from '@urql/svelte';

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
