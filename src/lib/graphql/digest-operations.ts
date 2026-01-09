import { gql } from '@urql/svelte';

// Email Digest fragment
export const EMAIL_DIGEST_FRAGMENT = gql`
	fragment EmailDigestFields on EmailDigest {
		id
		name
		scheduleCron
		recipients
		includeSyncSummary
		includeConflicts
		includeHealthMetrics
		includeNewEmployees
		enabled
		lastSentAt
		nextSendAt
		createdBy
		createdAt
		updatedAt
	}
`;

// Email Digest Log fragment
export const EMAIL_DIGEST_LOG_FRAGMENT = gql`
	fragment EmailDigestLogFields on EmailDigestLog {
		id
		digestId
		sentAt
		recipients
		success
		errorMessage
		periodStart
		periodEnd
		contentSummary
	}
`;

// Query: Get all email digests
export const EMAIL_DIGESTS_QUERY = gql`
	${EMAIL_DIGEST_FRAGMENT}
	query EmailDigests {
		emailDigests {
			...EmailDigestFields
		}
	}
`;

// Query: Get single email digest
export const EMAIL_DIGEST_QUERY = gql`
	${EMAIL_DIGEST_FRAGMENT}
	query EmailDigest($digestId: String!) {
		emailDigest(digestId: $digestId) {
			...EmailDigestFields
		}
	}
`;

// Query: Get digest logs
export const EMAIL_DIGEST_LOGS_QUERY = gql`
	${EMAIL_DIGEST_LOG_FRAGMENT}
	query EmailDigestLogs($digestId: String!, $limit: Int) {
		emailDigestLogs(digestId: $digestId, limit: $limit) {
			...EmailDigestLogFields
		}
	}
`;

// Mutation: Create email digest
export const CREATE_EMAIL_DIGEST_MUTATION = gql`
	mutation CreateEmailDigest($input: CreateEmailDigestInput!) {
		createEmailDigest(input: $input) {
			digestId
			success
		}
	}
`;

// Mutation: Update email digest
export const UPDATE_EMAIL_DIGEST_MUTATION = gql`
	mutation UpdateEmailDigest($digestId: String!, $input: UpdateEmailDigestInput!) {
		updateEmailDigest(digestId: $digestId, input: $input) {
			success
		}
	}
`;

// Mutation: Delete email digest
export const DELETE_EMAIL_DIGEST_MUTATION = gql`
	mutation DeleteEmailDigest($digestId: String!) {
		deleteEmailDigest(digestId: $digestId) {
			success
		}
	}
`;

// Mutation: Send email digest manually
export const SEND_EMAIL_DIGEST_MUTATION = gql`
	mutation SendEmailDigest($digestId: String!, $input: SendDigestInput) {
		sendEmailDigest(digestId: $digestId, input: $input) {
			logId
			recipientsCount
			success
			errorMessage
		}
	}
`;

// TypeScript types
export interface EmailDigest {
	id: string;
	name: string;
	scheduleCron: string;
	recipients: string[];
	includeSyncSummary: boolean;
	includeConflicts: boolean;
	includeHealthMetrics: boolean;
	includeNewEmployees: boolean;
	enabled: boolean;
	lastSentAt: string | null;
	nextSendAt: string | null;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
}

export interface EmailDigestLog {
	id: string;
	digestId: string;
	sentAt: string;
	recipients: string[];
	success: boolean;
	errorMessage: string | null;
	periodStart: string | null;
	periodEnd: string | null;
	contentSummary: {
		totalSyncs: number;
		successfulSyncs: number;
		failedSyncs: number;
		conflictsDetected: number;
		conflictsResolved: number;
		newEmployees: number;
		updatedEmployees: number;
		dataQualityScore: number;
	} | null;
}

export interface CreateEmailDigestInput {
	name: string;
	scheduleCron: string;
	recipients: string[];
	includeSyncSummary?: boolean;
	includeConflicts?: boolean;
	includeHealthMetrics?: boolean;
	includeNewEmployees?: boolean;
	enabled?: boolean;
}

export interface UpdateEmailDigestInput {
	name?: string;
	scheduleCron?: string;
	recipients?: string[];
	includeSyncSummary?: boolean;
	includeConflicts?: boolean;
	includeHealthMetrics?: boolean;
	includeNewEmployees?: boolean;
	enabled?: boolean;
}

export interface SendDigestInput {
	periodDays?: number;
}
