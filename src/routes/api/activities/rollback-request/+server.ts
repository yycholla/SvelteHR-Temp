/**
 * Rollback Request API Endpoint
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 *
 * Handles submission of rollback requests by non-super_admin users.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUrqlClient } from '$lib/graphql/client';
import { gql } from '@urql/core';

const CREATE_ROLLBACK_REQUEST = gql`
	mutation CreateRollbackRequest($input: CreateRollbackRequestInput!) {
		createRollbackRequest(input: $input) {
			rollbackRequest {
				id
				logId
				requestedBy
				status
				reason
				createdAt
			}
		}
	}
`;

export const POST: RequestHandler = async ({ locals, cookies, request }) => {
	// RBAC: Only hr_admin and admin can submit rollback requests
	if (!locals.user) {
		throw error(401, { message: 'Unauthorized' });
	}

	const userRole = locals.user.role || 'employee';
	const allowedRoles = ['hr_admin', 'admin'];

	if (!allowedRoles.includes(userRole)) {
		throw error(403, {
			message: 'Access denied. Only HR admins and admins can submit rollback requests.'
		});
	}

	const token = cookies.get('hr_token') || cookies.get('auth-token');
	if (!token) {
		throw error(401, { message: 'No authentication token found' });
	}

	try {
		const body = await request.json();
		const { logId, reason } = body;

		if (!logId || !reason) {
			throw error(400, { message: 'Log ID and reason are required' });
		}

		if (reason.length < 10) {
			throw error(400, { message: 'Reason must be at least 10 characters' });
		}

		// Create rollback request via GraphQL
		const urqlClient = createUrqlClient(undefined, token);

		const result = await urqlClient
			.mutation(CREATE_ROLLBACK_REQUEST, {
				input: {
					logId,
					requestedBy: locals.user.id,
					reason: reason.trim(),
					status: 'pending'
				}
			})
			.toPromise();

		if (result.error) {
			console.error('[RollbackRequest] GraphQL error:', result.error);
			throw error(500, {
				message: result.error.message || 'Failed to create rollback request'
			});
		}

		if (!result.data?.createRollbackRequest?.rollbackRequest) {
			throw error(500, { message: 'Failed to create rollback request' });
		}

		const rollbackRequest = result.data.createRollbackRequest.rollbackRequest;

		return json({
			success: true,
			requestId: rollbackRequest.id,
			message: 'Rollback request submitted successfully'
		});
	} catch (err) {
		console.error('[RollbackRequest] Error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, {
			message: 'Failed to submit rollback request'
		});
	}
};
