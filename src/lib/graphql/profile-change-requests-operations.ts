/**
 * Profile Change Requests GraphQL Operations
 * Handles profile change request submission and approval workflow
 */

import { gql } from '@urql/svelte';

// Profile Change Request interface
export interface ProfileChangeRequest {
	id: string;
	userId: string;
	requestedFirstName?: string;
	requestedLastName?: string;
	requestedEmail?: string;
	requestedPhone?: string;
	requestedAddress?: string;
	requestedCity?: string;
	requestedState?: string;
	requestedZipCode?: string;
	requestedCountry?: string;
	requestedEmergencyContactFirstName?: string;
	requestedEmergencyContactLastName?: string;
	requestedEmergencyContactPhone?: string;
	requestedEmergencyContactEmail?: string;
	requestedEmergencyContactRelation?: string;
	requestReason?: string;
	requestStatus: 'pending' | 'approved' | 'rejected';
	requestedBy: string;
	requestedAt: string;
	reviewedBy?: string;
	reviewedAt?: string;
	reviewNotes?: string;
	createdAt: string;
	updatedAt: string;
}

// Extended interface for view with user details
export interface ProfileChangeRequestWithUser extends ProfileChangeRequest {
	userEmail: string;
	userDisplayName: string;
	reviewerName?: string;
}

// GraphQL Fragments
export const PROFILE_CHANGE_REQUEST_FRAGMENT = gql`
	fragment ProfileChangeRequestFields on ProfileChangeRequest {
		id
		userId
		requestedFirstName
		requestedLastName
		requestedEmail
		requestedPhone
		requestedAddress
		requestedCity
		requestedState
		requestedZipCode
		requestedCountry
		requestedEmergencyContactFirstName
		requestedEmergencyContactLastName
		requestedEmergencyContactPhone
		requestedEmergencyContactEmail
		requestedEmergencyContactRelation
		requestReason
		requestStatus
		requestedBy
		requestedAt
		reviewedBy
		reviewedAt
		reviewNotes
		createdAt
		updatedAt
	}
`;

export const PROFILE_CHANGE_REQUEST_WITH_USER_FRAGMENT = gql`
	fragment ProfileChangeRequestWithUserFields on PendingProfileChangeRequest {
		id
		userId
		requestedFirstName
		requestedLastName
		requestedEmail
		requestedPhone
		requestedAddress
		requestedCity
		requestedState
		requestedZipCode
		requestedCountry
		requestedEmergencyContactFirstName
		requestedEmergencyContactLastName
		requestedEmergencyContactPhone
		requestedEmergencyContactEmail
		requestedEmergencyContactRelation
		requestReason
		requestStatus
		requestedBy
		requestedAt
		reviewedBy
		reviewedAt
		reviewNotes
		userEmail
		userDisplayName
		reviewerName
		createdAt
		updatedAt
	}
`;

// Mutation to submit profile change request
export const SUBMIT_PROFILE_CHANGE_REQUEST_MUTATION = gql`
	mutation SubmitProfileChangeRequest(
		$userId: UUID!
		$firstName: String
		$lastName: String
		$email: String
		$phone: String
		$address: String
		$city: String
		$state: String
		$zipCode: String
		$country: String
		$emergencyContactFirstName: String
		$emergencyContactLastName: String
		$emergencyContactPhone: String
		$emergencyContactEmail: String
		$emergencyContactRelation: String
		$reason: String
	) {
		submitProfileChangeRequest(
			input: {
				targetUserId: $userId
				newFirstName: $firstName
				newLastName: $lastName
				newEmail: $email
				newPhone: $phone
				newAddress: $address
				newCity: $city
				newState: $state
				newZipCode: $zipCode
				newCountry: $country
				newEmergencyContactFirstName: $emergencyContactFirstName
				newEmergencyContactLastName: $emergencyContactLastName
				newEmergencyContactPhone: $emergencyContactPhone
				newEmergencyContactEmail: $emergencyContactEmail
				newEmergencyContactRelation: $emergencyContactRelation
				reason: $reason
			}
		) {
			profileChangeRequest {
				...ProfileChangeRequestFields
			}
		}
	}
	${PROFILE_CHANGE_REQUEST_FRAGMENT}
`;

// Mutation to review (approve/reject) profile change request
export const REVIEW_PROFILE_CHANGE_REQUEST_MUTATION = gql`
	mutation ReviewProfileChangeRequest($requestId: UUID!, $approve: Boolean!, $reviewNotes: String) {
		reviewProfileChangeRequest(
			input: { requestId: $requestId, approve: $approve, reviewNotesParam: $reviewNotes }
		) {
			profileChangeRequest {
				...ProfileChangeRequestFields
			}
		}
	}
	${PROFILE_CHANGE_REQUEST_FRAGMENT}
`;

