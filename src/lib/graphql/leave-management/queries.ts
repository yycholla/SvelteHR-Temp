import { gql } from '@urql/svelte';

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
