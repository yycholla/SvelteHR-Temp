import { logger } from '$lib/utils/logger';
// Employee document assignment endpoint (Feature 024)
// POST /api/employees/[id]/assign-documents - Assign documents to an employee
// ✅ Migrated to GraphQL backend (Phase 3 - Document API Migration)

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUrqlClient } from '$lib/graphql/client';
import { gql } from '@urql/core';
import { createEmployeeService } from '$lib/server/services';

const CREATE_DOCUMENT_ASSIGNMENT_MUTATION = gql`
	mutation CreateDocumentAssignment($input: CreateDocumentAssignmentInput!) {
		createDocumentAssignment(input: $input) {
			id
			documentId
			employeeId
			assignedBy
			assignedAt
		}
	}
`;

export const POST: RequestHandler = async (event) => {
	const { params, locals, request, cookies, fetch } = event;

	// Step 1: Validate authentication
	if (!locals.user) {
		error(401, { message: 'Authentication required' });
	}

	const employeeId = params.id;
	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';

	// Step 2: Check if user has assign permissions (admin only)
	if (userRole !== 'super_admin' && userRole !== 'admin') {
		error(403, {
			message: 'Insufficient permissions. Only administrators can assign documents to employees.'
		});
	}

	try {
		// Step 3: Parse request body
		const body = await request.json();
		const { documentIds } = body;

		if (!Array.isArray(documentIds) || documentIds.length === 0) {
			error(400, { message: 'Invalid request: documentIds must be a non-empty array' });
		}

		logger.info(
			`[ASSIGN DOCS] User ${userId} assigning ${documentIds.length} documents to employee ${employeeId}`
		);

		// Step 4: Verify employee exists using EmployeeService
		const employeeService = createEmployeeService(event);
		const employeeResult = await employeeService.getEmployeeById(employeeId);

		if (employeeResult.isError) {
			if (employeeResult.error.code === 'EMPLOYEE_NOT_FOUND') {
				error(404, { message: 'Employee not found' });
			}
			error(500, { message: employeeResult.error.message });
		}

		const employee = employeeResult.value;

		// Step 5: Create GraphQL client for document assignments
		const urqlClient = createUrqlClient(fetch, undefined, undefined, cookies.get('hr_session'));

		// Step 6: Perform bulk assignment via GraphQL
		let assignedCount = 0;
		let skippedCount = 0;
		const errors: string[] = [];

		for (const documentId of documentIds) {
			try {
				const assignmentResult = await urqlClient
					.mutation(CREATE_DOCUMENT_ASSIGNMENT_MUTATION, {
						input: {
							documentId,
							employeeId,
							assignedBy: userId
						}
					})
					.toPromise();

				if (assignmentResult.error) {
					// Check if error is due to duplicate assignment
					const errorMsg = assignmentResult.error.message || '';
					if (errorMsg.includes('duplicate') || errorMsg.includes('already assigned')) {
						skippedCount++;
						logger.info(
							`[ASSIGN DOCS] Document ${documentId} already assigned to employee ${employeeId}`
						);
					} else {
						errors.push(`Document ${documentId}: ${errorMsg}`);
						logger.error(
							`[ASSIGN DOCS] Error assigning document ${documentId}:`,
							assignmentResult.error
						);
					}
				} else {
					assignedCount++;
					logger.info(`[ASSIGN DOCS] Document ${documentId} assigned to employee ${employeeId}`);
				}
			} catch (err) {
				errors.push(
					`Document ${documentId}: ${err instanceof Error ? err.message : 'Unknown error'}`
				);
				logger.error(`[ASSIGN DOCS] Exception assigning document ${documentId}:`, err as Error);
			}
		}

		// Step 7: Return results
		if (errors.length > 0 && assignedCount === 0) {
			error(400, {
				message: `Failed to assign any documents. Errors: ${errors.join('; ')}`
			});
		}

		const message =
			errors.length > 0
				? `Assigned ${assignedCount} document(s), skipped ${skippedCount}, ${errors.length} errors`
				: `Successfully assigned ${assignedCount} document(s) to ${employee.email.value}`;

		logger.info(
			`[ASSIGN DOCS] Completed: ${assignedCount} assigned, ${skippedCount} skipped, ${errors.length} errors`
		);

		return json({
			success: true,
			message,
			assignedCount,
			skippedCount,
			errorCount: errors.length,
			errors: errors.length > 0 ? errors : undefined
		});
	} catch (err) {
		logger.error('[ASSIGN DOCS] Error:', err as Error);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Generic error fallback
		error(500, {
			message: 'Failed to assign documents. Please try again later.'
		});
	}
};