// Query to get all pending profile change requests (HR/Admin view)
export const GET_PENDING_PROFILE_CHANGE_REQUESTS_QUERY = gql`
	query GetPendingProfileChangeRequests {
		allPendingProfileChangeRequests {
			nodes {
				...ProfileChangeRequestWithUserFields
			}
		}
	}
	${PROFILE_CHANGE_REQUEST_WITH_USER_FRAGMENT}
`;

// Query to get user's own profile change requests
export const GET_USER_PROFILE_CHANGE_REQUESTS_QUERY = gql`
	query GetUserProfileChangeRequests($userId: UUID!) {
		allProfileChangeRequests(condition: { userId: $userId }, orderBy: REQUESTED_AT_DESC) {
			nodes {
				...ProfileChangeRequestFields
			}
		}
	}
	${PROFILE_CHANGE_REQUEST_FRAGMENT}
`;

// Helper functions for working with profile change requests
export class ProfileChangeRequestService {
	/**
	 * Format request status for display
	 */
	static formatStatus(status: string): string {
		switch (status) {
			case 'pending':
				return 'Pending Review';
			case 'approved':
				return 'Approved';
			case 'rejected':
				return 'Rejected';
			default:
				return 'Unknown';
		}
	}

	/**
	 * Get status color for UI display
	 */
	static getStatusColor(status: string): string {
		switch (status) {
			case 'pending':
				return 'text-amber-600 bg-amber-50 border-amber-200';
			case 'approved':
				return 'text-green-600 bg-green-50 border-green-200';
			case 'rejected':
				return 'text-red-600 bg-red-50 border-red-200';
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}

	/**
	 * Get changes summary from request
	 */
	static getChangesSummary(request: ProfileChangeRequest): string[] {
		const changes: string[] = [];

		if (request.requestedFirstName) {
			changes.push(`First name: ${request.requestedFirstName}`);
		}
		if (request.requestedLastName) {
			changes.push(`Last name: ${request.requestedLastName}`);
		}
		if (request.requestedEmail) {
			changes.push(`Email: ${request.requestedEmail}`);
		}
		if (request.requestedPhone) {
			changes.push(`Phone: ${request.requestedPhone}`);
		}
		if (request.requestedAddress) {
			changes.push(`Address: ${request.requestedAddress}`);
		}
		if (request.requestedCity) {
			changes.push(`City: ${request.requestedCity}`);
		}
		if (request.requestedState) {
			changes.push(`State: ${request.requestedState}`);
		}
		if (request.requestedZipCode) {
			changes.push(`ZIP Code: ${request.requestedZipCode}`);
		}
		if (request.requestedCountry) {
			changes.push(`Country: ${request.requestedCountry}`);
		}
		if (request.requestedEmergencyContactFirstName || request.requestedEmergencyContactLastName) {
			const name = [
				request.requestedEmergencyContactFirstName,
				request.requestedEmergencyContactLastName
			]
				.filter(Boolean)
				.join(' ');
			changes.push(`Emergency Contact: ${name}`);
		}
		if (request.requestedEmergencyContactPhone) {
			changes.push(`Emergency Contact Phone: ${request.requestedEmergencyContactPhone}`);
		}
		if (request.requestedEmergencyContactEmail) {
			changes.push(`Emergency Contact Email: ${request.requestedEmergencyContactEmail}`);
		}
		if (request.requestedEmergencyContactRelation) {
			changes.push(`Emergency Contact Relationship: ${request.requestedEmergencyContactRelation}`);
		}

		return changes;
	}

	/**
	 * Format relative time for display
	 */
	static formatRelativeTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

		if (diffInMinutes < 1) return 'Just now';
		if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

		const diffInHours = Math.floor(diffInMinutes / 60);
		if (diffInHours < 24) return `${diffInHours} hours ago`;

		const diffInDays = Math.floor(diffInHours / 24);
		if (diffInDays < 7) return `${diffInDays} days ago`;

		return date.toLocaleDateString();
	}
}

// Export commonly used operations
export const submitProfileChangeRequest = SUBMIT_PROFILE_CHANGE_REQUEST_MUTATION;
export const reviewProfileChangeRequest = REVIEW_PROFILE_CHANGE_REQUEST_MUTATION;
export const getPendingProfileChangeRequests = GET_PENDING_PROFILE_CHANGE_REQUESTS_QUERY;
export const getUserProfileChangeRequests = GET_USER_PROFILE_CHANGE_REQUESTS_QUERY;
