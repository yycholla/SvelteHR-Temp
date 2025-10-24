// Access logging and audit service (Feature 024)
// Comprehensive audit trail for compliance and security

import type { AccessType, AccessOutcome, AccessMetadata } from '$lib/types/document';

export interface AccessLogEntry {
	documentId: string;
	userId: string;
	accessType: AccessType;
	accessOutcome: AccessOutcome;
	ipAddress?: string;
	userAgent?: string;
	denialReason?: string;
}

// Log document access attempt
export async function logAccess(
	documentId: string,
	userId: string,
	accessType: AccessType,
	outcome: AccessOutcome,
	metadata?: AccessMetadata & { denialReason?: string },
	fetchFn: typeof fetch = fetch
): Promise<void> {
	const logEntry: AccessLogEntry = {
		documentId,
		userId,
		accessType,
		accessOutcome: outcome,
		ipAddress: metadata?.ipAddress,
		userAgent: metadata?.userAgent,
		denialReason: metadata?.denialReason
	};

	try {
		const response = await fetchFn('/api/audit/log', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(logEntry)
		});

		if (!response.ok) {
			console.error('Failed to log access attempt:', await response.text());
		}
	} catch (error) {
		console.error('Failed to log access attempt:', error);
	}
}

// Log successful access
export async function logSuccessfulAccess(
	documentId: string,
	userId: string,
	accessType: AccessType,
	metadata?: AccessMetadata,
	fetchFn: typeof fetch = fetch
): Promise<void> {
	return logAccess(documentId, userId, accessType, 'success', metadata, fetchFn);
}

// Log denied access
export async function logDeniedAccess(
	documentId: string,
	userId: string,
	accessType: AccessType,
	denialReason: string,
	metadata?: AccessMetadata,
	fetchFn: typeof fetch = fetch
): Promise<void> {
	return logAccess(documentId, userId, accessType, 'denied', {
		...metadata,
		denialReason
	}, fetchFn);
}

// Get access logs for a document
export async function getDocumentAccessLogs(
	documentId: string,
	page: number = 1,
	limit: number = 50,
	fetchFn: typeof fetch = fetch
): Promise<{
	logs: AccessLogEntry[];
	totalCount: number;
	page: number;
	limit: number;
}> {
	const response = await fetchFn(
		`/api/audit/logs/${documentId}?page=${page}&limit=${limit}`,
		{
			method: 'GET'
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to retrieve access logs');
	}

	return await response.json();
}

// Get access logs for a user
export async function getUserAccessLogs(
	userId: string,
	page: number = 1,
	limit: number = 50,
	fetchFn: typeof fetch = fetch
): Promise<{
	logs: AccessLogEntry[];
	totalCount: number;
	page: number;
	limit: number;
}> {
	const response = await fetchFn(
		`/api/audit/user/${userId}?page=${page}&limit=${limit}`,
		{
			method: 'GET'
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to retrieve user access logs');
	}

	return await response.json();
}

// Get audit trail summary
export async function getAuditSummary(
	startDate?: Date,
	endDate?: Date,
	fetchFn: typeof fetch = fetch
): Promise<{
	totalAccesses: number;
	successfulAccesses: number;
	deniedAccesses: number;
	uniqueUsers: number;
	uniqueDocuments: number;
	accessesByType: Record<AccessType, number>;
}> {
	const params = new URLSearchParams();
	if (startDate) params.set('startDate', startDate.toISOString());
	if (endDate) params.set('endDate', endDate.toISOString());

	const response = await fetchFn(`/api/audit/summary?${params.toString()}`, {
		method: 'GET'
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to retrieve audit summary');
	}

	return await response.json();
}

// Export audit logs to CSV
export async function exportAuditLogs(
	filters?: {
		documentId?: string;
		userId?: string;
		accessType?: AccessType;
		accessOutcome?: AccessOutcome;
		startDate?: Date;
		endDate?: Date;
	},
	fetchFn: typeof fetch = fetch
): Promise<Blob> {
	const params = new URLSearchParams();
	if (filters?.documentId) params.set('documentId', filters.documentId);
	if (filters?.userId) params.set('userId', filters.userId);
	if (filters?.accessType) params.set('accessType', filters.accessType);
	if (filters?.accessOutcome) params.set('accessOutcome', filters.accessOutcome);
	if (filters?.startDate) params.set('startDate', filters.startDate.toISOString());
	if (filters?.endDate) params.set('endDate', filters.endDate.toISOString());

	const response = await fetchFn(`/api/audit/export?${params.toString()}`, {
		method: 'GET'
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to export audit logs');
	}

	return await response.blob();
}

// Check for suspicious access patterns
export async function checkSuspiciousActivity(
	userId: string,
	documentId?: string,
	fetchFn: typeof fetch = fetch
): Promise<{
	isSuspicious: boolean;
	reasons: string[];
	severity: 'low' | 'medium' | 'high';
}> {
	const params = new URLSearchParams({ userId });
	if (documentId) params.set('documentId', documentId);

	const response = await fetchFn(`/api/audit/suspicious?${params.toString()}`, {
		method: 'GET'
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to check for suspicious activity');
	}

	return await response.json();
}

// Get client IP address (for logging)
export function getClientIP(): string | undefined {
	// In browser, this would need to come from server
	// This is a placeholder - actual implementation would be server-side
	return undefined;
}

// Get client user agent
export function getUserAgent(): string {
	if (typeof navigator !== 'undefined') {
		return navigator.userAgent;
	}
	return 'Unknown';
}

// Create access metadata object
export function createAccessMetadata(): AccessMetadata {
	return {
		ipAddress: getClientIP(),
		userAgent: getUserAgent()
	};
}
