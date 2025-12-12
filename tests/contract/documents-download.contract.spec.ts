// Contract test: Document download API (T013)
// Tests GET /api/documents/{id}/download endpoint

import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Contract Test: Document Download API
 *
 * This test validates the API contract for document downloads.
 * It ensures:
 * - Encrypted binary streams are returned
 * - RBAC enforcement for download access
 * - Proper HTTP headers for file downloads
 * - 404 responses for non-existent documents
 *
 * NOTE: These tests require a running MountainHR backend on port 8080
 * Skipped in CI - run locally with backend: npm run test:contract:local
 */

// API base URL for tests
const API_BASE_URL =
	process.env.API_BASE_URL || process.env.PUBLIC_API_URL || 'http://localhost:5173';

// Skip these tests in CI (no backend available)
const describeOrSkip = process.env.CI ? describe.skip : describe;

describeOrSkip('GET /api/documents/{id}/download - Contract Tests', () => {
	let userToken: string;
	let otherUserToken: string;
	let adminToken: string;

	let userDocumentId: string;
	let otherUserDocumentId: string;
	let nonExistentDocId: string;

	beforeAll(async () => {
		// TODO: Set up test data
		userToken = 'test-user-token';
		otherUserToken = 'test-other-user-token';
		adminToken = 'test-admin-token';

		userDocumentId = 'doc-user-123';
		otherUserDocumentId = 'doc-other-456';
		nonExistentDocId = 'doc-non-existent-999';
	});

	it('should download document with valid permissions (200 + binary stream)', async () => {
		// Act: Download own document
		const response = await fetch(`${API_BASE_URL}/api/documents/${userDocumentId}/download`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${userToken}`
			}
		});

		// Assert: Success with binary data
		expect(response.status).toBe(200);

		// Validate headers
		expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
		expect(response.headers.get('Content-Disposition')).toMatch(
			/^attachment; filename=".+\.encrypted"$/
		);
		expect(response.headers.get('Content-Length')).toBeTruthy();

		// Validate custom headers
		expect(response.headers.get('X-Document-ID')).toBe(userDocumentId);
		expect(response.headers.get('X-File-Type')).toBeTruthy();
		expect(response.headers.get('X-Original-Filename')).toBeTruthy();

		// Validate binary data
		const blob = await response.blob();
		expect(blob.size).toBeGreaterThan(0);
		expect(blob.type).toBe('application/octet-stream');
	});

	it('should deny download without permissions (403)', async () => {
		// Act: Attempt to download another user's document
		const response = await fetch(`${API_BASE_URL}/api/documents/${otherUserDocumentId}/download`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${userToken}`
			}
		});

		// Assert: Forbidden
		expect(response.status).toBe(403);

		const data = await response.json();
		expect(data).toHaveProperty('message');
		expect(data.message).toMatch(/access denied|permission|forbidden/i);
	});

	it('should return 404 for non-existent document', async () => {
		// Act: Attempt to download non-existent document
		const response = await fetch(`${API_BASE_URL}/api/documents/${nonExistentDocId}/download`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${userToken}`
			}
		});

		// Assert: Not found
		expect(response.status).toBe(404);

		const data = await response.json();
		expect(data).toHaveProperty('message');
		expect(data.message).toMatch(/not found/i);
	});

	it('should return 401 for unauthenticated requests', async () => {
		// Act: Download without auth token
		const response = await fetch(`${API_BASE_URL}/api/documents/${userDocumentId}/download`, {
			method: 'GET'
		});

		// Assert: Unauthorized
		expect(response.status).toBe(401);

		const data = await response.json();
		expect(data).toHaveProperty('message');
		expect(data.message).toMatch(/auth|unauthorized/i);
	});

	it('should allow admin to download any document', async () => {
		// Act: Admin downloads any user's document
		const response = await fetch(`${API_BASE_URL}/api/documents/${otherUserDocumentId}/download`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${adminToken}`
			}
		});

		// Assert: Success (admin has full access)
		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
	});

	it('should log download access in audit log', async () => {
		// Act: Download document
		const response = await fetch(`${API_BASE_URL}/api/documents/${userDocumentId}/download`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${userToken}`
			}
		});

		expect(response.status).toBe(200);

		// TODO: Verify audit log entry was created
		// This would query the document_access_logs table
		// and verify an entry exists with:
		// - document_id = userDocumentId
		// - access_type = 'download'
		// - access_outcome = 'success'
		// - ip_address captured
		// - user_agent captured
	});

	it('should log denied download attempts in audit log', async () => {
		// Act: Attempt unauthorized download
		const response = await fetch(`${API_BASE_URL}/api/documents/${otherUserDocumentId}/download`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${userToken}`
			}
		});

		expect(response.status).toBe(403);

		// TODO: Verify audit log entry with access_outcome = 'denied'
		// and denial_reason populated
	});

	it('should handle soft-deleted documents correctly', async () => {
		// TODO: Create soft-deleted document for testing
		const deletedDocId = 'doc-deleted-123';

		// Act: Non-admin attempts to download deleted document
		const response = await fetch(`${API_BASE_URL}/api/documents/${deletedDocId}/download`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${userToken}`
			}
		});

		// Assert: Should return 404 (soft-deleted docs hidden from non-admins)
		expect(response.status).toBe(404);
	});

	it('should allow admin to download soft-deleted documents', async () => {
		// TODO: Create soft-deleted document for testing
		const deletedDocId = 'doc-deleted-456';

		// Act: Admin downloads soft-deleted document
		const response = await fetch(`${API_BASE_URL}/api/documents/${deletedDocId}/download`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${adminToken}`
			}
		});

		// Assert: Admin can still access deleted documents
		expect(response.status).toBe(200);
	});

	it('should stream large files efficiently', async () => {
		// TODO: Create test document with 50MB size

		// Act: Download large document
		const startTime = Date.now();
		const response = await fetch(`${API_BASE_URL}/api/documents/${userDocumentId}/download`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${userToken}`
			}
		});

		expect(response.status).toBe(200);

		// Validate streaming (should start immediately, not wait for full download)
		const firstByteTime = Date.now() - startTime;
		expect(firstByteTime).toBeLessThan(5000); // First byte within 5 seconds

		// Consume the stream
		const blob = await response.blob();
		expect(blob.size).toBeGreaterThan(0);
	});
});
